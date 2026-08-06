require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { meliFetch, getTokenRow } = require('../src/lib/meli')
const { fetchAllItemIds } = require('../src/lib/meli-data-sync')

async function main() {
  const token = await getTokenRow()
  const userId = token.meli_user_id
  const ids = await fetchAllItemIds(userId, ['active', 'paused', 'under_review'])

  for (const id of ids) {
    const item = await meliFetch(`/items/${id}`, {}, userId)
    const isMp = item.domain_id === 'MLA-MERCADO_PAGO' || item.category_id === 'MLA458068'
    const channels = (item.channels || []).join(',')
    console.log([
      id.replace('MLA', '#'),
      item.status,
      item.domain_id,
      item.category_id,
      channels,
      isMp ? '← MP (no ML publicación)' : 'ML listing',
      (item.title || '').slice(0, 35),
    ].join(' | '))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
