require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { getPool } = require('../src/lib/db')
const { backfillMeliSales } = require('../src/lib/sales')
const { getTokenRow } = require('../src/lib/meli')

async function main() {
  const pool = getPool()
  await pool.query(
    `DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE channel = 'mercadolibre')`
  )
  await pool.query(
    `DELETE FROM stock_movements WHERE sale_id IN (SELECT id FROM sales WHERE channel = 'mercadolibre')`
  )
  await pool.query(`DELETE FROM sales WHERE channel = 'mercadolibre'`)
  await pool.query('UPDATE meli_orders SET sale_id = NULL')

  const tokenRow = await getTokenRow()
  if (!tokenRow) throw new Error('No ML token')

  const result = await backfillMeliSales(tokenRow.meli_user_id)
  console.log('Backfill:', result)

  const linked = await pool.query(
    'SELECT COUNT(*)::int AS linked FROM sale_items WHERE product_id IS NOT NULL'
  )
  console.log('Sale items linked to products:', linked.rows[0].linked)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
