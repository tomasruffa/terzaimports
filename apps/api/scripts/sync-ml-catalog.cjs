require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { getPool } = require('../src/lib/db')
const { getTokenRow } = require('../src/lib/meli')
const { reconcileMeliCatalogFromApi } = require('../src/lib/meli-data-sync')
const { consolidateDuplicateProducts } = require('../src/lib/product-consolidation')

async function main() {
  const token = await getTokenRow()
  if (!token) throw new Error('No hay cuenta ML vinculada')

  console.log('Reconciliando catálogo desde MercadoLibre...')
  const result = await reconcileMeliCatalogFromApi(token.meli_user_id)
  console.log(JSON.stringify(result, null, 2))

  const { results, cleanup } = await consolidateDuplicateProducts()
  console.log('Consolidación:', results.length, 'grupos, cleanup:', cleanup)

  const { query } = require('../src/lib/db')
  const { rows } = await query(
    `SELECT COUNT(*)::int AS meli_items,
       COUNT(*) FILTER (WHERE thumbnail LIKE '%mlstatic%')::int AS con_imagen_ml
     FROM meli_items`
  )
  console.log('DB meli_items:', rows[0])

  await getPool().end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
