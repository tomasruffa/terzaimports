const express = require('express')
const { query } = require('../lib/db')

const router = express.Router()

const MELI_AUTH_URL = 'https://auth.mercadolibre.com.ar/authorization'
const MELI_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token'
const MELI_API_URL = 'https://api.mercadolibre.com'

/** URI que debe coincidir exactamente con la app en developers.mercadolibre.com */
function getRedirectUri() {
  if (process.env.MELI_REDIRECT_URI) {
    return process.env.MELI_REDIRECT_URI.replace(/\/$/, '')
  }
  const base = process.env.API_PUBLIC_URL?.replace(/\/$/, '')
  if (base) return `${base}/api/mercadolibre/callback`
  return null
}

/** GET /api/mercadolibre — info para registrar la app */
router.get('/', (_req, res) => {
  const redirectUri =
    getRedirectUri() ?? 'https://terzaapi-production.up.railway.app/api/mercadolibre/callback'

  res.json({
    ok: true,
    redirect_uri: redirectUri,
    authorize_url: '/api/mercadolibre/authorize',
    callback_url: '/api/mercadolibre/callback',
    docs: 'https://developers.mercadolibre.com.ar/es_ar/autenticacion-y-autorizacion',
  })
})

/** Inicia OAuth (abrí esta URL en el navegador después de crear la app) */
router.get('/authorize', (req, res) => {
  const clientId = process.env.MELI_CLIENT_ID
  const redirectUri = getRedirectUri()

  if (!clientId || !redirectUri) {
    return res.status(503).json({
      ok: false,
      error: 'meli_not_configured',
      message: 'Configurá MELI_CLIENT_ID y MELI_REDIRECT_URI (o API_PUBLIC_URL) en Railway.',
      redirect_uri_for_app: redirectUri ?? 'https://terzaapi-production.up.railway.app/api/mercadolibre/callback',
    })
  }

  const url = new URL(MELI_AUTH_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)

  res.redirect(url.toString())
})

/** Callback OAuth — registrar esta URL en Mercado Libre */
router.get('/callback', async (req, res) => {
  const { code, error, error_description: errorDescription } = req.query

  if (error) {
    return res.status(400).json({
      ok: false,
      error: String(error),
      error_description: errorDescription ? String(errorDescription) : undefined,
    })
  }

  if (!code) {
    return res.status(400).json({
      ok: false,
      error: 'missing_code',
      message: 'Mercado Libre no envió el código. Volvé a autorizar desde /api/mercadolibre/authorize.',
    })
  }

  const clientId = process.env.MELI_CLIENT_ID
  const clientSecret = process.env.MELI_CLIENT_SECRET
  const redirectUri = getRedirectUri()

  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(503).json({
      ok: false,
      error: 'meli_not_configured',
      message:
        'El callback recibió el código, pero faltan MELI_CLIENT_ID, MELI_CLIENT_SECRET o MELI_REDIRECT_URI en el servidor.',
      hint: 'Guardá el code y reintentá cuando estén las variables en Railway.',
      code_received: true,
    })
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: String(code),
      redirect_uri: redirectUri,
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
      console.error('[meli] token error', tokenRes.status, tokenJson)
      return res.status(tokenRes.status).json({
        ok: false,
        error: 'token_exchange_failed',
        details: tokenJson,
      })
    }

    const accessToken = tokenJson.access_token
    let me = null

    if (accessToken) {
      const meRes = await fetch(`${MELI_API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (meRes.ok) me = await meRes.json()
    }

    console.log('[meli] OAuth OK', {
      user_id: me?.id ?? tokenJson.user_id,
      expires_in: tokenJson.expires_in,
    })

    const meliUserId = me?.id ?? tokenJson.user_id
    const expiresAt = tokenJson.expires_in
      ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString()
      : null

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

    res.json({
      ok: true,
      message: 'Cuenta de Mercado Libre vinculada correctamente.',
      user: me
        ? { id: me.id, nickname: me.nickname, email: me.email }
        : { id: tokenJson.user_id },
      expires_in: tokenJson.expires_in,
      // No devolver tokens en producción una vez guardados en DB
      ...(process.env.NODE_ENV !== 'production' && {
        access_token: tokenJson.access_token,
        refresh_token: tokenJson.refresh_token,
      }),
    })
  } catch (err) {
    console.error('[meli] callback', err)
    res.status(500).json({ ok: false, error: 'internal_error' })
  }
})

module.exports = router
