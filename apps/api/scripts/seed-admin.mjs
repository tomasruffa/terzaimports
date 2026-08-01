import bcrypt from 'bcryptjs'
import pg from 'pg'

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
const name = process.env.ADMIN_NAME || 'Admin'

if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables')
  process.exit(1)
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required')

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

  const passwordHash = await bcrypt.hash(password, 12)

  await client.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       name = EXCLUDED.name,
       updated_at = NOW()`,
    [email.toLowerCase().trim(), passwordHash, name]
  )

  console.log(`Admin user ready: ${email.toLowerCase().trim()}`)
  await client.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
