require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { query, getPool } = require('../src/lib/db')
const { meliFetch, getTokenRow } = require('../src/lib/meli')
const { fetchAllItemIds } = require('../src/lib/meli-data-sync')

const GHOST_IDS = ['MLA3732067458', 'MLA1951923439']

async function main() {
  const token = await getTokenRow()
  const userId = token.meli_user_id

  console.log('=== API ML: items/search ===')
  const apiIds = await fetchAllItemIds(userId, ['active', 'paused', 'under_review'])
  console.log('Total en API:', apiIds.length)
  for (const id of GHOST_IDS) {
    console.log(id, 'en search?', apiIds.includes(id))
  }

  console.log('\n=== API ML: GET /items/{id} ===')
  for (const id of GHOST_IDS) {
    try {
      const item = await meliFetch(`/items/${id}`, {}, userId)
      console.log(id, '→ status:', item.status, 'seller:', item.seller_id, 'title:', item.title?.slice(0, 40))
    } catch (e) {
      console.log(id, '→ ERROR:', e.message)
    }
  }

  console.log('\n=== BASE DE DATOS ===')
  for (const id of GHOST_IDS) {
    const { rows: items } = await query('SELECT * FROM meli_items WHERE meli_item_id = $1', [id])
    const { rows: products } = await query(
      `SELECT id, sku, name, active FROM products
       WHERE sku = $1 OR external_ids::text ILIKE $2`,
      [id, `%${id}%`]
    )
    console.log('\n', id)
    console.log('meli_items:', items.length ? items[0] : 'none')
    console.log('products:', products)
  }

  await getPool().end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
