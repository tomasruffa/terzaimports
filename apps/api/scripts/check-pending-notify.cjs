require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const pg = require('pg')

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:DrZNtiCTmmfkEaLfVFjEeskbyELLXgED@altaria.proxy.rlwy.net:46291/railway'

async function main() {
  const url = new URL(connectionString)
  const client = new pg.Client({
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  const orders = await client.query(
    `SELECT meli_order_id, buyer_nickname, status, total_amount, date_created, synced_at, sale_id
     FROM meli_orders ORDER BY date_created DESC LIMIT 5`
  )
  console.log('Latest ML orders:')
  console.table(orders.rows)

  const sales = await client.query(
    `SELECT customer_name, total_amount, sale_date, kapso_notified_at
     FROM sales ORDER BY sale_date DESC LIMIT 5`
  )
  console.log('Latest sales:')
  console.table(sales.rows)

  const pending = await client.query(
    `SELECT id, customer_name, sale_date
     FROM sales
     WHERE status = 'completed'
       AND kapso_notified_at IS NULL
       AND sale_date >= NOW() - INTERVAL '72 hours'
     ORDER BY sale_date DESC`
  )
  console.log('Pending Kapso notify:', pending.rows)

  await client.end()
}

main()
