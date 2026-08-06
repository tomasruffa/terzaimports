require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { getTokenRow } = require('../src/lib/meli')
const { runFullSync } = require('../src/lib/meli-data-sync')
const { consolidateDuplicateProducts } = require('../src/lib/product-consolidation')
const { query, getPool } = require('../src/lib/db')

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  if (!dryRun) {
    const tokenRow = await getTokenRow()
    if (!tokenRow) throw new Error('No hay cuenta de Mercado Libre vinculada')

    console.log('Sincronizando publicaciones desde Mercado Libre...')
    const sync = await runFullSync(tokenRow.meli_user_id)
    console.log('Sync OK:', {
      items: sync.items,
      consolidation: sync.consolidation,
    })
  } else {
    const { results, cleanup } = await consolidateDuplicateProducts({ dryRun: true })
    console.log('Consolidación (dry-run):', results)
    console.log('Limpieza (dry-run):', cleanup)
    return
  }

  const { results, cleanup } = await consolidateDuplicateProducts()
  console.log('Consolidación:', results)
  console.log('Limpieza:', cleanup)

  const { rows } = await query(
    `SELECT p.sku, p.name, p.stock_quantity, p.sale_price, p.active,
       (SELECT COUNT(*)::int FROM meli_items mi WHERE mi.product_id = p.id) AS listings
     FROM products p
     WHERE p.active = true
     ORDER BY p.sku`
  )
  console.log('\nProductos activos:')
  console.table(rows)

  await getPool().end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
