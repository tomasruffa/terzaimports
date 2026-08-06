require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { query, getPool } = require('../src/lib/db')

const SKUS = [
  'TRZ-WAYGEN2-POLARIZED-MATTE',
  'TRZ-WAYGEN2-TRANSITION-MATTE',
  'TRZ-OAKLEY-VANGUARD-PRZSAPH',
  'TRZ-KYLIE-POLARIZED-NG',
]

async function main() {
  for (const sku of SKUS) {
    console.log('\n========', sku, '========')
    const { rows: products } = await query(
      `SELECT id, name, sku, stock_quantity, active FROM products
       WHERE UPPER(TRIM(sku)) = $1 ORDER BY active DESC`,
      [sku.toUpperCase()]
    )
    console.log('Products:', products.length)
    for (const p of products) {
      console.log('  product:', p.id, p.name.slice(0, 50), 'active:', p.active, 'stock:', p.stock_quantity)
      const { rows: items } = await query(
        `SELECT meli_item_id, title, price, status, listing_type_id, seller_sku,
                raw->>'user_product_id' AS up,
                raw->>'family_name' AS family_name,
                raw->>'family_id' AS family_id,
                raw->>'catalog_product_id' AS catalog_product_id
         FROM meli_items WHERE product_id = $1
         ORDER BY raw->>'user_product_id', price`,
        [p.id]
      )
      console.log('  meli_items:', items.length)
      for (const it of items) {
        console.log(
          `    ${it.meli_item_id.replace('MLA', '#')} | $${it.price} | ${it.listing_type_id} | up=${it.up} | family=${(it.family_name || '').slice(0, 40)}`
        )
      }
    }

    // Also find meli_items with this seller_sku not linked to product
    const { rows: orphan } = await query(
      `SELECT meli_item_id, product_id, price, listing_type_id,
              raw->>'user_product_id' AS up
       FROM meli_items
       WHERE UPPER(TRIM(seller_sku)) = $1
       ORDER BY meli_item_id`,
      [sku.toUpperCase()]
    )
    const orphans = orphan.filter((r) => !products.some((p) => p.id === r.product_id))
    if (orphans.length) {
      console.log('  ORPHAN/unlinked items with SKU:', orphans.length)
      orphans.forEach((o) => console.log('   ', o.meli_item_id, 'product_id:', o.product_id))
    }
  }

  await getPool().end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
