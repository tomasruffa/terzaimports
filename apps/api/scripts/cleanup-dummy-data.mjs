/**
 * Elimina productos demo del seed inicial y movimientos huérfanos.
 * No borra productos vinculados a Mercado Libre ni con ventas registradas.
 */
import pg from 'pg'

const SEED_SKUS = [
  'RB-META-WF-POL',
  'RB-META-WF-TRANS',
  'OAK-META-VANGUARD',
  'KYLIE-META-STAR',
  'DJI-MIC-MINI',
]

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
  console.log('Connected — cleaning dummy catalog data...')

  try {
    await client.query('BEGIN')

    const candidates = await client.query(
      `SELECT p.id, p.sku, p.name
       FROM products p
       WHERE p.sku = ANY($1::text[])
         AND p.meli_item_id IS NULL
         AND NOT EXISTS (SELECT 1 FROM sale_items si WHERE si.product_id = p.id)`,
      [SEED_SKUS]
    )

    const ids = candidates.rows.map((r) => r.id)
    console.log(`Found ${ids.length} seed products to remove`)

    if (ids.length) {
      await client.query('DELETE FROM stock_movements WHERE product_id = ANY($1::uuid[])', [ids])
      await client.query('DELETE FROM products WHERE id = ANY($1::uuid[])', [ids])
    }

    // Productos importados de ML sin ventas ni publicación activa en meli_items
    const dupes = await client.query(
      `DELETE FROM products p
       WHERE p.category = 'Mercado Libre'
         AND p.meli_item_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM sale_items si WHERE si.product_id = p.id)
         AND NOT EXISTS (
           SELECT 1 FROM meli_items mi
           WHERE mi.meli_item_id = p.meli_item_id AND mi.status = 'active'
         )
       RETURNING p.id, p.name`
    )
    console.log(`Removed ${dupes.rowCount} inactive ML duplicates without sales`)

    await client.query('COMMIT')
    console.log('Cleanup complete')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
