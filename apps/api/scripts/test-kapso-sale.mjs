import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createRequire } from 'module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

dotenv.config({ path: join(__dirname, '../../../.env') })

const { notifyAdmin, isConfigured } = require('../src/lib/kapso.js')

const channelLabels = {
  mercadolibre: 'Mercado Libre',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  presencial: 'Presencial',
}

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.DATABASE_PUBLIC_URL ||
    'postgresql://postgres:DrZNtiCTmmfkEaLfVFjEeskbyELLXgED@altaria.proxy.rlwy.net:46291/railway'

  if (!isConfigured()) {
    throw new Error('Kapso no configurado: faltan KAPSO_API_KEY, KAPSO_PHONE_NUMBER_ID o ADMIN_WHATSAPP_NUMBER')
  }

  const url = new URL(connectionString)
  const client = new pg.Client({
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    ssl: url.hostname.includes('railway') || url.hostname.includes('rlwy.net')
      ? { rejectUnauthorized: false }
      : undefined,
  })

  await client.connect()

  const { rows } = await client.query(`
    SELECT s.*,
      COALESCE(
        json_agg(
          json_build_object(
            'description', si.description,
            'quantity', si.quantity,
            'unit_price', si.unit_price
          )
        ) FILTER (WHERE si.id IS NOT NULL),
        '[]'
      ) AS items
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    GROUP BY s.id
    ORDER BY s.sale_date DESC
    LIMIT 1
  `)

  await client.end()

  const sale = rows[0]
  if (!sale) throw new Error('No hay ventas en la base de datos')

  const items = (sale.items || [])
    .map(
      (i) =>
        `  • ${i.quantity}x ${i.description} — $${Number(i.unit_price).toLocaleString('es-AR')}`
    )
    .join('\n')

  const fecha = new Date(sale.sale_date).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  })

  const msg =
    `🛍️ Venta registrada (prueba Kapso)\n\n` +
    `Canal: ${channelLabels[sale.channel] || sale.channel}\n` +
    `Cliente: ${sale.customer_name || sale.customer_contact || '—'}\n` +
    `Total: $${Number(sale.total_amount).toLocaleString('es-AR')} ${sale.currency_id}\n` +
    `Estado: ${sale.status}\n` +
    `Fecha: ${fecha}\n\n` +
    `Ítems:\n${items || '  —'}`

  console.log(`Enviando a ${process.env.ADMIN_WHATSAPP_NUMBER}...`)
  console.log('---')
  console.log(msg)
  console.log('---')

  const result = await notifyAdmin(msg)
  console.log('Kapso response:', JSON.stringify(result, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
