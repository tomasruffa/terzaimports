const { query, getPool } = require('./db')

function normalizeSku(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
}

function listingLabel(item) {
  const raw = item.raw || item
  const type = item.listing_type_id || raw.listing_type_id || ''
  const tags = raw.tags || []
  const campaign =
    raw.sale_terms?.find((t) => t.id === 'INSTALLMENTS_CAMPAIGN')?.value_name ||
    tags.find((t) => /^\d+x_campaign$/.test(t) || t === 'pcj-co-funded')

  if (campaign === '3x_campaign' || tags.includes('3x_campaign')) return '3 cuotas'
  if (campaign === '6x_campaign' || tags.includes('6x_campaign')) return '6 cuotas'
  if (campaign === '12x_campaign' || tags.includes('12x_campaign')) return '12 cuotas'
  if (campaign === 'pcj-co-funded') return '3 a 12 cuotas'
  if (type.includes('gold_special')) return 'Sin cuotas'
  if (type.includes('gold_pro')) return '6 cuotas'
  if (type.includes('free')) return 'Gratis'
  return type || 'ML'
}

function isGeneratedSku(sku) {
  const normalized = normalizeSku(sku)
  return normalized.startsWith('INV-') || normalized.startsWith('MELI-') || normalized.startsWith('MLA')
}

async function findProductBySku(sku, { activeOnly = true } = {}) {
  const normalized = normalizeSku(sku)
  if (!normalized) return null

  const activeClause = activeOnly ? 'AND active = true' : ''
  const { rows } = await query(
    `SELECT * FROM products
     WHERE UPPER(TRIM(sku)) = $1 ${activeClause}
     ORDER BY active DESC, updated_at DESC
     LIMIT 1`,
    [normalized]
  )
  return rows[0] ?? null
}

async function addMeliIdToProduct(productId, meliItemId) {
  const { rows } = await query('SELECT external_ids FROM products WHERE id = $1', [productId])
  const current = rows[0]?.external_ids || {}
  const meliList = Array.isArray(current.meli) ? current.meli : current.meli ? [current.meli] : []
  if (!meliList.includes(meliItemId)) {
    meliList.push(meliItemId)
  }
  await query(
    'UPDATE products SET external_ids = $1, updated_at = NOW() WHERE id = $2',
    [JSON.stringify({ ...current, meli: meliList }), productId]
  )
}

async function getMeliListingsForProduct(productId) {
  const { rows } = await query(
    `SELECT meli_item_id, title, price, status, listing_type_id, available_quantity, permalink, thumbnail, seller_sku, raw
     FROM meli_items WHERE product_id = $1 ORDER BY price ASC`,
    [productId]
  )
  return rows.map((row) => ({ ...row, listing_label: listingLabel(row) }))
}

function buildPublicationGroupsFromItems(items) {
  const groups = new Map()

  for (const row of items) {
    const raw = row.raw || {}
    const up = raw.user_product_id
    const familyId = raw.family_id
    const key = up || (familyId ? `family:${familyId}` : row.meli_item_id)
    const family = raw.family_name || row.title

    if (!groups.has(key)) {
      groups.set(key, {
        user_product_id: up || null,
        family_id: familyId || null,
        family_name: family,
        title: row.title,
        listings: [],
      })
    }

    const group = groups.get(key)
    if (family && family.length > (group.family_name?.length || 0)) {
      group.family_name = family
    }

    group.listings.push({
      meli_item_id: row.meli_item_id,
      title: row.title,
      price: Number(row.price) || 0,
      status: row.status,
      listing_label: listingLabel(row),
      listing_type_id: row.listing_type_id,
      available_quantity: row.available_quantity,
      permalink: row.permalink,
      thumbnail: row.thumbnail,
    })
  }

  return Array.from(groups.values()).map((g) => ({
    ...g,
    meli_item_ids: g.listings.map((l) => l.meli_item_id),
    listings_count: g.listings.length,
    is_variant_group: g.listings.length > 1,
  }))
}

async function getMeliPublicationGroupsForProduct(productId) {
  const { rows } = await query(
    `SELECT meli_item_id, title, price, status, listing_type_id, available_quantity,
            permalink, thumbnail, seller_sku, raw
     FROM meli_items WHERE product_id = $1 ORDER BY price ASC`,
    [productId]
  )
  return buildPublicationGroupsFromItems(rows)
}

async function getMeliPublicationGroupsForProducts(productIds) {
  if (!productIds.length) return new Map()

  const { rows } = await query(
    `SELECT product_id, meli_item_id, title, price, status, listing_type_id,
            available_quantity, permalink, thumbnail, seller_sku, raw
     FROM meli_items WHERE product_id = ANY($1::uuid[])
     ORDER BY product_id, price ASC`,
    [productIds]
  )

  const itemsByProduct = new Map()
  for (const row of rows) {
    if (!itemsByProduct.has(row.product_id)) itemsByProduct.set(row.product_id, [])
    itemsByProduct.get(row.product_id).push(row)
  }

  const result = new Map()
  for (const [productId, items] of itemsByProduct) {
    result.set(productId, buildPublicationGroupsFromItems(items))
  }
  return result
}

async function linkMeliItemToProduct(meliItemId, productId) {
  await query('UPDATE meli_items SET product_id = $1 WHERE meli_item_id = $2', [productId, meliItemId])
  await query(
    'UPDATE products SET meli_item_id = NULL, updated_at = NOW() WHERE meli_item_id = $1 AND id <> $2',
    [meliItemId, productId]
  )
  await addMeliIdToProduct(productId, meliItemId)
}

async function mergeDuplicateProducts(canonicalId, duplicateIds, { stock, sku } = {}) {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')

    if (sku) {
      await client.query(
        'UPDATE products SET sku = $1, inventory_sku = $1, updated_at = NOW() WHERE id = $2',
        [sku, canonicalId]
      )
    }

    if (stock != null) {
      await client.query(
        'UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2',
        [stock, canonicalId]
      )
    }

    for (const dupId of duplicateIds) {
      await client.query('UPDATE sale_items SET product_id = $1 WHERE product_id = $2', [canonicalId, dupId])
      await client.query('UPDATE stock_movements SET product_id = $1 WHERE product_id = $2', [canonicalId, dupId])
      await client.query(
        `UPDATE products SET active = false, meli_item_id = NULL, inventory_sku = NULL, updated_at = NOW()
         WHERE id = $1`,
        [dupId]
      )
    }

    await client.query('UPDATE products SET meli_item_id = NULL WHERE id = $1', [canonicalId])
    await client.query('COMMIT')
    return true
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function cleanupOrphanProducts() {
  const { rowCount } = await query(
    `UPDATE products SET active = false, updated_at = NOW()
     WHERE active = true
       AND NOT EXISTS (SELECT 1 FROM meli_items mi WHERE mi.product_id = products.id)
       AND (
         sku LIKE 'MLA%' OR sku LIKE 'INV-%' OR sku LIKE 'MELI-%'
         OR inventory_sku LIKE 'INV-%'
       )`
  )
  return { deactivated: rowCount }
}

/** Propaga el SKU del User Product a todas las sub-publicaciones del grupo. */
async function inheritSkuFromUserProducts() {
  const { rows } = await query(
    `SELECT meli_item_id, seller_sku, raw FROM meli_items
     WHERE raw->>'user_product_id' IS NOT NULL`
  )

  const groups = new Map()
  for (const row of rows) {
    const up = row.raw?.user_product_id
    if (!up) continue
    if (!groups.has(up)) groups.set(up, [])
    groups.get(up).push(row)
  }

  let updated = 0
  for (const [, items] of groups) {
    let sku = null
    for (const item of items) {
      if (item.seller_sku && !isGeneratedSku(item.seller_sku)) {
        sku = normalizeSku(item.seller_sku)
        break
      }
      const attr = item.raw?.attributes?.find((a) => a.id === 'SELLER_SKU')
      if (attr?.value_name) {
        sku = normalizeSku(attr.value_name)
        break
      }
      if (item.raw?.seller_custom_field) {
        sku = normalizeSku(item.raw.seller_custom_field)
        break
      }
    }
    if (!sku || isGeneratedSku(sku)) continue

    for (const item of items) {
      if (normalizeSku(item.seller_sku) !== sku) {
        await query('UPDATE meli_items SET seller_sku = $1 WHERE meli_item_id = $2', [sku, item.meli_item_id])
        updated += 1
      }
    }
  }

  return { updated }
}

async function pickCanonicalName(group, sku = '') {
  const ids = group.map((g) => g.meli_item_id)
  const preferWayfarer = sku.includes('WAYGEN2')
  const { rows } = await query(
    `SELECT title FROM meli_items
     WHERE meli_item_id = ANY($1::text[])
     ORDER BY (status = 'active') DESC,
       CASE WHEN $2::boolean AND title ILIKE '%wayfarer%' THEN 0 ELSE 1 END,
       LENGTH(title) ASC
     LIMIT 1`,
    [ids, preferWayfarer]
  )
  return rows[0]?.title ?? null
}

async function consolidateProductsBySku({ dryRun = false } = {}) {
  const { rows: items } = await query(
    `SELECT mi.meli_item_id, mi.seller_sku, mi.product_id, mi.available_quantity, mi.status,
            p.id AS pid, p.sku, p.stock_quantity
     FROM meli_items mi
     LEFT JOIN products p ON p.id = mi.product_id`
  )

  const groups = new Map()
  for (const row of items) {
    const sku = normalizeSku(row.seller_sku) || normalizeSku(row.sku)
    if (!sku || isGeneratedSku(sku)) continue
    if (!groups.has(sku)) groups.set(sku, [])
    groups.get(sku).push(row)
  }

  const results = []

  for (const [sku, group] of groups) {
    const productIds = [...new Set(group.map((g) => g.product_id).filter(Boolean))]

    let canonicalId =
      group.find((g) => g.pid && normalizeSku(g.sku) === sku)?.pid ||
      productIds[0]

    if (!canonicalId) {
      const bySku = await findProductBySku(sku, { activeOnly: false })
      canonicalId = bySku?.id
    }

    if (!canonicalId) continue

    const duplicateIds = productIds.filter((id) => id !== canonicalId)
    const stock = Math.max(
      ...group.map((g) => Number(g.stock_quantity) || Number(g.available_quantity) || 0),
      0
    )

    const action = {
      sku,
      canonical_id: canonicalId,
      duplicate_ids: duplicateIds,
      listings: group.map((g) => g.meli_item_id),
      stock,
      listing_count: group.length,
    }

    const needsLink = group.some((g) => g.product_id !== canonicalId)
    const needsMerge = duplicateIds.length > 0
    const needsSkuUpdate = Boolean(sku && canonicalId)

    if (!dryRun && (needsLink || needsMerge || needsSkuUpdate)) {
      try {
        for (const meliItemId of action.listings) {
          await linkMeliItemToProduct(meliItemId, canonicalId)
          await query(
            'UPDATE meli_items SET seller_sku = $1 WHERE meli_item_id = $2',
            [sku, meliItemId]
          )
        }
        if (needsMerge) {
          await mergeDuplicateProducts(canonicalId, duplicateIds, { stock, sku })
        } else {
          const canonicalName = await pickCanonicalName(group, sku)
          await query(
            `UPDATE products SET
               sku = $1, inventory_sku = $1, stock_quantity = $2, active = true,
               name = COALESCE($4, name), updated_at = NOW()
             WHERE id = $3`,
            [sku, stock, canonicalId, canonicalName]
          )
        }
        action.merged = true
      } catch (err) {
        action.error = err.message
      }
    }

    results.push(action)
  }

  return results
}

/** Consolidación de productos — siempre por SKU (alias para compatibilidad). */
async function consolidateDuplicateProducts(options = {}) {
  const skuInheritance = options.dryRun
    ? { updated: 0 }
    : await inheritSkuFromUserProducts()
  const results = await consolidateProductsBySku(options)
  const cleanup = options.dryRun ? { deactivated: 0 } : await cleanupOrphanProducts()
  return { results, cleanup, sku_inheritance: skuInheritance }
}

module.exports = {
  normalizeSku,
  isGeneratedSku,
  listingLabel,
  findProductBySku,
  addMeliIdToProduct,
  getMeliListingsForProduct,
  getMeliPublicationGroupsForProduct,
  getMeliPublicationGroupsForProducts,
  linkMeliItemToProduct,
  cleanupOrphanProducts,
  inheritSkuFromUserProducts,
  consolidateProductsBySku,
  consolidateDuplicateProducts,
}
