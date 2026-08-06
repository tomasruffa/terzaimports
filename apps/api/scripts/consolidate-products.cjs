require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { consolidateDuplicateProducts } = require('../src/lib/product-consolidation')
const { getPool } = require('../src/lib/db')

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const { results, cleanup } = await consolidateDuplicateProducts({ dryRun })
  console.log(JSON.stringify({ results, cleanup }, null, 2))

  if (!dryRun) {
    const { rows } = await getPool().query(
      `SELECT p.id, p.name, p.sku, p.stock_quantity, p.external_ids,
         (SELECT COUNT(*)::int FROM meli_items mi WHERE mi.product_id = p.id) AS listings
       FROM products p WHERE active = true ORDER BY p.sku`
    )
    console.log('\nActive products after consolidate:')
    console.table(rows)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
