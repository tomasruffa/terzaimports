const { query } = require('./db')
const { upsertSaleFromMeliOrder } = require('./sales')
const { normalizeSku } = require('./product-consolidation')
const { extractSellerSkuFromMeliItem, getMeliItemImageUrl } = require('./meli-sync')

function toJson(value) {
  return value ? JSON.stringify(value) : null
}

async function upsertAccount(user) {
  const rep = user.seller_reputation || {}
  const tx = rep.transactions || {}
  const ratings = tx.ratings || {}

  await query(
    `INSERT INTO meli_accounts (
       meli_user_id, nickname, email, site_id, permalink,
       reputation_level, power_seller_status,
       transactions_total, transactions_completed, transactions_canceled,
       ratings_positive, ratings_negative, ratings_neutral, raw, synced_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
     ON CONFLICT (meli_user_id) DO UPDATE SET
       nickname = EXCLUDED.nickname,
       email = EXCLUDED.email,
       site_id = EXCLUDED.site_id,
       permalink = EXCLUDED.permalink,
       reputation_level = EXCLUDED.reputation_level,
       power_seller_status = EXCLUDED.power_seller_status,
       transactions_total = EXCLUDED.transactions_total,
       transactions_completed = EXCLUDED.transactions_completed,
       transactions_canceled = EXCLUDED.transactions_canceled,
       ratings_positive = EXCLUDED.ratings_positive,
       ratings_negative = EXCLUDED.ratings_negative,
       ratings_neutral = EXCLUDED.ratings_neutral,
       raw = EXCLUDED.raw,
       synced_at = NOW()`,
    [
      user.id,
      user.nickname ?? null,
      user.email ?? null,
      user.site_id ?? null,
      user.permalink ?? null,
      rep.level_id ?? null,
      rep.power_seller_status ?? null,
      Number(tx.total) || 0,
      Number(tx.completed) || 0,
      Number(tx.canceled) || 0,
      Number(ratings.positive) || 0,
      Number(ratings.negative) || 0,
      Number(ratings.neutral) || 0,
      toJson(user),
    ]
  )
}

async function upsertItem(item, meliUserId, visits = {}) {
  const sellerSku = extractSellerSkuFromMeliItem(item)

  const { rows } = await query(
    `INSERT INTO meli_items (
       meli_item_id, meli_user_id, seller_sku, title, category_id, price, currency_id,
       available_quantity, sold_quantity, status, listing_type_id, item_condition,
       permalink, thumbnail, health, visits_total, visits_last_30d, raw, synced_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
     ON CONFLICT (meli_item_id) DO UPDATE SET
       meli_user_id = EXCLUDED.meli_user_id,
       seller_sku = COALESCE(EXCLUDED.seller_sku, meli_items.seller_sku),
       title = EXCLUDED.title,
       category_id = EXCLUDED.category_id,
       price = EXCLUDED.price,
       currency_id = EXCLUDED.currency_id,
       available_quantity = EXCLUDED.available_quantity,
       sold_quantity = EXCLUDED.sold_quantity,
       status = EXCLUDED.status,
       listing_type_id = EXCLUDED.listing_type_id,
       item_condition = EXCLUDED.item_condition,
       permalink = EXCLUDED.permalink,
       thumbnail = EXCLUDED.thumbnail,
       health = EXCLUDED.health,
       visits_total = EXCLUDED.visits_total,
       visits_last_30d = EXCLUDED.visits_last_30d,
       raw = EXCLUDED.raw,
       synced_at = NOW()
     RETURNING *`,
    [
      item.id,
      meliUserId,
      sellerSku,
      item.title,
      item.category_id ?? null,
      Number(item.price) || 0,
      item.currency_id ?? null,
      Number(item.available_quantity) || 0,
      Number(item.sold_quantity) || 0,
      item.status ?? null,
      item.listing_type_id ?? null,
      item.condition ?? null,
      item.permalink ?? null,
      getMeliItemImageUrl(item),
      item.health != null ? Number(item.health) : null,
      Number(visits.total) || 0,
      Number(visits.last30d) || 0,
      toJson(item),
    ]
  )

  await query(
    `UPDATE meli_items mi SET product_id = p.id
     FROM products p
     WHERE mi.meli_item_id = p.meli_item_id AND mi.meli_item_id = $1`,
    [item.id]
  )

  if (sellerSku) {
    await query(
      `UPDATE meli_items mi SET product_id = p.id
       FROM products p
       WHERE mi.meli_item_id = $1
         AND mi.product_id IS NULL
         AND p.active = true
         AND UPPER(TRIM(p.sku)) = $2`,
      [item.id, sellerSku]
    )
  }

  return rows[0]
}

async function upsertOrder(order, meliUserId, { deductStock = false } = {}) {
  const shippingId = order.shipping?.id ?? null
  const packId = order.pack_id ?? order.id

  await query(
    `INSERT INTO meli_orders (
       meli_order_id, meli_user_id, status, status_detail, buyer_id, buyer_nickname,
       total_amount, paid_amount, currency_id, shipping_status, shipping_id, pack_id,
       date_created, date_closed, raw, synced_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
     ON CONFLICT (meli_order_id) DO UPDATE SET
       status = EXCLUDED.status,
       status_detail = EXCLUDED.status_detail,
       buyer_id = EXCLUDED.buyer_id,
       buyer_nickname = EXCLUDED.buyer_nickname,
       total_amount = EXCLUDED.total_amount,
       paid_amount = EXCLUDED.paid_amount,
       currency_id = EXCLUDED.currency_id,
       shipping_status = EXCLUDED.shipping_status,
       shipping_id = EXCLUDED.shipping_id,
       pack_id = EXCLUDED.pack_id,
       date_created = EXCLUDED.date_created,
       date_closed = EXCLUDED.date_closed,
       raw = EXCLUDED.raw,
       synced_at = NOW()`,
    [
      order.id,
      meliUserId,
      order.status ?? null,
      order.status_detail ?? null,
      order.buyer?.id ?? null,
      order.buyer?.nickname ?? null,
      Number(order.total_amount) || 0,
      Number(order.paid_amount) || 0,
      order.currency_id ?? null,
      order.shipping?.status ?? null,
      shippingId,
      packId,
      order.date_created ?? null,
      order.date_closed ?? null,
      toJson(order),
    ]
  )

  await query('DELETE FROM meli_order_items WHERE meli_order_id = $1', [order.id])

  for (const line of order.order_items || []) {
    const item = line.item || {}
    await query(
      `INSERT INTO meli_order_items (meli_order_id, meli_item_id, title, quantity, unit_price)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (meli_order_id, meli_item_id, title) DO UPDATE SET
         quantity = EXCLUDED.quantity,
         unit_price = EXCLUDED.unit_price`,
      [
        order.id,
        item.id ?? line.item_id ?? null,
        item.title ?? line.title ?? null,
        Number(line.quantity) || 0,
        Number(line.unit_price) || 0,
      ]
    )
  }

  try {
    await upsertSaleFromMeliOrder(order, meliUserId, { deductStock })
  } catch (err) {
    console.error('[meli] sale sync order', order.id, err.message)
  }

  if (order.status === 'paid' || order.status === 'confirmed') {
    const { syncMeliOrderDocuments } = require('./meli-documents')
    syncMeliOrderDocuments(order.id, meliUserId).catch((err) =>
      console.warn('[meli] document sync failed', order.id, err.message)
    )
  }
}

async function upsertQuestion(question, meliUserId) {
  await query(
    `INSERT INTO meli_questions (
       meli_question_id, meli_user_id, meli_item_id, text, status,
       answer_text, from_user_id, date_created, raw, synced_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
     ON CONFLICT (meli_question_id) DO UPDATE SET
       meli_item_id = EXCLUDED.meli_item_id,
       text = EXCLUDED.text,
       status = EXCLUDED.status,
       answer_text = EXCLUDED.answer_text,
       from_user_id = EXCLUDED.from_user_id,
       date_created = EXCLUDED.date_created,
       raw = EXCLUDED.raw,
       synced_at = NOW()`,
    [
      question.id,
      meliUserId,
      question.item_id ?? null,
      question.text ?? null,
      question.status ?? null,
      question.answer?.text ?? null,
      question.from?.id ?? null,
      question.date_created ?? null,
      toJson(question),
    ]
  )
}

async function upsertPayment(payment, meliUserId) {
  await query(
    `INSERT INTO meli_payments (
       meli_payment_id, meli_user_id, meli_order_id, status, status_detail,
       transaction_amount, currency_id, date_created, raw, synced_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
     ON CONFLICT (meli_payment_id) DO UPDATE SET
       meli_order_id = EXCLUDED.meli_order_id,
       status = EXCLUDED.status,
       status_detail = EXCLUDED.status_detail,
       transaction_amount = EXCLUDED.transaction_amount,
       currency_id = EXCLUDED.currency_id,
       date_created = EXCLUDED.date_created,
       raw = EXCLUDED.raw,
       synced_at = NOW()`,
    [
      payment.id,
      meliUserId,
      payment.order?.id ?? payment.order_id ?? null,
      payment.status ?? null,
      payment.status_detail ?? null,
      Number(payment.transaction_amount) || 0,
      payment.currency_id ?? null,
      payment.date_created ?? null,
      toJson(payment),
    ]
  )
}

async function upsertMetricsDaily(meliUserId, metricDate, metrics) {
  await query(
    `INSERT INTO meli_metrics_daily (
       meli_user_id, metric_date, visits_total, orders_count, orders_paid_count,
       gross_sales, active_items, paused_items, unanswered_questions, raw, synced_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
     ON CONFLICT (meli_user_id, metric_date) DO UPDATE SET
       visits_total = EXCLUDED.visits_total,
       orders_count = EXCLUDED.orders_count,
       orders_paid_count = EXCLUDED.orders_paid_count,
       gross_sales = EXCLUDED.gross_sales,
       active_items = EXCLUDED.active_items,
       paused_items = EXCLUDED.paused_items,
       unanswered_questions = EXCLUDED.unanswered_questions,
       raw = EXCLUDED.raw,
       synced_at = NOW()`,
    [
      meliUserId,
      metricDate,
      metrics.visits_total ?? 0,
      metrics.orders_count ?? 0,
      metrics.orders_paid_count ?? 0,
      metrics.gross_sales ?? 0,
      metrics.active_items ?? 0,
      metrics.paused_items ?? 0,
      metrics.unanswered_questions ?? 0,
      toJson(metrics.raw ?? metrics),
    ]
  )
}

async function startSyncRun(meliUserId, syncType = 'full') {
  const { rows } = await query(
    `INSERT INTO meli_sync_runs (meli_user_id, sync_type, status)
     VALUES ($1, $2, 'running')
     RETURNING *`,
    [meliUserId, syncType]
  )
  return rows[0]
}

async function finishSyncRun(runId, status, summary, errorMessage = null) {
  await query(
    `UPDATE meli_sync_runs SET
       status = $2,
       summary = $3,
       error_message = $4,
       finished_at = NOW()
     WHERE id = $1`,
    [runId, status, summary ? JSON.stringify(summary) : null, errorMessage]
  )
}

async function getMetricsSummary(meliUserId) {
  const [account, items, orders, questions, latestMetrics, lastSync] = await Promise.all([
    query('SELECT * FROM meli_accounts WHERE meli_user_id = $1', [meliUserId]),
    query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'paused')::int AS paused,
         COALESCE(SUM(sold_quantity), 0)::int AS units_sold,
         COALESCE(SUM(visits_total), 0)::int AS visits_total,
         COALESCE(SUM(visits_last_30d), 0)::int AS visits_last_30d
       FROM meli_items WHERE meli_user_id = $1`,
      [meliUserId]
    ),
    query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'paid')::int AS paid,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) AS gross_sales,
         COUNT(*) FILTER (WHERE date_created >= NOW() - INTERVAL '30 days')::int AS last_30d
       FROM meli_orders WHERE meli_user_id = $1`,
      [meliUserId]
    ),
    query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'UNANSWERED')::int AS unanswered
       FROM meli_questions WHERE meli_user_id = $1`,
      [meliUserId]
    ),
    query(
      `SELECT * FROM meli_metrics_daily
       WHERE meli_user_id = $1
       ORDER BY metric_date DESC LIMIT 30`,
      [meliUserId]
    ),
    query(
      `SELECT * FROM meli_sync_runs
       WHERE meli_user_id = $1
       ORDER BY started_at DESC LIMIT 1`,
      [meliUserId]
    ),
  ])

  return {
    account: account.rows[0] ?? null,
    items: items.rows[0],
    orders: orders.rows[0],
    questions: questions.rows[0],
    daily_metrics: latestMetrics.rows,
    last_sync: lastSync.rows[0] ?? null,
  }
}

module.exports = {
  upsertAccount,
  upsertItem,
  upsertOrder,
  upsertQuestion,
  upsertPayment,
  upsertMetricsDaily,
  startSyncRun,
  finishSyncRun,
  getMetricsSummary,
}
