const { query } = require('./db')
const { meliFetch } = require('./meli')
const { notifyAdmin } = require('./kapso')

function slugifySku(value, fallback) {
  const base = String(value || fallback)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
  return base || `MELI-${fallback}`
}

function mapMeliItemToProduct(item) {
  const meliItemId = item.id
  const sku = slugifySku(item.seller_custom_field, meliItemId)

  return {
    meli_item_id: meliItemId,
    name: item.title,
    sku,
    description: item.subtitle || item.title,
    category: 'Mercado Libre',
    purchase_price: 0,
    sale_price: Number(item.price) || 0,
    stock_quantity: Number(item.available_quantity) || 0,
    min_stock: 5,
    unit: 'unidad',
    image_url: item.thumbnail || item.pictures?.[0]?.secure_url || null,
    meli_permalink: item.permalink || null,
    active: item.status === 'active',
  }
}

async function upsertProductFromMeliItem(item) {
  const data = mapMeliItemToProduct(item)

  const existing = await query('SELECT id FROM products WHERE meli_item_id = $1', [data.meli_item_id])
  if (existing.rows[0]) {
    const { rows } = await query(
      `UPDATE products SET
         name = $1, sale_price = $2, stock_quantity = $3, image_url = $4,
         meli_permalink = $5, active = $6, meli_last_synced_at = NOW(), updated_at = NOW()
       WHERE meli_item_id = $7
       RETURNING *`,
      [
        data.name,
        data.sale_price,
        data.stock_quantity,
        data.image_url,
        data.meli_permalink,
        data.active,
        data.meli_item_id,
      ]
    )
    return { product: rows[0], created: false }
  }

  const { rows } = await query(
    `INSERT INTO products (
       name, sku, description, category, purchase_price, sale_price,
       stock_quantity, min_stock, unit, image_url, meli_item_id, meli_permalink,
       meli_last_synced_at, active
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),$13)
     ON CONFLICT (sku) DO UPDATE SET
       name = EXCLUDED.name,
       sale_price = EXCLUDED.sale_price,
       stock_quantity = EXCLUDED.stock_quantity,
       image_url = EXCLUDED.image_url,
       meli_item_id = EXCLUDED.meli_item_id,
       meli_permalink = EXCLUDED.meli_permalink,
       meli_last_synced_at = NOW(),
       active = EXCLUDED.active,
       updated_at = NOW()
     RETURNING *`,
    [
      data.name,
      data.sku,
      data.description,
      data.category,
      data.purchase_price,
      data.sale_price,
      data.stock_quantity,
      data.min_stock,
      data.unit,
      data.image_url,
      data.meli_item_id,
      data.meli_permalink,
      data.active,
    ]
  )

  return { product: rows[0], created: true }
}

async function syncItemFromMeli(meliItemId, meliUserId) {
  const item = await meliFetch(`/items/${meliItemId}`, {}, meliUserId)
  return upsertProductFromMeliItem(item)
}

async function syncStockToMeli(productId) {
  const { rows } = await query(
    'SELECT id, name, stock_quantity, sale_price, meli_item_id FROM products WHERE id = $1',
    [productId]
  )
  const product = rows[0]
  if (!product?.meli_item_id) return { skipped: true }

  await meliFetch(`/items/${product.meli_item_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      available_quantity: product.stock_quantity,
      price: product.sale_price,
    }),
  })

  await query('UPDATE products SET meli_last_synced_at = NOW() WHERE id = $1', [productId])
  return { synced: true, meli_item_id: product.meli_item_id }
}

async function importUserItems(meliUserId) {
  const userId = meliUserId || (await meliFetch('/users/me')).id
  let offset = 0
  const limit = 50
  let total = 0
  const results = []

  while (true) {
    const search = await meliFetch(
      `/users/${userId}/items/search?status=active&limit=${limit}&offset=${offset}`,
      {},
      userId
    )

    const itemIds = search.results || []
    if (!itemIds.length) break

    for (const itemId of itemIds) {
      try {
        const result = await syncItemFromMeli(itemId, userId)
        results.push({ itemId, ok: true, created: result.created })
        total += 1
      } catch (err) {
        results.push({ itemId, ok: false, error: err.message })
      }
    }

    if (itemIds.length < limit) break
    offset += limit
  }

  return { imported: total, results }
}

async function maybeNotifyLowStock(product) {
  if (!product || product.stock_quantity > product.min_stock) return
  await notifyAdmin(
    `⚠️ Stock bajo en Terza Imports\n` +
      `Producto: ${product.name}\n` +
      `Stock: ${product.stock_quantity} (mín: ${product.min_stock})`
  )
}

module.exports = {
  syncItemFromMeli,
  syncStockToMeli,
  importUserItems,
  upsertProductFromMeliItem,
  maybeNotifyLowStock,
}
