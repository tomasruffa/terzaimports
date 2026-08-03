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
    ssl: url.hostname.includes('rlwy.net') ? { rejectUnauthorized: false } : undefined,
  })
  await client.connect()

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const sales = await client.query(
    `SELECT channel, customer_name, total_amount, status, sale_date, created_at
     FROM sales WHERE created_at >= $1 OR sale_date >= $1
     ORDER BY GREATEST(created_at, sale_date) DESC`,
    [since]
  )
  console.log('\n=== Sales last 24h ===')
  console.table(sales.rows)

  const orders = await client.query(
    `SELECT meli_order_id, status, buyer_nickname, total_amount, date_created, synced_at
     FROM meli_orders WHERE synced_at >= $1 OR date_created >= $1
     ORDER BY COALESCE(synced_at, date_created) DESC LIMIT 10`,
    [since]
  )
  console.log('\n=== ML orders last 24h ===')
  console.table(orders.rows)

  const movements = await client.query(
    `SELECT sm.type, sm.quantity, sm.reason, sm.channel, sm.created_at, p.name
     FROM stock_movements sm
     LEFT JOIN products p ON p.id = sm.product_id
     WHERE sm.created_at >= $1
     ORDER BY sm.created_at DESC LIMIT 10`,
    [since]
  )
  console.log('\n=== Stock movements last 24h ===')
  console.table(movements.rows)

  const notifCols = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'meli_notifications'`
  )
  const timeCol = notifCols.rows.find((r) =>
    ['received_at', 'created_at', 'processed_at'].includes(r.column_name)
  )?.column_name

  if (timeCol) {
    const notifs = await client.query(
      `SELECT notification_id, topic, resource, ${timeCol} AS at
       FROM meli_notifications ORDER BY ${timeCol} DESC LIMIT 10`
    )
    console.log('\n=== Recent ML webhooks ===')
    console.table(notifs.rows)
  }

  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
