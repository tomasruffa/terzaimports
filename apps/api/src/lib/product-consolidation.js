const { query, getPool } = require('./db')

function productFingerprint(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b\d+\s*x\b/gi, '')
    .replace(/\b\d+\s*cuotas?\b/gi, '')
    .replace(/\bsin\s*interes\b/gi, '')
    .replace(/\bmercado\s*pago\b/gi, '')
    .replace(/\bfree\b/gi, '')
    .replace(/\bgold\b/gi, '')
    .replace(/\bclasic[ao]\b/gi, '')
    .replace(/\bspecial\b/gi, '')
    .replace(/\bpro\b/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function inventorySkuFromFingerprint(fingerprint) {
  const words = fingerprint
    .split(' ')
    .filter((w) => w.length > 2 && !['gafas', 'anteojos', 'sol', 'de', 'meta', 'gen'].includes(w))
    .slice(0, 5)

  const base = words.length ? words.join('-') : fingerprint.slice(0, 40)
  return `INV-${base.toUpperCase().replace(/[^A-Z0-9-]/g, '-').replace(/-+/g, '-')}`.slice(0, 90)
}

function listingLabel(item) {
  const type = item.listing_type_id || ''
  if (type.includes('gold_pro')) return '3-6 cuotas'
  if (type.includes('gold_special')) return '1 cuota'
  if (type.includes('free')) return 'Gratis'
  return type || 'ML'
}

async function findProductByInventorySku(inventorySku) {
  const { rows } = await query(
    'SELECT * FROM products WHERE inventory_sku = $1 AND active = true LIMIT 1',
    [inventorySku]
  )
  return rows[0] ?? null
}

async function getMeliListingsForProduct(productId) {
  const { rows } = await query(
    `SELECT meli_item_id, title, price, status, listing_type_id, available_quantity, permalink, thumbnail
     FROM meli_items WHERE product_id = $1 ORDER BY price ASC`,
    [productId]
  )
  return rows.map((row) => ({ ...row, listing_label: listingLabel(row) }))
}

async function linkMeliItemToProduct(meliItemId, productId) {
  await query('UPDATE meli_items SET product_id = $1 WHERE meli_item_id = $2', [productId, meliItemId])
  await query(
    'UPDATE products SET meli_item_id = NULL, updated_at = NOW() WHERE meli_item_id = $1 AND id <> $2',
    [meliItemId, productId]
  )
}

async function consolidateDuplicateProducts({ dryRun = false } = {}) {
  const { rows: items } = await query(
    `SELECT mi.meli_item_id, mi.title, mi.price, mi.listing_type_id, mi.available_quantity,
            mi.product_id, mi.status, p.id AS pid, p.name, p.stock_quantity, p.inventory_sku
     FROM meli_items mi
     LEFT JOIN products p ON p.id = mi.product_id
     ORDER BY mi.title`
  )

  const groups = new Map()
  for (const row of items) {
    const fp = productFingerprint(row.title)
    if (!groups.has(fp)) groups.set(fp, [])
    groups.get(fp).push(row)
  }

  const results = []

  for (const [fingerprint, group] of groups) {
    if (group.length < 2) continue

    const inventorySku = inventorySkuFromFingerprint(fingerprint)
    const productIds = [...new Set(group.map((g) => g.product_id).filter(Boolean))]

    const canonicalId =
      group.find((g) => g.inventory_sku === inventorySku)?.product_id ||
      productIds[0]

    if (!canonicalId) continue

    const duplicateIds = productIds.filter((id) => id !== canonicalId)
    const stock = Math.max(
      ...group.map((g) => Number(g.stock_quantity) || Number(g.available_quantity) || 0)
    )

    const action = {
      fingerprint,
      inventory_sku: inventorySku,
      canonical_id: canonicalId,
      duplicate_ids: duplicateIds,
      listings: group.map((g) => g.meli_item_id),
      stock,
    }

    if (!dryRun) {
      const client = await getPool().connect()
      try {
        await client.query('BEGIN')

        await client.query(
          'UPDATE products SET inventory_sku = $1, stock_quantity = $2, updated_at = NOW() WHERE id = $3',
          [inventorySku, stock, canonicalId]
        )

        for (const meliItemId of action.listings) {
          await client.query(
            'UPDATE meli_items SET product_id = $1 WHERE meli_item_id = $2',
            [canonicalId, meliItemId]
          )
        }

        for (const dupId of duplicateIds) {
          await client.query(
            'UPDATE sale_items SET product_id = $1 WHERE product_id = $2',
            [canonicalId, dupId]
          )
          await client.query(
            'UPDATE stock_movements SET product_id = $1 WHERE product_id = $2',
            [canonicalId, dupId]
          )
          await client.query(
            `UPDATE products SET active = false, meli_item_id = NULL, inventory_sku = NULL, updated_at = NOW()
             WHERE id = $1`,
            [dupId]
          )
        }

        await client.query(
          'UPDATE products SET meli_item_id = NULL WHERE id = $1',
          [canonicalId]
        )

        await client.query('COMMIT')
        action.merged = true
      } catch (err) {
        await client.query('ROLLBACK')
        action.error = err.message
      } finally {
        client.release()
      }
    }

    results.push(action)
  }

  return results
}

module.exports = {
  productFingerprint,
  inventorySkuFromFingerprint,
  listingLabel,
  findProductByInventorySku,
  getMeliListingsForProduct,
  linkMeliItemToProduct,
  consolidateDuplicateProducts,
}
