require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { reconcileStockFromMeliItems } = require('../src/lib/meli-sync')
const { getPool } = require('../src/lib/db')

async function main() {
  const result = await reconcileStockFromMeliItems()
  console.log('Reconciled stock from meli_items:', result)

  const { rows } = await getPool().query(
    `SELECT p.meli_item_id, p.name, p.stock_quantity, mi.available_quantity
     FROM products p
     JOIN meli_items mi ON mi.meli_item_id = p.meli_item_id
     ORDER BY p.name`
  )
  console.table(rows)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
