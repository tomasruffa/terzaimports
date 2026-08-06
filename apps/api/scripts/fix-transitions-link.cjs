require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { query, getPool } = require('../src/lib/db')
const { consolidateDuplicateProducts } = require('../src/lib/product-consolidation')

async function main() {
  // Publicación con SKU TRZ errado en ML (Graphite ≠ Wayfarer Transition Matte)
  await query(
    `UPDATE meli_items SET seller_sku = meli_item_id, product_id = NULL
     WHERE meli_item_id = 'MLA3726688748'`
  )

  const { results, cleanup } = await consolidateDuplicateProducts()
  console.log('Consolidación:', results)
  console.log('Limpieza:', cleanup)

  const { rows } = await query(
    `SELECT sku, name, stock_quantity,
       (SELECT COUNT(*)::int FROM meli_items mi WHERE mi.product_id = p.id) AS listings
     FROM products p WHERE active = true ORDER BY sku`
  )
  console.table(rows)
  await getPool().end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
