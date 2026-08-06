const express = require('express')
const { getPool } = require('../lib/db')
const {
  SALES_CHANNELS,
  createSale,
  backfillMeliSales,
  getConsolidatedDashboard,
  notifySaleIfNeeded,
  notifyPendingSales,
} = require('../lib/sales')
const { syncOrders } = require('../lib/meli-data-sync')
const { getTokenRow } = require('../lib/meli')
const {
  getSaleDocumentsInfo,
  syncMeliOrderDocuments,
  streamSaleDocument,
} = require('../lib/meli-documents')
const requireAuth = require('../middleware/auth')

const router = express.Router()

router.get('/channels', (_req, res) => {
  res.json({ data: SALES_CHANNELS, error: null })
})

router.get('/dashboard', async (_req, res) => {
  try {
    const data = await getConsolidatedDashboard()
    res.json({ data, error: null })
  } catch (err) {
    console.error('[sales/dashboard]', err)
    res.status(500).json({ data: null, error: err.message })
  }
})

router.get('/', async (req, res) => {
  const { channel, status, page = 1, limit = 20 } = req.query
  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))
  const offset = (pageNum - 1) * limitNum
  const params = []
  const conditions = []

  if (channel) {
    params.push(channel)
    conditions.push(`s.channel = $${params.length}`)
  }
  if (status) {
    params.push(status)
    conditions.push(`s.status = $${params.length}`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const count = await getPool().query(`SELECT COUNT(*)::int AS total FROM sales s ${where}`, params)
    const { rows } = await getPool().query(
      `SELECT s.*,
         COALESCE(
           json_agg(
             json_build_object(
               'id', si.id,
               'product_id', si.product_id,
               'description', si.description,
               'quantity', si.quantity,
               'unit_price', si.unit_price,
               'line_total', si.line_total
             )
           ) FILTER (WHERE si.id IS NOT NULL),
           '[]'
         ) AS items,
         mo.meli_order_id,
         mo.shipping_status,
         mo.label_storage_key,
         mo.invoice_storage_key,
         mo.billing_storage_key
       FROM sales s
       LEFT JOIN sale_items si ON si.sale_id = s.id
       LEFT JOIN meli_orders mo ON mo.sale_id = s.id
         OR (s.channel = 'mercadolibre' AND s.external_id IS NOT NULL AND mo.meli_order_id = s.external_id::bigint)
       ${where}
       GROUP BY s.id, mo.meli_order_id, mo.shipping_status, mo.label_storage_key, mo.invoice_storage_key, mo.billing_storage_key
       ORDER BY s.sale_date DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    )

    const { buildDocumentsInfo } = require('../lib/meli-documents')
    const data = rows.map((row) => ({
      ...row,
      documents: buildDocumentsInfo(row, row.meli_order_id ? row : null),
    }))

    res.json({
      data,
      error: null,
      total: count.rows[0].total,
      page: pageNum,
      limit: limitNum,
    })
  } catch (err) {
    res.status(500).json({ data: null, error: err.message })
  }
})

router.post('/', async (req, res) => {
  const { channel, customer_name, customer_contact, notes, sale_date, items, status } = req.body

  if (!channel || !SALES_CHANNELS.includes(channel)) {
    return res.status(400).json({ data: null, error: 'Canal inválido' })
  }
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ data: null, error: 'Agregá al menos un producto' })
  }

  try {
    const result = await createSale({
      channel,
      customerName: customer_name,
      customerContact: customer_contact,
      notes,
      saleDate: sale_date ? new Date(sale_date) : new Date(),
      status: status || 'completed',
      items,
      deductStock: true,
    })

    res.status(201).json({
      data: result.sale,
      error: null,
      message: 'Venta registrada',
    })
  } catch (err) {
    console.error('[sales/create]', err)
    res.status(400).json({ data: null, error: err.message })
  }
})

router.post('/notify-latest', async (req, res) => {
  try {
    const { rows } = await getPool().query(
      `SELECT id FROM sales ORDER BY sale_date DESC LIMIT 1`
    )

    const sale = rows[0]
    if (!sale) {
      return res.status(404).json({ ok: false, error: 'No hay ventas registradas' })
    }

    const result = await notifySaleIfNeeded(sale.id, { force: Boolean(req.body?.force) })
    if (result?.error) {
      return res.status(422).json({
        ok: false,
        error: result.error,
        hint: 'Enviá cualquier mensaje al WhatsApp de Terza (+1 207-670-1813) para abrir la ventana de 24h, o creá un template aprobado en Kapso.',
      })
    }

    res.json({ ok: true, sale_id: sale.id, kapso: result })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/sync-and-notify', async (_req, res) => {
  try {
    const tokenRow = await getTokenRow()
    if (!tokenRow) {
      return res.status(400).json({ ok: false, error: 'No hay cuenta de Mercado Libre vinculada' })
    }

    const orders = await syncOrders(tokenRow.meli_user_id)
    const notifications = await notifyPendingSales({ hours: 72 })

    res.json({ ok: true, orders, notifications })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/backfill-meli', async (_req, res) => {
  try {
    const tokenRow = await getTokenRow()
    if (!tokenRow) {
      return res.status(400).json({ ok: false, error: 'No hay cuenta de Mercado Libre vinculada' })
    }

    const result = await backfillMeliSales(tokenRow.meli_user_id)
    res.json({ ok: true, ...result })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.get('/:id/documents', async (req, res) => {
  try {
    const docs = await getSaleDocumentsInfo(req.params.id)
    if (!docs) {
      return res.status(404).json({ data: null, error: 'Venta no encontrada' })
    }
    res.json({ data: docs, error: null })
  } catch (err) {
    res.status(500).json({ data: null, error: err.message })
  }
})

router.post('/:id/sync-documents', async (req, res) => {
  try {
    const { rows } = await getPool().query(
      `SELECT s.channel, s.external_id, mo.meli_order_id, mo.meli_user_id
       FROM sales s
       LEFT JOIN meli_orders mo ON mo.sale_id = s.id
         OR (s.channel = 'mercadolibre' AND s.external_id IS NOT NULL AND mo.meli_order_id = s.external_id::bigint)
       WHERE s.id = $1`,
      [req.params.id]
    )
    const sale = rows[0]
    if (!sale) {
      return res.status(404).json({ data: null, error: 'Venta no encontrada' })
    }
    if (sale.channel !== 'mercadolibre') {
      return res.status(400).json({ data: null, error: 'Solo ventas de Mercado Libre' })
    }

    const meliOrderId = sale.meli_order_id ?? Number(sale.external_id)
    const meliUserId = sale.meli_user_id ?? (await getTokenRow())?.meli_user_id
    if (!meliOrderId || !meliUserId) {
      return res.status(400).json({ data: null, error: 'Orden ML no vinculada' })
    }

    const syncResult = await syncMeliOrderDocuments(meliOrderId, meliUserId)
    const docs = await getSaleDocumentsInfo(req.params.id)
    res.json({ data: { sync: syncResult, documents: docs }, error: null })
  } catch (err) {
    res.status(500).json({ data: null, error: err.message })
  }
})

router.get('/:id/label', async (req, res) => {
  try {
    await streamSaleDocument(req.params.id, 'label', res)
  } catch (err) {
    const status = err.status || 500
    if (!res.headersSent) {
      res.status(status).json({ data: null, error: err.message })
    }
  }
})

router.get('/:id/invoice', async (req, res) => {
  try {
    await streamSaleDocument(req.params.id, 'invoice', res)
  } catch (err) {
    const status = err.status || 500
    if (!res.headersSent) {
      res.status(status).json({ data: null, error: err.message })
    }
  }
})

router.get('/:id/billing', async (req, res) => {
  try {
    await streamSaleDocument(req.params.id, 'billing', res)
  } catch (err) {
    const status = err.status || 500
    if (!res.headersSent) {
      res.status(status).json({ data: null, error: err.message })
    }
  }
})

module.exports = router
