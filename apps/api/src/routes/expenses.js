const express = require('express')
const { query } = require('../lib/db')

const router = express.Router()

const EXPENSE_FIELDS = [
  'category',
  'description',
  'amount',
  'payment_method',
  'receipt_url',
  'notes',
  'expense_date',
]

function pickExpenseFields(body) {
  const data = {}
  for (const key of EXPENSE_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key]
  }
  return data
}

router.get('/', async (req, res) => {
  const { category, start_date, end_date, page = 1, limit = 20 } = req.query
  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))
  const offset = (pageNum - 1) * limitNum

  const conditions = []
  const params = []

  if (category) {
    params.push(category)
    conditions.push(`category = $${params.length}`)
  }
  if (start_date) {
    params.push(start_date)
    conditions.push(`expense_date >= $${params.length}`)
  }
  if (end_date) {
    params.push(end_date)
    conditions.push(`expense_date <= $${params.length}`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const countResult = await query(`SELECT COUNT(*)::int AS total FROM expenses ${where}`, params)
    const { rows } = await query(
      `SELECT * FROM expenses ${where} ORDER BY expense_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    )

    res.json({
      data: rows,
      error: null,
      total: countResult.rows[0].total,
      page: pageNum,
      limit: limitNum,
    })
  } catch (err) {
    res.status(500).json({ data: null, error: err.message })
  }
})

router.get('/summary', async (req, res) => {
  const { start_date, end_date } = req.query
  const conditions = []
  const params = []

  if (start_date) {
    params.push(start_date)
    conditions.push(`expense_date >= $${params.length}`)
  }
  if (end_date) {
    params.push(end_date)
    conditions.push(`expense_date <= $${params.length}`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const { rows } = await query(`SELECT category, amount FROM expenses ${where}`, params)
    const summary = {}
    let total = 0
    rows.forEach(e => {
      summary[e.category] = (summary[e.category] || 0) + Number(e.amount)
      total += Number(e.amount)
    })

    res.json({
      data: { categories: summary, total, count: rows.length },
      error: null,
    })
  } catch (err) {
    res.status(500).json({ data: null, error: err.message })
  }
})

router.post('/', async (req, res) => {
  const data = pickExpenseFields(req.body)
  const keys = Object.keys(data)
  if (!keys.length) {
    return res.status(400).json({ data: null, error: 'Sin datos para crear gasto' })
  }

  const cols = keys.join(', ')
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
  const values = keys.map(k => data[k])

  try {
    const { rows } = await query(
      `INSERT INTO expenses (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    )
    res.status(201).json({ data: rows[0], error: null, message: 'Gasto registrado exitosamente' })
  } catch (err) {
    res.status(400).json({ data: null, error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  const data = pickExpenseFields(req.body)
  const keys = Object.keys(data)
  if (!keys.length) {
    return res.status(400).json({ data: null, error: 'Sin datos para actualizar' })
  }

  const sets = keys.map((key, i) => `${key} = $${i + 1}`)
  const values = keys.map(k => data[k])

  try {
    const { rows } = await query(
      `UPDATE expenses SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, req.params.id]
    )
    if (!rows[0]) {
      return res.status(404).json({ data: null, error: 'Gasto no encontrado' })
    }
    res.json({ data: rows[0], error: null, message: 'Gasto actualizado exitosamente' })
  } catch (err) {
    res.status(400).json({ data: null, error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM expenses WHERE id = $1', [req.params.id])
    if (!rowCount) {
      return res.status(404).json({ data: null, error: 'Gasto no encontrado' })
    }
    res.json({ data: null, error: null, message: 'Gasto eliminado exitosamente' })
  } catch (err) {
    res.status(400).json({ data: null, error: err.message })
  }
})

module.exports = router
