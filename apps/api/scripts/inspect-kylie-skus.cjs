require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { query, getPool } = require('../src/lib/db')
const { meliFetch, getTokenRow } = require('../src/lib/meli')

const IDS = ['MLA3627120028', 'MLA3668432464', 'MLA3668433510', 'MLA3668458832']

async function main() {
  const { rows } = await query(
    `SELECT meli_item_id, seller_sku, product_id, price, listing_type_id,
            raw->>'seller_custom_field' AS ml_field,
            raw->>'user_product_id' AS user_product_id
     FROM meli_items
     WHERE meli_item_id = ANY($1::text[])
     ORDER BY meli_item_id`,
    [IDS]
  )
  console.log('DB:')
  console.table(rows)

  const token = await getTokenRow()
  for (const id of IDS) {
    const item = await meliFetch(`/items/${id}`, {}, token.meli_user_id)
    console.log('\n---', id, '---')
    console.log({
      seller_custom_field: item.seller_custom_field,
      user_product_id: item.user_product_id,
      family_name: item.family_name,
      listing_type_id: item.listing_type_id,
      price: item.price,
      seller_sku_attr: item.attributes?.find((a) => a.id === 'SELLER_SKU')?.value_name,
    })
  }

  const up = rows[0]?.user_product_id
  if (up) {
    const search = await meliFetch(
      `/users/${token.meli_user_id}/items/search?user_product_id=${up}`,
      {},
      token.meli_user_id
    )
    console.log('\nSearch by user_product_id:', up, 'results:', search.results?.length)
  }

  await getPool().end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
