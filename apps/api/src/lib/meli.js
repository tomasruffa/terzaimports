const { query } = require('./db')

const MELI_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token'
const MELI_API_URL = 'https://api.mercadolibre.com'

const REFRESH_BUFFER_MS = 5 * 60 * 1000

function getClientCredentials() {
  return {
    clientId: process.env.MELI_CLIENT_ID,
    clientSecret: process.env.MELI_CLIENT_SECRET,
  }
}

function expiresAtFromToken(tokenJson) {
  return tokenJson.expires_in
    ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString()
    : null
}

async function getTokenRow(meliUserId) {
  if (meliUserId) {
    const { rows } = await query(
      'SELECT * FROM meli_tokens WHERE meli_user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [meliUserId]
    )
    return rows[0] ?? null
  }

  const { rows } = await query(
    'SELECT * FROM meli_tokens ORDER BY updated_at DESC LIMIT 1'
  )
  return rows[0] ?? null
}

async function saveTokens(meliUserId, tokenJson) {
  const expiresAt = expiresAtFromToken(tokenJson)

  await query('DELETE FROM meli_tokens WHERE meli_user_id = $1', [meliUserId])
  await query(
    `INSERT INTO meli_tokens (meli_user_id, access_token, refresh_token, expires_at, scope)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      meliUserId,
      tokenJson.access_token,
      tokenJson.refresh_token,
      expiresAt,
      tokenJson.scope ?? null,
    ]
  )

  return { meliUserId, expiresAt }
}

function tokenNeedsRefresh(row) {
  if (!row?.expires_at) return true
  return new Date(row.expires_at).getTime() - Date.now() < REFRESH_BUFFER_MS
}

async function refreshAccessToken(row) {
  const { clientId, clientSecret } = getClientCredentials()
  if (!clientId || !clientSecret) {
    throw new Error('MELI_CLIENT_ID o MELI_CLIENT_SECRET no configurados')
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: row.refresh_token,
  })

  const tokenRes = await fetch(MELI_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })

  const tokenJson = await tokenRes.json()
  if (!tokenRes.ok) {
    console.error('[meli] refresh error', tokenRes.status, tokenJson)
    throw new Error(tokenJson.message || tokenJson.error || 'refresh_failed')
  }

  const meliUserId = row.meli_user_id ?? tokenJson.user_id
  await saveTokens(meliUserId, tokenJson)
  return getTokenRow(meliUserId)
}

async function getValidAccessToken(meliUserId) {
  const row = await getTokenRow(meliUserId)
  if (!row) {
    throw new Error('No hay cuenta de Mercado Libre vinculada')
  }

  if (!tokenNeedsRefresh(row)) {
    return { accessToken: row.access_token, meliUserId: row.meli_user_id }
  }

  const refreshed = await refreshAccessToken(row)
  return { accessToken: refreshed.access_token, meliUserId: refreshed.meli_user_id }
}

async function refreshAllTokens() {
  const { rows } = await query('SELECT * FROM meli_tokens ORDER BY updated_at DESC')
  const results = []

  for (const row of rows) {
    try {
      if (tokenNeedsRefresh(row)) {
        await refreshAccessToken(row)
        results.push({ meli_user_id: row.meli_user_id, status: 'refreshed' })
      } else {
        results.push({ meli_user_id: row.meli_user_id, status: 'valid' })
      }
    } catch (err) {
      results.push({ meli_user_id: row.meli_user_id, status: 'error', error: err.message })
    }
  }

  return results
}

async function meliFetch(path, options = {}, meliUserId) {
  const { accessToken } = await getValidAccessToken(meliUserId)
  const url = path.startsWith('http') ? path : `${MELI_API_URL}${path}`

  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  })

  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }

  if (!res.ok) {
    const err = new Error(json?.message || json?.error || `Meli API ${res.status}`)
    err.status = res.status
    err.details = json
    throw err
  }

  return json
}

async function meliFetchBinary(path, options = {}, meliUserId) {
  const { accessToken } = await getValidAccessToken(meliUserId)
  const url = path.startsWith('http') ? path : `${MELI_API_URL}${path}`

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error(`Meli API ${res.status}`)
    err.status = res.status
    err.details = text
    throw err
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  return { buffer, contentType }
}

module.exports = {
  MELI_API_URL,
  MELI_TOKEN_URL,
  saveTokens,
  getTokenRow,
  getValidAccessToken,
  refreshAccessToken,
  refreshAllTokens,
  meliFetch,
  meliFetchBinary,
}
