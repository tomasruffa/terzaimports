import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbDir = path.join(__dirname, '..', 'db')

const files = ['schema.sql', 'seed.sql']

async function getClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required')

  const url = new URL(connectionString)
  return new pg.Client({
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    ssl: { rejectUnauthorized: false },
  })
}

async function main() {
  const client = await getClient()
  await client.connect()
  console.log('Connected to PostgreSQL')

  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dbDir, file), 'utf8')
      console.log(`Running ${file}...`)
      await client.query(sql)
      console.log(`OK ${file}`)
    }
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
