require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { query, getPool } = require('../src/lib/db')
const { linkMeliItemToProduct } = require('../src/lib/product-consolidation')

async function main() {
  const { rows } = await query(
    `SELECT id, sku, name, active FROM products
     WHERE id = $1 OR UPPER(TRIM(sku)) = $2`,
    ['da4476da-8bca-46ab-873e-1631c6b0a060', 'TRZ-WAYGEN2-TRANSITION-MATTE']
  )
  console.table(rows)

  const correct = rows.find((r) => r.sku === 'TRZ-WAYGEN2-TRANSITION-MATTE' && r.active)
  if (correct) {
    await linkMeliItemToProduct('MLA1921818249', correct.id)
    console.log('Linked MLA1921818249 to', correct.id)
  }

  const { rows: mi } = await query(
    'SELECT meli_item_id, product_id FROM meli_items WHERE meli_item_id = $1',
    ['MLA1921818249']
  )
  console.table(mi)

  await getPool().end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
