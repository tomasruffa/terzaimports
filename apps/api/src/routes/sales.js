const express = require('express')
const { getPool } = require('../lib/db')
const {
  SALES_CHANNELS,
  createSale,
  backfillMeliSales,
  getConsolidatedDashboard,
} = require('../lib/sales')
const { getTokenRow } = require('../lib/meli')
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
         ) AS items
       FROM sales s
       LEFT JOIN sale_items si ON si.sale_id = s.id
       ${where}
       GROUP BY s.id
       ORDER BY s.sale_date DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    )

    res.json({
      data: rows,
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

module.exports = router
