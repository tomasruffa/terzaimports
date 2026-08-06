require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { query, getPool } = require('../src/lib/db')
const { meliFetch, getTokenRow } = require('../src/lib/meli')

const STATUSES = ['active', 'paused', 'under_review', 'closed']

async function fetchIdsByStatus(meliUserId, status) {
  const ids = []
  let offset = 0
  const limit = 50
  while (true) {
    const search = await meliFetch(
      `/users/${meliUserId}/items/search?status=${status}&limit=${limit}&offset=${offset}`,
      {},
      meliUserId
    )
    const batch = search.results || []
    ids.push(...batch)
    if (batch.length < limit) break
    offset += limit
    if (search.paging?.total != null && offset >= search.paging.total) break
  }
  return ids
}

async function main() {
  const token = await getTokenRow()
  const userId = token.meli_user_id

  console.log('=== API MERCADOLIBRE (items/search) ===')
  console.log('Cuenta:', userId)

  const allIds = new Set()
  for (const status of STATUSES) {
    const ids = await fetchIdsByStatus(userId, status)
    console.log(`  ${status}: ${ids.length}`)
    ids.forEach((id) => allIds.add(id))
  }
  console.log(`  TOTAL únicos: ${allIds.size}`)

  const { rows: dbCount } = await query('SELECT COUNT(*)::int AS n FROM meli_items')
  const { rows: dbProducts } = await query('SELECT COUNT(*)::int AS n FROM products WHERE active = true')
  const { rows: dbWithSku } = await query(
    `SELECT COUNT(*)::int AS n FROM meli_items WHERE seller_sku IS NOT NULL AND seller_sku NOT LIKE 'MLA%'`
  )
  const { rows: dbMlaSku } = await query(
    `SELECT COUNT(*)::int AS n FROM meli_items WHERE seller_sku LIKE 'MLA%'`
  )

  console.log('\n=== BASE DE DATOS ===')
  console.log('  meli_items:', dbCount[0].n)
  console.log('  products activos:', dbProducts[0].n)
  console.log('  meli_items con SKU TRZ:', dbWithSku[0].n)
  console.log('  meli_items con SKU MLA (sin TRZ):', dbMlaSku[0].n)

  const missingInDb = [...allIds].filter(async () => false)
  const { rows: dbIds } = await query('SELECT meli_item_id FROM meli_items')
  const dbSet = new Set(dbIds.map((r) => r.meli_item_id))
  const notInDb = [...allIds].filter((id) => !dbSet.has(id))
  const inDbNotApi = [...dbSet].filter((id) => !allIds.has(id))

  console.log('\n=== DIFF ===')
  console.log('  En API pero no en DB:', notInDb.length)
  if (notInDb.length) console.log('   ', notInDb.join(', '))
  console.log('  En DB pero no en API (search):', inDbNotApi.length)
  if (inDbNotApi.length <= 20) console.log('   ', inDbNotApi.join(', '))

  await getPool().end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
