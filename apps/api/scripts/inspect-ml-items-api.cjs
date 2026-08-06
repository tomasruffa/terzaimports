require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { query, getPool } = require('../src/lib/db')
const { meliFetch, getTokenRow } = require('../src/lib/meli')

const IDS = [
  'MLA1813553417', 'MLA1908178051', 'MLA3649834870', 'MLA1908178311', // POL matte
  'MLA1813593879', 'MLA3552607452', 'MLA1866887463', 'MLA1873183863', 'MLA1873236021', 'MLA1921818249', // TRANS
]

async function main() {
  const token = await getTokenRow()
  for (const id of IDS) {
    try {
      const item = await meliFetch(`/items/${id}`, {}, token.meli_user_id)
      const sku = item.attributes?.find((a) => a.id === 'SELLER_SKU')?.value_name
      console.log('\n---', id.replace('MLA', '#'), '---')
      console.log({
        title: item.title?.slice(0, 50),
        price: item.price,
        status: item.status,
        listing_type_id: item.listing_type_id,
        user_product_id: item.user_product_id,
        family_name: item.family_name,
        family_id: item.family_id,
        catalog_product_id: item.catalog_product_id,
        seller_sku: sku,
        tags: item.tags?.filter((t) => t.includes('cuota') || t.includes('install') || t.includes('gold') || t.includes('campaign')),
        sale_terms: item.sale_terms?.map((t) => ({ id: t.id, name: t.name, value_name: t.value_name })),
      })
    } catch (e) {
      console.log(id, 'ERROR:', e.message)
    }
  }

  const { rows } = await query(
    `SELECT meli_item_id FROM meli_items WHERE meli_item_id = ANY($1::text[])`,
    [IDS]
  )
  console.log('\nIn DB:', rows.map((r) => r.meli_item_id))

  await getPool().end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
