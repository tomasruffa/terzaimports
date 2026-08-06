const { meliFetch } = require('./meli')
const {
  upsertAccount,
  upsertItem,
  upsertOrder,
  upsertQuestion,
  upsertPayment,
  upsertMetricsDaily,
  startSyncRun,
  finishSyncRun,
  getMetricsSummary,
} = require('./meli-repository')
const { syncItemFromMeli, reconcileStockFromMeliItems } = require('./meli-sync')
const { backfillMeliSales } = require('./sales')
const { consolidateDuplicateProducts } = require('./product-consolidation')

const ITEM_STATUSES = ['active', 'paused', 'closed']
const ORDERS_LOOKBACK_DAYS = 90

function formatDate(date) {
  return date.toISOString().slice(0, 10)
}

function daysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

async function fetchAllItemIds(meliUserId) {
  const ids = new Set()

  for (const status of ITEM_STATUSES) {
    let offset = 0
    const limit = 50

    while (true) {
      const search = await meliFetch(
        `/users/${meliUserId}/items/search?status=${status}&limit=${limit}&offset=${offset}`,
        {},
        meliUserId
      )
      const batch = search.results || []
      batch.forEach((id) => ids.add(id))
      if (batch.length < limit) break
      offset += limit
      if (search.paging?.total != null && offset >= search.paging.total) break
    }
  }

  return [...ids]
}

async function fetchItemVisits(itemIds, meliUserId) {
  const visitsMap = new Map()
  if (!itemIds.length) return visitsMap

  const dateTo = formatDate(new Date())
  const dateFrom = formatDate(daysAgo(30))

  for (let i = 0; i < itemIds.length; i += 20) {
    const chunk = itemIds.slice(i, i + 20)
    const idsParam = chunk.join(',')

    try {
      const last30 = await meliFetch(
        `/items/visits?ids=${idsParam}&date_from=${dateFrom}T00:00:00.000-00:00&date_to=${dateTo}T23:59:59.999-00:00`,
        {},
        meliUserId
      )
      for (const row of last30 || []) {
        const current = visitsMap.get(row.item_id) || { total: 0, last30d: 0 }
        current.last30d = Number(row.total_visits) || 0
        visitsMap.set(row.item_id, current)
      }
    } catch (err) {
      console.warn('[meli] visits 30d chunk failed', err.message)
    }

    try {
      const total = await meliFetch(`/visits/items?ids=${idsParam}`, {}, meliUserId)
      for (const row of total || []) {
        const current = visitsMap.get(row.item_id) || { total: 0, last30d: 0 }
        current.total = Number(row.visits ?? row.total_visits) || 0
        visitsMap.set(row.item_id, current)
      }
    } catch (err) {
      console.warn('[meli] visits total chunk failed', err.message)
    }
  }

  return visitsMap
}

async function syncItems(meliUserId) {
  const itemIds = await fetchAllItemIds(meliUserId)
  const visitsMap = await fetchItemVisits(itemIds, meliUserId)
  let synced = 0
  const errors = []

  for (const itemId of itemIds) {
    try {
      const item = await meliFetch(`/items/${itemId}`, {}, meliUserId)
      const visits = visitsMap.get(itemId) || { total: 0, last30d: 0 }
      await upsertItem(item, meliUserId, visits)
      const productResult = await syncItemFromMeli(itemId, meliUserId)
      if (productResult?.skipped) {
        errors.push({ itemId, skipped: true, reason: productResult.reason })
      } else {
        synced += 1
      }
    } catch (err) {
      errors.push({ itemId, error: err.message })
    }
  }

  return { total: itemIds.length, synced, errors }
}

async function syncOrders(meliUserId) {
  const fromDate = daysAgo(ORDERS_LOOKBACK_DAYS).toISOString()
  let offset = 0
  const limit = 50
  let synced = 0
  const errors = []

  while (true) {
    const search = await meliFetch(
      `/orders/search?seller=${meliUserId}&sort=date_desc&limit=${limit}&offset=${offset}&order.date_created.from=${encodeURIComponent(fromDate)}`,
      {},
      meliUserId
    )

    const results = search.results || []
    if (!results.length) break

    for (const summary of results) {
      try {
        const order = summary.order_items
          ? summary
          : await meliFetch(`/orders/${summary.id}`, {}, meliUserId)
        await upsertOrder(order, meliUserId)

        for (const payment of order.payments || []) {
          if (payment.id) {
            await upsertPayment(payment, meliUserId)
          }
        }

        synced += 1
      } catch (err) {
        errors.push({ orderId: summary.id, error: err.message })
      }
    }

    offset += limit
    if (search.paging?.total != null && offset >= search.paging.total) break
    if (results.length < limit) break
  }

  return { synced, errors }
}

async function syncQuestions(meliUserId) {
  const statuses = ['UNANSWERED', 'ANSWERED']
  let synced = 0
  const errors = []

  for (const status of statuses) {
    let offset = 0
    const limit = 50

    while (true) {
      const search = await meliFetch(
        `/questions/search?seller_id=${meliUserId}&status=${status}&api_version=4&limit=${limit}&offset=${offset}`,
        {},
        meliUserId
      )

      const results = search.questions || []
      if (!results.length) break

      for (const question of results) {
        try {
          const full = question.text
            ? question
            : await meliFetch(`/questions/${question.id}`, {}, meliUserId)
          await upsertQuestion(full, meliUserId)
          synced += 1
        } catch (err) {
          errors.push({ questionId: question.id, error: err.message })
        }
      }

      offset += limit
      if (search.total != null && offset >= search.total) break
      if (results.length < limit) break
    }
  }

  return { synced, errors }
}

async function syncMetricsSnapshot(meliUserId) {
  const today = formatDate(new Date())
  let visitsTotal = 0

  try {
    const dateFrom = daysAgo(30).toISOString()
    const dateTo = new Date().toISOString()
    const userVisits = await meliFetch(
      `/users/${meliUserId}/items_visits?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`,
      {},
      meliUserId
    )
    visitsTotal = Number(userVisits.total_visits) || 0
  } catch (err) {
    console.warn('[meli] user visits metric failed', err.message)
  }

  const summary = await getMetricsSummary(meliUserId)
  const metrics = {
    visits_total: visitsTotal || summary.items?.visits_last_30d || 0,
    orders_count: summary.orders?.total || 0,
    orders_paid_count: summary.orders?.paid || 0,
    gross_sales: summary.orders?.gross_sales || 0,
    active_items: summary.items?.active || 0,
    paused_items: summary.items?.paused || 0,
    unanswered_questions: summary.questions?.unanswered || 0,
    raw: {
      items: summary.items,
      orders: summary.orders,
      questions: summary.questions,
    },
  }

  await upsertMetricsDaily(meliUserId, today, metrics)
  return metrics
}

async function runFullSync(meliUserId) {
  const me = await meliFetch('/users/me', {}, meliUserId)
  const userId = meliUserId || me.id
  const run = await startSyncRun(userId, 'full')

  try {
    await upsertAccount(me)

    const [items, orders, questions] = await Promise.all([
      syncItems(userId),
      syncOrders(userId),
      syncQuestions(userId),
    ])

    const metrics = await syncMetricsSnapshot(userId)
    const { results: consolidation, cleanup } = await consolidateDuplicateProducts()
    const stockReconcile = await reconcileStockFromMeliItems()
    const salesBackfill = await backfillMeliSales(userId)

    const summary = {
      account: { meli_user_id: userId, nickname: me.nickname },
      items,
      orders,
      questions,
      metrics,
      consolidation: {
        merged: consolidation.filter((r) => r.merged).length,
        groups: consolidation.length,
        orphans_deactivated: cleanup.deactivated,
      },
      stock_reconcile: stockReconcile,
      sales_backfill: salesBackfill,
    }

    await finishSyncRun(run.id, 'success', summary)
    return { ok: true, run_id: run.id, ...summary }
  } catch (err) {
    await finishSyncRun(run.id, 'error', null, err.message)
    throw err
  }
}

async function syncOrderById(orderId, meliUserId, { deductStock = true } = {}) {
  const order = await meliFetch(`/orders/${orderId}`, {}, meliUserId)
  await upsertOrder(order, meliUserId, { deductStock })
  for (const payment of order.payments || []) {
    if (payment.id) await upsertPayment(payment, meliUserId)
  }
  return order
}

async function syncQuestionById(questionId, meliUserId) {
  const question = await meliFetch(`/questions/${questionId}`, {}, meliUserId)
  await upsertQuestion(question, meliUserId)
  return question
}

module.exports = {
  runFullSync,
  syncMetricsSnapshot,
  getMetricsSummary,
  syncOrders,
  syncOrderById,
  syncQuestionById,
}
