const { getPool } = require('./db')
const { notifyAdmin } = require('./kapso')

const SALES_CHANNELS = ['mercadolibre', 'whatsapp', 'facebook', 'presencial']

const CHANNEL_LABELS = {
  mercadolibre: 'Mercado Libre',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  presencial: 'Presencial',
}

const MELI_COUNTED_STATUSES = new Set(['paid', 'confirmed'])

function mapMeliStatus(status) {
  if (MELI_COUNTED_STATUSES.has(status)) return 'completed'
  if (status === 'cancelled') return 'cancelled'
  return 'pending'
}

function formatMoney(value, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatSaleNotificationMessage(sale, items = []) {
  const fecha = new Date(sale.sale_date).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  const lines = (items || []).map(
    (i) => `  • ${i.quantity}x ${i.description} — ${formatMoney(i.unit_price, sale.currency_id)}`
  )

  return (
    `🛍️ Nueva venta — Terza Imports\n\n` +
    `Canal: ${CHANNEL_LABELS[sale.channel] || sale.channel}\n` +
    `Cliente: ${sale.customer_name || sale.customer_contact || '—'}\n` +
    `Total: ${formatMoney(sale.total_amount, sale.currency_id)}\n` +
    `Estado: ${sale.status}\n` +
    `Fecha: ${fecha}\n\n` +
    `Ítems:\n${lines.join('\n') || '  —'}`
  )
}

async function loadSaleWithItems(saleId) {
  const { rows } = await getPool().query(
    `SELECT s.*,
       COALESCE(
         json_agg(
           json_build_object(
             'description', si.description,
             'quantity', si.quantity,
             'unit_price', si.unit_price
           )
         ) FILTER (WHERE si.id IS NOT NULL),
         '[]'
       ) AS items
     FROM sales s
     LEFT JOIN sale_items si ON si.sale_id = s.id
     WHERE s.id = $1
     GROUP BY s.id`,
    [saleId]
  )
  return rows[0] ?? null
}

async function notifySaleIfNeeded(saleId, { force = false } = {}) {
  const sale = await loadSaleWithItems(saleId)
  if (!sale || sale.status !== 'completed') return { skipped: true, reason: 'not_completed' }
  if (!force && sale.kapso_notified_at) return { skipped: true, reason: 'already_notified' }

  const result = await notifyAdmin(formatSaleNotificationMessage(sale, sale.items))
  if (result?.error || result?.skipped) return result

  await getPool().query('UPDATE sales SET kapso_notified_at = NOW() WHERE id = $1', [saleId])
  return result
}

async function notifySaleCreated(sale, items = []) {
  if (!sale?.id) {
    if (!sale || sale.status !== 'completed') return { skipped: true }
    return notifyAdmin(formatSaleNotificationMessage(sale, items))
  }
  return notifySaleIfNeeded(sale.id)
}

async function notifyPendingSales({ hours = 48 } = {}) {
  const { rows } = await getPool().query(
    `SELECT id FROM sales
     WHERE status = 'completed'
       AND kapso_notified_at IS NULL
       AND sale_date >= NOW() - ($1::text || ' hours')::interval
     ORDER BY sale_date DESC`,
    [String(hours)]
  )

  const results = []
  for (const row of rows) {
    results.push({ sale_id: row.id, ...(await notifySaleIfNeeded(row.id)) })
  }
  return results
}

async function findProductByMeliItemId(meliItemId) {
  if (!meliItemId) return null
  const { rows } = await getPool().query(
    'SELECT id, name, stock_quantity FROM products WHERE meli_item_id = $1 LIMIT 1',
    [meliItemId]
  )
  return rows[0] ?? null
}

async function deductStockForSale(client, saleId, channel, items) {
  for (const item of items) {
    if (!item.product_id) continue

    const productResult = await client.query(
      'SELECT stock_quantity, name FROM products WHERE id = $1 FOR UPDATE',
      [item.product_id]
    )
    const product = productResult.rows[0]
    if (!product) continue

    const qty = Number(item.quantity) || 0
    if (qty <= 0) continue

    const newStock = Math.max(0, product.stock_quantity - qty)
    await client.query(
      `INSERT INTO stock_movements (product_id, type, quantity, reason, reference, sale_id, channel)
       VALUES ($1, 'out', $2, $3, $4, $5, $6)`,
      [
        item.product_id,
        qty,
        `Venta ${channel}`,
        `sale:${saleId}`,
        saleId,
        channel,
      ]
    )
    await client.query(
      'UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2',
      [newStock, item.product_id]
    )
  }
}

async function createSale({
  channel,
  externalId = null,
  customerName = null,
  customerContact = null,
  status = 'completed',
  currencyId = 'ARS',
  notes = null,
  saleDate = new Date(),
  items = [],
  deductStock = true,
}) {
  if (!SALES_CHANNELS.includes(channel)) {
    throw new Error(`Canal inválido: ${channel}`)
  }
  if (!items.length) {
    throw new Error('La venta debe tener al menos un ítem')
  }

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')

    if (externalId) {
      const existing = await client.query(
        'SELECT id FROM sales WHERE channel = $1 AND external_id = $2',
        [channel, String(externalId)]
      )
      if (existing.rows[0]) {
        await client.query('ROLLBACK')
        return { sale_id: existing.rows[0].id, created: false }
      }
    }

    const normalizedItems = items.map((item) => {
      const quantity = Number(item.quantity) || 1
      const unitPrice = Number(item.unit_price) || 0
      return {
        product_id: item.product_id ?? null,
        description: item.description || null,
        quantity,
        unit_price: unitPrice,
        line_total: quantity * unitPrice,
      }
    })

    const totalAmount = normalizedItems.reduce((sum, i) => sum + i.line_total, 0)

    const saleResult = await client.query(
      `INSERT INTO sales (
         channel, external_id, customer_name, customer_contact, status,
         total_amount, currency_id, notes, sale_date
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        channel,
        externalId ? String(externalId) : null,
        customerName,
        customerContact,
        status,
        totalAmount,
        currencyId,
        notes,
        saleDate,
      ]
    )
    const sale = saleResult.rows[0]

    for (const item of normalizedItems) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, description, quantity, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [sale.id, item.product_id, item.description, item.quantity, item.unit_price, item.line_total]
      )
    }

    if (deductStock && status === 'completed') {
      await deductStockForSale(client, sale.id, channel, normalizedItems)
    }

    await client.query('COMMIT')

    if (status === 'completed') {
      notifySaleIfNeeded(sale.id).catch((err) =>
        console.error('[sales] kapso notify failed', err.message)
      )
    }

    return { sale_id: sale.id, sale, created: true }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function upsertSaleFromMeliOrder(order, meliUserId, { deductStock = false } = {}) {
  const orderId = String(order.id)
  const items = []

  for (const line of order.order_items || []) {
    const meliItemId = line.item?.id ?? line.item_id
    const product = await findProductByMeliItemId(meliItemId)
    items.push({
      product_id: product?.id ?? null,
      description: line.item?.title ?? line.title ?? `ML ${meliItemId}`,
      quantity: Number(line.quantity) || 1,
      unit_price: Number(line.unit_price) || 0,
    })
  }

  if (!items.length) {
    items.push({
      product_id: null,
      description: `Orden Mercado Libre #${orderId}`,
      quantity: 1,
      unit_price: Number(order.total_amount) || 0,
    })
  }

  const result = await createSale({
    channel: 'mercadolibre',
    externalId: orderId,
    customerName: order.buyer?.nickname ?? null,
    customerContact: order.buyer?.id ? String(order.buyer.id) : null,
    status: mapMeliStatus(order.status),
    currencyId: order.currency_id || 'ARS',
    notes: order.status_detail ?? null,
    saleDate: order.date_created ? new Date(order.date_created) : new Date(),
    items,
    deductStock: deductStock && MELI_COUNTED_STATUSES.has(order.status),
  })

  if (result.sale_id) {
    await getPool().query('UPDATE meli_orders SET sale_id = $1 WHERE meli_order_id = $2', [
      result.sale_id,
      order.id,
    ])

    if (mapMeliStatus(order.status) === 'completed') {
      notifySaleIfNeeded(result.sale_id).catch((err) =>
        console.error('[sales] meli kapso notify failed', order.id, err.message)
      )
    }
  }

  return result
}

async function backfillMeliSales(meliUserId) {
  const { rows } = await getPool().query(
    `SELECT raw, meli_order_id FROM meli_orders
     WHERE meli_user_id = $1 AND sale_id IS NULL
     ORDER BY date_created DESC`,
    [meliUserId]
  )

  let created = 0
  let skipped = 0
  const errors = []

  for (const row of rows) {
    try {
      const order = row.raw || { id: row.meli_order_id }
      if (!order.id) order.id = row.meli_order_id
      const result = await upsertSaleFromMeliOrder(order, meliUserId, { deductStock: false })
      if (result.created) created += 1
      else skipped += 1
    } catch (err) {
      errors.push({ orderId: row.meli_order_id, error: err.message })
    }
  }

  return { created, skipped, errors }
}

async function getConsolidatedDashboard() {
  const [stock, byChannel, recentSales, totals] = await Promise.all([
    getPool().query(
      `SELECT
         COUNT(*)::int AS total_products,
         COALESCE(SUM(stock_quantity), 0)::int AS total_units,
         COALESCE(SUM(stock_quantity * purchase_price), 0) AS stock_cost_value,
         COALESCE(SUM(stock_quantity * sale_price), 0) AS stock_retail_value,
         COUNT(*) FILTER (WHERE stock_quantity <= min_stock AND active = true)::int AS low_stock,
         COUNT(*) FILTER (WHERE stock_quantity = 0 AND active = true)::int AS out_of_stock
       FROM products WHERE active = true`
    ),
    getPool().query(
      `SELECT
         channel,
         COUNT(*)::int AS sales_count,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS revenue,
         COUNT(*) FILTER (WHERE status = 'completed' AND sale_date >= NOW() - INTERVAL '30 days')::int AS sales_last_30d,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed' AND sale_date >= NOW() - INTERVAL '30 days'), 0) AS revenue_last_30d
       FROM sales
       GROUP BY channel
       ORDER BY revenue DESC`
    ),
    getPool().query(
      `SELECT s.*,
         COALESCE(
           json_agg(
             json_build_object(
               'description', si.description,
               'quantity', si.quantity,
               'unit_price', si.unit_price,
               'product_id', si.product_id
             )
           ) FILTER (WHERE si.id IS NOT NULL),
           '[]'
         ) AS items
       FROM sales s
       LEFT JOIN sale_items si ON si.sale_id = s.id
       GROUP BY s.id
       ORDER BY s.sale_date DESC
       LIMIT 15`
    ),
    getPool().query(
      `SELECT
         COUNT(*)::int AS total_sales,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS total_revenue,
         COUNT(*) FILTER (WHERE status = 'completed' AND sale_date >= NOW() - INTERVAL '30 days')::int AS sales_last_30d,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed' AND sale_date >= NOW() - INTERVAL '30 days'), 0) AS revenue_last_30d
       FROM sales`
    ),
  ])

  return {
    stock: stock.rows[0],
    totals: totals.rows[0],
    by_channel: byChannel.rows,
    recent_sales: recentSales.rows,
  }
}

module.exports = {
  SALES_CHANNELS,
  CHANNEL_LABELS,
  createSale,
  upsertSaleFromMeliOrder,
  backfillMeliSales,
  getConsolidatedDashboard,
  formatSaleNotificationMessage,
  notifySaleCreated,
  notifySaleIfNeeded,
  notifyPendingSales,
}
