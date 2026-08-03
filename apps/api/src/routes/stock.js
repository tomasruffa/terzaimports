const express = require('express')
const { getPool } = require('../lib/db')
const { syncStockToMeli, maybeNotifyLowStock } = require('../lib/meli-sync')

const router = express.Router()

router.get('/movements', async (req, res) => {
  const { product_id, type, page = 1, limit = 20 } = req.query
  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))
  const offset = (pageNum - 1) * limitNum

  const conditions = []
  const params = []

  if (product_id) {
    params.push(product_id)
    conditions.push(`sm.product_id = $${params.length}`)
  }
  if (type) {
    params.push(type)
    conditions.push(`sm.type = $${params.length}`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const countResult = await getPool().query(
      `SELECT COUNT(*)::int AS total FROM stock_movements sm ${where}`,
      params
    )
    const { rows } = await getPool().query(
      `SELECT sm.*,
        json_build_object('id', p.id, 'name', p.name, 'sku', p.sku) AS product
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       ${where}
       ORDER BY sm.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
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

router.post('/movements', async (req, res) => {
  const { product_id, type, quantity, reason, reference } = req.body

  if (!product_id || !type || quantity === undefined) {
    return res.status(400).json({ data: null, error: 'Faltan campos requeridos' })
  }

  const client = await getPool().connect()

  try {
    await client.query('BEGIN')

    const productResult = await client.query(
      'SELECT stock_quantity FROM products WHERE id = $1 FOR UPDATE',
      [product_id]
    )
    const product = productResult.rows[0]
    if (!product) {
      await client.query('ROLLBACK')
      return res.status(404).json({ data: null, error: 'Producto no encontrado' })
    }

    let newStock = product.stock_quantity
    const qty = Number(quantity)

    if (type === 'in') newStock += qty
    else if (type === 'out') {
      if (product.stock_quantity < qty) {
        await client.query('ROLLBACK')
        return res.status(400).json({ data: null, error: 'Stock insuficiente' })
      }
      newStock -= qty
    } else if (type === 'adjustment') {
      newStock = qty
    } else {
      await client.query('ROLLBACK')
      return res.status(400).json({ data: null, error: 'Tipo de movimiento inválido' })
    }

    const movementResult = await client.query(
      `INSERT INTO stock_movements (product_id, type, quantity, reason, reference)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [product_id, type, qty, reason ?? null, reference ?? null]
    )

    await client.query(
      'UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2',
      [newStock, product_id]
    )

    await client.query('COMMIT')
    syncStockToMeli(product_id).catch((err) => {
      console.error('[stock] meli sync', err.message)
    })
    maybeNotifyLowStock(product_id).catch((err) => {
      console.error('[stock] low stock notify', err.message)
    })
    res.status(201).json({ data: movementResult.rows[0], error: null, message: 'Movimiento registrado' })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(400).json({ data: null, error: err.message })
  } finally {
    client.release()
  }
})

router.get('/dashboard', async (req, res) => {
  try {
    const [productsResult, lowStockResult, movementsResult] = await Promise.all([
      getPool().query(
        'SELECT id, name, stock_quantity, sale_price, purchase_price, active FROM products'
      ),
      getPool().query(
        `SELECT id, name, stock_quantity, min_stock FROM products
         WHERE stock_quantity <= min_stock AND active = true`
      ),
      getPool().query(
        `SELECT type, quantity, created_at FROM stock_movements
         WHERE created_at >= NOW() - INTERVAL '30 days'`
      ),
    ])

    const products = productsResult.rows
    const activeProducts = products.filter(p => p.active)

    const total_stock_value = activeProducts.reduce(
      (sum, p) => sum + Number(p.stock_quantity) * Number(p.purchase_price),
      0
    )

    const low_stock_products = lowStockResult.rows.filter(p => p.stock_quantity > 0).length
    const out_of_stock_products = activeProducts.filter(p => p.stock_quantity === 0).length

    const top_products = activeProducts
      .sort(
        (a, b) =>
          b.stock_quantity * b.sale_price - a.stock_quantity * a.sale_price
      )
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        stock_quantity: p.stock_quantity,
        sale_price: p.sale_price,
        total_value: p.stock_quantity * p.sale_price,
      }))

    const monthlyMap = {}
    movementsResult.rows.forEach(m => {
      const month = new Date(m.created_at).toLocaleDateString('es-AR', {
        month: 'short',
        year: '2-digit',
      })
      if (!monthlyMap[month]) monthlyMap[month] = { month, entries: 0, exits: 0 }
      if (m.type === 'in') monthlyMap[month].entries += Number(m.quantity)
      else if (m.type === 'out') monthlyMap[month].exits += Number(m.quantity)
    })

    res.json({
      data: {
        total_products: activeProducts.length,
        total_stock_value,
        low_stock_products,
        out_of_stock_products,
        top_products,
        monthly_movements: Object.values(monthlyMap),
      },
      error: null,
    })
  } catch (err) {
    res.status(500).json({ data: null, error: err.message })
  }
})

module.exports = router
