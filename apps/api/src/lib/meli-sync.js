const { query } = require('./db')
const { meliFetch } = require('./meli')
const { notifyAdmin } = require('./kapso')
const {
  normalizeSku,
  findProductBySku,
  isGeneratedSku,
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

function extractSellerSkuFromMeliItem(item) {
  const raw =
    item.seller_custom_field ||
    item.attributes?.find((a) => a.id === 'SELLER_SKU')?.value_name ||
    item.seller_sku
  if (!raw) return null
  return normalizeSku(raw)
}

/** Mejor URL de imagen desde ML (foto principal, HTTPS). */
function getMeliItemImageUrl(item) {
  const pic = item.pictures?.[0]?.secure_url || item.pictures?.[0]?.url
  const thumb = item.secure_thumbnail || item.thumbnail
  const url = pic || thumb || null
  if (!url) return null
  return url.replace(/^http:\/\//i, 'https://')
}

/** Publicación real de Mercado Libre (panel vendedor), no producto Mercado Pago / Point. */
function isMarketplaceListing(item) {
  if (!item) return false
  if (item.domain_id === 'MLA-MERCADO_PAGO') return false
  if (item.category_id === 'MLA458068') return false
  const channels = item.channels || []
  if (channels.length > 0 && !channels.includes('marketplace')) return false
  return true
}

function meliSkuFromItem(item) {
  const extracted = extractSellerSkuFromMeliItem(item)
  if (extracted) return extracted
  return slugifySku(null, item.id)
}

function mapMeliItemToProduct(item) {
  const meliItemId = item.id
  const sku = meliSkuFromItem(item)

  return {
    meli_item_id: meliItemId,
    seller_sku: sku,
    name: item.title,
    sku,
    description: item.subtitle || item.title,
    category: 'Mercado Libre',
    purchase_price: 0,
    sale_price: Number(item.price) || 0,
    stock_quantity: Number(item.available_quantity) || 0,
    min_stock: 5,
    unit: 'unidad',
    image_url: getMeliItemImageUrl(item),
    meli_permalink: item.permalink || null,
    active: item.status === 'active',
  }
}

async function upsertProductFromMeliItem(item) {
  if (!isMarketplaceListing(item)) {
    return { product: null, created: false, skipped: true, reason: 'not_marketplace_listing' }
  }

  const stored = await query(
    'SELECT seller_sku, product_id FROM meli_items WHERE meli_item_id = $1',
    [item.id]
  )
  const storedSku = stored.rows[0]?.seller_sku
  if (storedSku && !isGeneratedSku(storedSku)) {
    item = { ...item, seller_custom_field: storedSku }
  }

  const data = mapMeliItemToProduct(item)

  let productId = stored.rows[0]?.product_id

  if (!productId) {
    const linked = await query('SELECT product_id FROM meli_items WHERE meli_item_id = $1', [data.meli_item_id])
    productId = linked.rows[0]?.product_id
  }

  if (!productId) {
    const byMeli = await query('SELECT id FROM products WHERE meli_item_id = $1', [data.meli_item_id])
    productId = byMeli.rows[0]?.id
  }

  if (!productId && !isGeneratedSku(data.sku)) {
    const bySku = await findProductBySku(data.sku, { activeOnly: false })
    productId = bySku?.id
  }

  if (productId) {
    const { rows: existing } = await query(
      `SELECT sku, sale_price,
         (SELECT COUNT(*)::int FROM meli_items WHERE product_id = products.id) AS listings
       FROM products WHERE id = $1`,
      [productId]
    )
    const row = existing[0]
    const keepSku = row?.sku && !isGeneratedSku(row.sku)
    const nextSku = keepSku ? row.sku : data.sku
    const keepPrice = Number(row?.sale_price) > 0
    const nextPrice = keepPrice ? row.sale_price : data.sale_price
    const keepName = keepSku && Number(row?.listings) > 1

    // Avoid unique constraint if another product already owns this SKU.
    let skuUpdate = nextSku
    if (!keepSku && nextSku) {
      const { rows: skuOwner } = await query(
        'SELECT id FROM products WHERE UPPER(TRIM(sku)) = $1 AND id <> $2 LIMIT 1',
        [normalizeSku(nextSku), productId]
      )
      if (skuOwner.length) skuUpdate = row.sku
    }

    const { rows } = await query(
      `UPDATE products SET
         name = CASE WHEN $7 THEN name ELSE $1 END,
         image_url = $2,
         meli_permalink = COALESCE($3, meli_permalink),
         active = true,
         sku = $4,
         inventory_sku = $4,
         sale_price = $5,
         meli_last_synced_at = NOW(),
         updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        data.name,
        data.image_url,
        data.meli_permalink,
        skuUpdate,
        nextPrice,
        productId,
        keepName,
      ]
    )
    await linkMeliItemToProduct(data.meli_item_id, productId)
    await query(
      'UPDATE meli_items SET seller_sku = $1 WHERE meli_item_id = $2',
      [normalizeSku(nextSku), data.meli_item_id]
    )
    return { product: rows[0], created: false }
  }

  if (isGeneratedSku(data.sku)) {
    return { product: null, created: false, skipped: true, reason: 'no_sku_on_listing' }
  }

  const { rows } = await query(
    `INSERT INTO products (
       name, sku, description, category, purchase_price, sale_price,
       stock_quantity, min_stock, unit, image_url, meli_permalink,
       inventory_sku, meli_last_synced_at, active, external_ids
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),$13,$14)
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
      data.meli_permalink,
      data.sku,
      data.active,
      JSON.stringify({ meli: [data.meli_item_id] }),
    ]
  )

  await linkMeliItemToProduct(data.meli_item_id, rows[0].id)
  await query(
    'UPDATE meli_items SET seller_sku = $1 WHERE meli_item_id = $2',
    [data.seller_sku, data.meli_item_id]
  )
  return { product: rows[0], created: true }
}

async function syncItemFromMeli(meliItemId, meliUserId) {
  const item = await meliFetch(`/items/${meliItemId}`, {}, meliUserId)
  return upsertProductFromMeliItem(item)
}

async function getListingsForProductSync(productId) {
  const productResult = await query('SELECT id, sku FROM products WHERE id = $1', [productId])
  const product = productResult.rows[0]
  if (!product) return []

  const sku = normalizeSku(product.sku)

  const { rows } = await query(
    `SELECT DISTINCT ON (meli_item_id) meli_item_id, price, status, listing_type_id, seller_sku
     FROM meli_items
     WHERE product_id = $1
        OR ($2 <> '' AND UPPER(TRIM(seller_sku)) = $2)
        OR ($2 <> '' AND product_id IN (
          SELECT id FROM products WHERE active = true AND UPPER(TRIM(sku)) = $2
        ))
     ORDER BY meli_item_id, (status = 'active') DESC`,
    [productId, sku]
  )

  if (!rows.length && sku) {
    const legacy = await query(
      'SELECT meli_item_id, sale_price AS price FROM products WHERE id = $1 AND meli_item_id IS NOT NULL',
      [productId]
    )
    if (legacy.rows[0]) {
      rows.push({
        meli_item_id: legacy.rows[0].meli_item_id,
        price: legacy.rows[0].price,
        status: 'active',
      })
    }
  }

  return rows.filter((r) => r.status === 'active' || r.status === 'paused')
}

async function syncStockToMeli(productId) {
  const productResult = await query(
    'SELECT id, name, stock_quantity, sale_price FROM products WHERE id = $1',
    [productId]
  )
  const product = productResult.rows[0]
  if (!product) return { skipped: true, reason: 'product_not_found' }

  const listings = await getListingsForProductSync(productId)
  if (!listings.length) return { skipped: true, reason: 'no_listings' }

  const results = []
  for (const listing of listings) {
    const payload = { available_quantity: product.stock_quantity }
    const price = Number(product.sale_price) > 0 ? Number(product.sale_price) : Number(listing.price)
    if (price > 0) payload.price = price

    try {
      await meliFetch(`/items/${listing.meli_item_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (payload.price) {
        await query(
          'UPDATE meli_items SET available_quantity = $1, price = $2, synced_at = NOW() WHERE meli_item_id = $3',
          [product.stock_quantity, payload.price, listing.meli_item_id]
        )
      } else {
        await query(
          'UPDATE meli_items SET available_quantity = $1, synced_at = NOW() WHERE meli_item_id = $2',
          [product.stock_quantity, listing.meli_item_id]
        )
      }

      await query(
        'UPDATE meli_items SET product_id = $1 WHERE meli_item_id = $2 AND product_id IS NULL',
        [productId, listing.meli_item_id]
      )

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
     WHERE p.id = sub.product_id
       AND p.meli_last_synced_at IS NULL`
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
  getListingsForProductSync,
  importUserItems,
  upsertProductFromMeliItem,
  reconcileStockFromMeliItems,
  maybeNotifyLowStock,
  meliSkuFromItem,
  extractSellerSkuFromMeliItem,
  getMeliItemImageUrl,
  isMarketplaceListing,
}
