require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { query, getPool } = require('../src/lib/db')
const { getTokenRow } = require('../src/lib/meli')
const { reconcileMeliCatalogFromApi } = require('../src/lib/meli-data-sync')
const { consolidateDuplicateProducts } = require('../src/lib/product-consolidation')

async function main() {
  const token = await getTokenRow()

  // Deactivate Terza products that were created from Mercado Pago items
  const { rows: mpProducts } = await query(
    `SELECT p.id, p.sku, p.name FROM products p
     WHERE p.active = true
       AND (
         p.sku LIKE 'MLA%'
         OR EXISTS (
           SELECT 1 FROM meli_items mi
           WHERE mi.product_id = p.id
             AND (mi.raw->>'domain_id' = 'MLA-MERCADO_PAGO' OR mi.category_id = 'MLA458068')
         )
       )`
  )
  if (mpProducts.length) {
    console.log('Desactivando productos Mercado Pago:', mpProducts)
    await query(
      `UPDATE products SET active = false, updated_at = NOW()
       WHERE id = ANY($1::uuid[])`,
      [mpProducts.map((p) => p.id)]
    )
  }

  console.log('Reconciliando solo publicaciones ML (marketplace)...')
  const result = await reconcileMeliCatalogFromApi(token.meli_user_id)
  console.log(JSON.stringify(result, null, 2))

  await consolidateDuplicateProducts()

  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM meli_items
     WHERE raw->>'domain_id' != 'MLA-MERCADO_PAGO' AND category_id != 'MLA458068'`
  )
  const { rows: active } = await query('SELECT COUNT(*)::int AS n FROM products WHERE active = true')
  console.log('meli_items marketplace:', rows[0].n, '| products activos:', active[0].n)

  await getPool().end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
