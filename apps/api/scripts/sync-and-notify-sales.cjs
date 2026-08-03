require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { syncOrders } = require('../src/lib/meli-data-sync')
const { notifyPendingSales } = require('../src/lib/sales')
const { getTokenRow } = require('../src/lib/meli')

async function main() {
  const tokenRow = await getTokenRow()
  if (!tokenRow) throw new Error('No ML token in database')

  console.log('Syncing recent ML orders...')
  const orders = await syncOrders(tokenRow.meli_user_id)
  console.log('Orders sync:', orders)

  console.log('Notifying pending sales...')
  const notifications = await notifyPendingSales({ hours: 72 })
  console.log('Notifications:', JSON.stringify(notifications, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
