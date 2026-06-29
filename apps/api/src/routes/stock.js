const express = require('express')
const { supabase } = require('../lib/supabase')
const router = express.Router()

// GET /stock/movements
router.get('/movements', async (req, res) => {
  const { product_id, type, page = 1, limit = 20 } = req.query
  const offset = (page - 1) * limit

  let query = supabase
    .from('stock_movements')
    .select('*, product:products(id, name, sku)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (product_id) query = query.eq('product_id', product_id)
  if (type) query = query.eq('type', type)

  const { data, error, count } = await query
  if (error) return res.status(500).json({ data: null, error: error.message })

  res.json({ data, error: null, total: count, page: Number(page), limit: Number(limit) })
})

// POST /stock/movements - registrar entrada/salida
router.post('/movements', async (req, res) => {
  const { product_id, type, quantity, reason, reference } = req.body

  if (!product_id || !type || !quantity) {
    return res.status(400).json({ data: null, error: 'Faltan campos requeridos' })
  }

  // Obtener stock actual
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', product_id)
    .single()

  if (productError) return res.status(404).json({ data: null, error: 'Producto no encontrado' })

  // Calcular nuevo stock
  let newStock = product.stock_quantity
  if (type === 'in') newStock += Number(quantity)
  else if (type === 'out') {
    if (product.stock_quantity < quantity) {
      return res.status(400).json({ data: null, error: 'Stock insuficiente' })
    }
    newStock -= Number(quantity)
  } else if (type === 'adjustment') {
    newStock = Number(quantity)
  }

  // Registrar movimiento y actualizar stock en una transacción
  const { data: movement, error: movError } = await supabase
    .from('stock_movements')
    .insert({ product_id, type, quantity: Number(quantity), reason, reference })
    .select()
    .single()

  if (movError) return res.status(400).json({ data: null, error: movError.message })

  await supabase
    .from('products')
    .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
    .eq('id', product_id)

  res.status(201).json({ data: movement, error: null, message: 'Movimiento registrado' })
})

// GET /stock/dashboard - métricas
router.get('/dashboard', async (req, res) => {
  const [productsResult, lowStockResult, movementsResult] = await Promise.all([
    supabase.from('products').select('id, name, stock_quantity, sale_price, purchase_price, active'),
    supabase.from('products').select('id, name, stock_quantity, min_stock').lte('stock_quantity', 'min_stock').eq('active', true),
    supabase
      .from('stock_movements')
      .select('type, quantity, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  ])

  const products = productsResult.data || []
  const activeProducts = products.filter(p => p.active)

  const total_stock_value = activeProducts.reduce(
    (sum, p) => sum + p.stock_quantity * p.purchase_price, 0
  )

  const low_stock_products = (lowStockResult.data || []).filter(p => p.stock_quantity > 0).length
  const out_of_stock_products = activeProducts.filter(p => p.stock_quantity === 0).length

  const top_products = activeProducts
    .sort((a, b) => b.stock_quantity * b.sale_price - a.stock_quantity * a.sale_price)
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      name: p.name,
      stock_quantity: p.stock_quantity,
      sale_price: p.sale_price,
      total_value: p.stock_quantity * p.sale_price
    }))

  // Agrupar movimientos por mes
  const movements = movementsResult.data || []
  const monthlyMap = {}
  movements.forEach(m => {
    const month = new Date(m.created_at).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
    if (!monthlyMap[month]) monthlyMap[month] = { month, entries: 0, exits: 0 }
    if (m.type === 'in') monthlyMap[month].entries += m.quantity
    else if (m.type === 'out') monthlyMap[month].exits += m.quantity
  })

  res.json({
    data: {
      total_products: activeProducts.length,
      total_stock_value,
      low_stock_products,
      out_of_stock_products,
      top_products,
      monthly_movements: Object.values(monthlyMap)
    },
    error: null
  })
})

module.exports = router
