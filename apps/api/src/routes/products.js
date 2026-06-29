const express = require('express')
const { supabase } = require('../lib/supabase')
const requireAuth = require('../middleware/auth')
const router = express.Router()

// GET /products
router.get('/', async (req, res) => {
  const { category, active, search, page = 1, limit = 20 } = req.query
  const offset = (page - 1) * limit

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (active !== undefined) query = query.eq('active', active === 'true')
  if (category) query = query.eq('category', category)
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error, count } = await query
  if (error) return res.status(500).json({ data: null, error: error.message })

  res.json({ data, error: null, total: count, page: Number(page), limit: Number(limit) })
})

// GET /products/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ data: null, error: 'Producto no encontrado' })
  res.json({ data, error: null })
})

// POST /products
router.post('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .insert(req.body)
    .select()
    .single()

  if (error) return res.status(400).json({ data: null, error: error.message })
  res.status(201).json({ data, error: null, message: 'Producto creado exitosamente' })
})

// PUT /products/:id
router.put('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ data: null, error: error.message })
  res.json({ data, error: null, message: 'Producto actualizado exitosamente' })
})

// DELETE /products/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('products')
    .update({ active: false })
    .eq('id', req.params.id)

  if (error) return res.status(400).json({ data: null, error: error.message })
  res.json({ data: null, error: null, message: 'Producto desactivado exitosamente' })
})

module.exports = router
