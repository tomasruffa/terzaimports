require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { meliFetch, getTokenRow } = require('../src/lib/meli')

const STATUSES = ['active', 'paused', 'under_review', 'closed']

async function fetchIds(meliUserId, status) {
  const ids = []
  let offset = 0
  const limit = 50
  while (true) {
    const search = await meliFetch(
      `/users/${meliUserId}/items/search?status=${status}&limit=${limit}&offset=${offset}`,
      {},
      meliUserId
    )
    const batch = search.results || []
    ids.push(...batch)
    if (batch.length < limit) break
    offset += limit
    if (search.paging?.total != null && offset >= search.paging.total) break
  }
  return ids
}

async function main() {
  const token = await getTokenRow()
  const userId = token.meli_user_id
  const all = new Map()

  for (const status of STATUSES) {
    const ids = await fetchIds(userId, status)
    ids.forEach((id) => all.set(id, status))
  }

  console.log('Total API:', all.size)
  console.log('\nListado:')
  for (const [id, searchStatus] of all) {
    const item = await meliFetch(`/items/${id}`, {}, userId)
    const sku = item.attributes?.find((a) => a.id === 'SELLER_SKU')?.value_name || item.seller_custom_field || '-'
    const thumb = item.thumbnail || item.secure_thumbnail
    const pic = item.pictures?.[0]?.secure_url || item.pictures?.[0]?.url
    console.log([
      id.replace('MLA', '#'),
      item.status,
      searchStatus,
      sku,
      item.title.slice(0, 40),
      thumb ? 'thumb:ok' : 'thumb:MISS',
      pic ? 'pic:ok' : 'pic:MISS',
    ].join(' | '))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
