require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const pg = require('pg')
const { normalizeSku } = require('../src/lib/product-consolidation')

const url = new URL(process.env.DATABASE_URL)
if (!url.hostname) throw new Error('DATABASE_URL is required')

async function main() {
  const client = new pg.Client({
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  const { rows } = await client.query(
    `SELECT mi.meli_item_id, mi.seller_sku, mi.title, mi.price, mi.listing_type_id,
            mi.available_quantity, mi.product_id, p.sku, p.stock_quantity
     FROM meli_items mi
     LEFT JOIN products p ON p.id = mi.product_id
     ORDER BY mi.seller_sku, mi.meli_item_id`
  )

  const groups = new Map()
  for (const row of rows) {
    const sku = normalizeSku(row.seller_sku) || normalizeSku(row.sku)
    if (!sku) continue
    if (!groups.has(sku)) groups.set(sku, [])
    groups.get(sku).push(row)
  }

  for (const [sku, items] of groups) {
    if (items.length < 2) continue
    console.log(`\n--- ${sku} (${items.length} publicaciones) ---`)
    for (const i of items) {
      console.log(
        `  ${i.meli_item_id} | $${i.price} | stock ML:${i.available_quantity} admin:${i.stock_quantity} | ${i.listing_type_id}`
      )
    }
  }

  await client.end()
}

main()
