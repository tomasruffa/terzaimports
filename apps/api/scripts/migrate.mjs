import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbDir = path.join(__dirname, '..', 'db')

const files = ['schema.sql', 'seed.sql']

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }

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
  console.log('Connected to PostgreSQL')

  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dbDir, file), 'utf8')
      console.log(`Running ${file}...`)
      await client.query(sql)
      console.log(`OK ${file}`)
    }

    const { rows } = await client.query(
      'SELECT sku, name, stock_quantity, active FROM products ORDER BY name'
    )
    console.log(`Products in database: ${rows.length}`)
    rows.forEach(row => {
      console.log(`- ${row.sku}: ${row.name} (stock ${row.stock_quantity})`)
    })
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
