const { query } = require('./db')
const { meliFetch } = require('./meli')
const { notifyAdmin } = require('./kapso')
const {
  productFingerprint,
  inventorySkuFromFingerprint,
  findProductByInventorySku,
  linkMeliItemToProduct,
} = require('./product-consolidation')

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
  const fingerprint = productFingerprint(item.title)
  const inventorySku = inventorySkuFromFingerprint(fingerprint)

  const linked = await query('SELECT product_id FROM meli_items WHERE meli_item_id = $1', [data.meli_item_id])
  let productId = linked.rows[0]?.product_id

  if (!productId) {
    const byMeli = await query('SELECT id FROM products WHERE meli_item_id = $1', [data.meli_item_id])
    productId = byMeli.rows[0]?.id
  }

  if (!productId) {
    const existing = await findProductByInventorySku(inventorySku)
    productId = existing?.id
  }

  if (productId) {
    const { rows } = await query(
      `UPDATE products SET
         name = $1, image_url = $2, meli_permalink = $3, active = $4,
         inventory_sku = COALESCE(inventory_sku, $5),
         meli_last_synced_at = NOW(), updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [data.name, data.image_url, data.meli_permalink, data.active, inventorySku, productId]
    )
    await linkMeliItemToProduct(data.meli_item_id, productId)
    return { product: rows[0], created: false }
  }

  const { rows } = await query(
    `INSERT INTO products (
       name, sku, description, category, purchase_price, sale_price,
       stock_quantity, min_stock, unit, image_url, meli_permalink,
       inventory_sku, meli_last_synced_at, active
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),$13)
     RETURNING *`,
    [
      data.name,
      inventorySku,
      data.description,
      data.category,
      data.purchase_price,
      data.sale_price,
      data.stock_quantity,
      data.min_stock,
      data.unit,
      data.image_url,
      data.meli_permalink,
      inventorySku,
      data.active,
    ]
  )

  await linkMeliItemToProduct(data.meli_item_id, rows[0].id)
  return { product: rows[0], created: true }
}

async function syncItemFromMeli(meliItemId, meliUserId) {
  const item = await meliFetch(`/items/${meliItemId}`, {}, meliUserId)
  return upsertProductFromMeliItem(item)
}

async function syncStockToMeli(productId) {
  const productResult = await query(
    'SELECT id, name, stock_quantity FROM products WHERE id = $1',
    [productId]
  )
  const product = productResult.rows[0]
  if (!product) return { skipped: true, reason: 'product_not_found' }

  const listings = await query(
    `SELECT meli_item_id, price, listing_type_id FROM meli_items
     WHERE product_id = $1 AND status = 'active'`,
    [productId]
  )

  if (!listings.rows.length) {
    const legacy = await query('SELECT meli_item_id, sale_price FROM products WHERE id = $1 AND meli_item_id IS NOT NULL', [productId])
    if (legacy.rows[0]) {
      listings.rows.push({ meli_item_id: legacy.rows[0].meli_item_id, price: legacy.rows[0].sale_price })
    }
  }

  if (!listings.rows.length) return { skipped: true, reason: 'no_listings' }

  const results = []
  for (const listing of listings.rows) {
    try {
      await meliFetch(`/items/${listing.meli_item_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          available_quantity: product.stock_quantity,
          price: Number(listing.price) || undefined,
        }),
      })
      results.push({ meli_item_id: listing.meli_item_id, synced: true })
    } catch (err) {
      results.push({ meli_item_id: listing.meli_item_id, error: err.message })
    }
  }

  await query('UPDATE products SET meli_last_synced_at = NOW() WHERE id = $1', [productId])
  return { synced: true, listings: results }
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

async function reconcileStockFromMeliItems() {
  const { rowCount } = await query(
    `UPDATE products p
     SET stock_quantity = sub.max_qty, updated_at = NOW()
     FROM (
       SELECT product_id, MAX(available_quantity)::int AS max_qty
       FROM meli_items
       WHERE product_id IS NOT NULL
       GROUP BY product_id
     ) sub
     WHERE p.id = sub.product_id`
  )
  return { updated: rowCount }
}

async function maybeNotifyLowStock(productOrId) {
  const productId = typeof productOrId === 'string' ? productOrId : productOrId?.id
  if (!productId) return { skipped: true, reason: 'no_product' }

  const { rows } = await query(
    `SELECT id, name, stock_quantity, min_stock, low_stock_notified_at
     FROM products WHERE id = $1 AND active = true`,
    [productId]
  )
  const product = rows[0]
  if (!product) return { skipped: true, reason: 'not_found' }

  if (product.stock_quantity > product.min_stock) {
    if (product.low_stock_notified_at) {
      await query('UPDATE products SET low_stock_notified_at = NULL WHERE id = $1', [productId])
    }
    return { skipped: true, reason: 'stock_ok' }
  }

  const cooldownHours = Number(process.env.LOW_STOCK_NOTIFY_COOLDOWN_HOURS) || 24
  if (product.low_stock_notified_at) {
    const hoursSince =
      (Date.now() - new Date(product.low_stock_notified_at).getTime()) / (1000 * 60 * 60)
    if (hoursSince < cooldownHours) {
      return { skipped: true, reason: 'cooldown', hours_since: Math.round(hoursSince * 10) / 10 }
    }
  }

  await notifyAdmin(
    `⚠️ Stock bajo en Terza Imports\n` +
      `Producto: ${product.name}\n` +
      `Stock: ${product.stock_quantity} (mín: ${product.min_stock})`
  )
  await query('UPDATE products SET low_stock_notified_at = NOW() WHERE id = $1', [productId])
  return { sent: true }
}

module.exports = {
  syncItemFromMeli,
  syncStockToMeli,
  importUserItems,
  upsertProductFromMeliItem,
  reconcileStockFromMeliItems,
  maybeNotifyLowStock,
}
