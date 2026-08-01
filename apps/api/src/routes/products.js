const express = require('express')
const multer = require('multer')
const { query } = require('../lib/db')
const { uploadProductImage, getPublicUrl } = require('../lib/storage')
const requireAuth = require('../middleware/auth')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Solo se permiten imágenes'))
  },
})

function normalizeImageUrl(url) {
  if (!url) return url

  const t3Match = url.match(/t3\.storageapi\.dev\/(.+)$/)
  if (t3Match) return getPublicUrl(t3Match[1])

  if (url.startsWith('/products/')) {
    const webBase = process.env.WEB_PUBLIC_URL || 'https://www.terzaimports.com.ar'
    return `${webBase.replace(/\/$/, '')}${url}`
  }

  return url
}

function normalizeProduct(row) {
  if (!row) return row
  return {
    ...row,
    image_url: normalizeImageUrl(row.image_url),
    images: Array.isArray(row.images) ? row.images.map(normalizeImageUrl) : row.images,
  }
}

const PRODUCT_FIELDS = [
  'name',
  'sku',
  'description',
  'category',
  'purchase_price',
  'sale_price',
  'stock_quantity',
  'min_stock',
  'unit',
  'supplier',
  'origin_country',
  'image_url',
  'images',
  'active',
]

function pickProductFields(body) {
  const data = {}
  for (const key of PRODUCT_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key]
  }
  return data
}

const router = express.Router()

router.get('/', async (req, res) => {
  const { category, active, search, page = 1, limit = 20 } = req.query
  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))
  const offset = (pageNum - 1) * limitNum

  const conditions = []
  const params = []

  if (active !== undefined) {
    params.push(active === 'true')
    conditions.push(`active = $${params.length}`)
  }
  if (category) {
    params.push(category)
    conditions.push(`category = $${params.length}`)
  }
  if (search) {
    params.push(`%${search}%`)
    conditions.push(`name ILIKE $${params.length}`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const countResult = await query(`SELECT COUNT(*)::int AS total FROM products ${where}`, params)
    const { rows } = await query(
      `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    )

    res.json({
      data: rows.map(normalizeProduct),
      error: null,
      total: countResult.rows[0].total,
      page: pageNum,
      limit: limitNum,
    })
  } catch (err) {
    console.error('[products/list]', err)
    res.status(500).json({ data: null, error: err.message })
  }
})

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ data: null, error: 'Archivo requerido' })
  }

  const sku = req.body.sku
  if (!sku) {
    return res.status(400).json({ data: null, error: 'SKU requerido' })
  }

  try {
    const url = await uploadProductImage(req.file, sku)
    res.json({ data: { url }, error: null })
  } catch (err) {
    res.status(500).json({ data: null, error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM products WHERE id = $1', [req.params.id])
    if (!rows[0]) {
      return res.status(404).json({ data: null, error: 'Producto no encontrado' })
    }
    res.json({ data: normalizeProduct(rows[0]), error: null })
  } catch (err) {
    res.status(500).json({ data: null, error: err.message })
  }
})

router.post('/', requireAuth, async (req, res) => {
  const data = pickProductFields(req.body)
  const keys = Object.keys(data)
  if (!keys.length) {
    return res.status(400).json({ data: null, error: 'Sin datos para crear producto' })
  }

  const cols = keys.join(', ')
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
  const values = keys.map(k => data[k])

  try {
    const { rows } = await query(
      `INSERT INTO products (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    )
    res.status(201).json({ data: rows[0], error: null, message: 'Producto creado exitosamente' })
  } catch (err) {
    res.status(400).json({ data: null, error: err.message })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  const data = pickProductFields(req.body)
  const keys = Object.keys(data)
  if (!keys.length) {
    return res.status(400).json({ data: null, error: 'Sin datos para actualizar' })
  }

  const sets = keys.map((key, i) => `${key} = $${i + 1}`)
  const values = keys.map(k => data[k])

  try {
    const { rows } = await query(
      `UPDATE products SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, req.params.id]
    )
    if (!rows[0]) {
      return res.status(404).json({ data: null, error: 'Producto no encontrado' })
    }
    res.json({ data: rows[0], error: null, message: 'Producto actualizado exitosamente' })
  } catch (err) {
    res.status(400).json({ data: null, error: err.message })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await query(
      'UPDATE products SET active = false, updated_at = NOW() WHERE id = $1',
      [req.params.id]
    )
    if (!rowCount) {
      return res.status(404).json({ data: null, error: 'Producto no encontrado' })
    }
    res.json({ data: null, error: null, message: 'Producto desactivado exitosamente' })
  } catch (err) {
    res.status(400).json({ data: null, error: err.message })
  }
})

module.exports = router
