require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { getPool } = require('../src/lib/db')
const { meliFetch, getTokenRow } = require('../src/lib/meli')
const { upsertItem } = require('../src/lib/meli-repository')
const { syncItemFromMeli } = require('../src/lib/meli-sync')

const MISSING = ['MLA1908178311', 'MLA1921818249']

async function main() {
  const token = await getTokenRow()
  const userId = token.meli_user_id

  for (const itemId of MISSING) {
    console.log('Syncing', itemId)
    const item = await meliFetch(`/items/${itemId}`, {}, userId)
    await upsertItem(item, userId)
    const result = await syncItemFromMeli(itemId, userId)
    console.log('  result:', result?.skipped ? 'skipped' : 'ok', result?.product?.sku)
  }

  await getPool().end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
