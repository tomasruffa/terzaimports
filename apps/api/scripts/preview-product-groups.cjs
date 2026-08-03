require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const pg = require('pg')

const url = new URL(
  process.env.DATABASE_URL ||
    'postgresql://postgres:DrZNtiCTmmfkEaLfVFjEeskbyELLXgED@altaria.proxy.rlwy.net:46291/railway'
)

function productFingerprint(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b\d+\s*x\b/gi, '')
    .replace(/\b\d+\s*cuotas?\b/gi, '')
    .replace(/\bsin\s*interes\b/gi, '')
    .replace(/\bmercado\s*pago\b/gi, '')
    .replace(/\bfree\b/gi, '')
    .replace(/\bgold\b/gi, '')
    .replace(/\bclasic[ao]\b/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

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
    `SELECT mi.meli_item_id, mi.title, mi.price, mi.listing_type_id, mi.available_quantity,
            mi.product_id, p.sku, p.stock_quantity
     FROM meli_items mi
     LEFT JOIN products p ON p.id = mi.product_id
     ORDER BY mi.title`
  )

  const groups = new Map()
  for (const row of rows) {
    const fp = productFingerprint(row.title)
    if (!groups.has(fp)) groups.set(fp, [])
    groups.get(fp).push(row)
  }

  for (const [fp, items] of groups) {
    if (items.length < 2) continue
    console.log('\n---', fp, `(${items.length} publicaciones) ---`)
    for (const i of items) {
      console.log(`  ${i.meli_item_id} | $${i.price} | stock ML:${i.available_quantity} admin:${i.stock_quantity} | ${i.listing_type_id}`)
    }
  }

  await client.end()
}

main()
