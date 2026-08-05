require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { query, getPool } = require('../src/lib/db')
const { syncStockToMeli } = require('../src/lib/meli-sync')

const TRZ = [
  ['01c418d1-2bd6-4a66-9573-6c7784480492', 'TRZ-WAYGEN2-POLARIZED-MATTE'],
  ['ddc02919-da7b-4ad3-a565-dabddb76a321', 'TRZ-OAKLEY-VANGUARD-PRZSAPH'],
  ['3190767e-3575-4d4c-b4dc-02a84e7033c9', 'TRZ-WAYGEN2-TRANSITION-MATTE'],
  ['42633a67-addb-449c-93b2-49a3ae758a8f', 'TRZ-KYLIE-POLARIZED-NG'],
]

async function main() {
  for (const [id, sku] of TRZ) {
    await query(
      'UPDATE products SET sku = $1, active = true, updated_at = NOW() WHERE id = $2',
      [sku, id]
    )
    console.log('Updated SKU', sku)
  }

  await query(
    'UPDATE meli_items SET product_id = $1 WHERE meli_item_id = $2',
    ['3190767e-3575-4d4c-b4dc-02a84e7033c9', 'MLA3726688748']
  )
  console.log('Linked MLA3726688748 to transitions product')

  const syncResults = []
  for (const [id] of TRZ) {
    syncResults.push({ id, ...(await syncStockToMeli(id)) })
  }
  console.log('ML sync:', JSON.stringify(syncResults, null, 2))

  const { rows } = await query(
    `SELECT p.sku, p.active, p.stock_quantity, COUNT(mi.meli_item_id)::int AS listings
     FROM products p
     LEFT JOIN meli_items mi ON mi.product_id = p.id
     WHERE p.active = true
     GROUP BY p.id
     ORDER BY p.sku`
  )
  console.table(rows)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => getPool().end())
