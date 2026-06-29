const express = require('express')
const { supabase } = require('../lib/supabase')
const router = express.Router()

// GET /expenses - listar gastos
router.get('/', async (req, res) => {
  const { category, start_date, end_date, page = 1, limit = 20 } = req.query
  const offset = (page - 1) * limit

  let query = supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .order('expense_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category) query = query.eq('category', category)
  if (start_date) query = query.gte('expense_date', start_date)
  if (end_date) query = query.lte('expense_date', end_date)

  const { data, error, count } = await query
  if (error) return res.status(500).json({ data: null, error: error.message })

  res.json({ data, error: null, total: count, page: Number(page), limit: Number(limit) })
})

// GET /expenses/summary - resumen de gastos
router.get('/summary', async (req, res) => {
  const { start_date, end_date } = req.query

  let query = supabase
    .from('expenses')
    .select('category, amount')

  if (start_date) query = query.gte('expense_date', start_date)
  if (end_date) query = query.lte('expense_date', end_date)

  const { data, error } = await query

  if (error) return res.status(500).json({ data: null, error: error.message })

  const summary = {}
  let total = 0
  data.forEach(e => {
    summary[e.category] = (summary[e.category] || 0) + e.amount
    total += e.amount
  })

  res.json({
    data: { categories: summary, total, count: data.length },
    error: null
  })
})

// POST /expenses - crear gasto
router.post('/', async (req, res) => {
  const { data, error } = await supabase
    .from('expenses')
    .insert(req.body)
    .select()
    .single()

  if (error) return res.status(400).json({ data: null, error: error.message })
  res.status(201).json({ data, error: null, message: 'Gasto registrado exitosamente' })
})

// PUT /expenses/:id - actualizar gasto
router.put('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('expenses')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ data: null, error: error.message })
  res.json({ data, error: null, message: 'Gasto actualizado exitosamente' })
})

// DELETE /expenses/:id - eliminar gasto
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(400).json({ data: null, error: error.message })
  res.json({ data: null, error: null, message: 'Gasto eliminado exitosamente' })
})

module.exports = router
