require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const pg = require('pg')

const MELI_ITEM_ID = process.argv[2] || 'MLA3552607452'
const url = new URL(
  process.env.DATABASE_URL ||
    'postgresql://postgres:DrZNtiCTmmfkEaLfVFjEeskbyELLXgED@altaria.proxy.rlwy.net:46291/railway'
)

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

  const p = await client.query(
    `SELECT id, name, sku, stock_quantity, meli_item_id, active, meli_last_synced_at
     FROM products WHERE meli_item_id = $1`,
    [MELI_ITEM_ID]
  )
  console.log('Product:', p.rows[0] || null)

  const mi = await client.query(
    `SELECT meli_item_id, title, status, available_quantity, sold_quantity, product_id, synced_at
     FROM meli_items WHERE meli_item_id = $1`,
    [MELI_ITEM_ID]
  )
  console.log('Meli item:', mi.rows[0] || null)

  if (p.rows[0]) {
    const sm = await client.query(
      `SELECT type, quantity, reason, channel, reference, created_at
       FROM stock_movements WHERE product_id = $1 ORDER BY created_at DESC LIMIT 15`,
      [p.rows[0].id]
    )
    console.log('Stock movements:', sm.rows)

    const si = await client.query(
      `SELECT si.quantity, s.sale_date, s.customer_name, s.channel, s.status
       FROM sale_items si JOIN sales s ON s.id = si.sale_id
       WHERE si.product_id = $1 ORDER BY s.sale_date DESC`,
      [p.rows[0].id]
    )
    console.log('Linked sales:', si.rows)
  }

  await client.end()
}

main()
