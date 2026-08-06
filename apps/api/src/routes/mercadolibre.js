const crypto = require('crypto')
const express = require('express')
const { saveTokens, refreshAllTokens, getTokenRow } = require('../lib/meli')
const { runFullSync, getMetricsSummary } = require('../lib/meli-data-sync')
const { processMeliNotification } = require('../lib/meli-notifications')
const { isConfigured: isKapsoConfigured } = require('../lib/kapso')
const requireAuth = require('../middleware/auth')
const { query } = require('../lib/db')

const router = express.Router()

function requireCronOrAuth(req, res, next) {
  const cronSecret = process.env.MELI_CRON_SECRET
  if (cronSecret && req.headers['x-cron-secret'] === cronSecret) {
    return next()
  }
  return requireAuth(req, res, next)
}

const PKCE_STATE_TTL_MS = 10 * 60 * 1000

function getSigningSecret() {
  return process.env.JWT_SECRET || process.env.MELI_CLIENT_SECRET || 'meli-pkce-dev'
}

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url')
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

/** Guarda el code_verifier en state firmado (ML lo devuelve en el callback). */
function createPkceState(codeVerifier) {
  const payload = Buffer.from(
    JSON.stringify({
      v: codeVerifier,
      n: crypto.randomBytes(16).toString('hex'),
      t: Date.now(),
    })
  ).toString('base64url')
  const sig = crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function parsePkceState(state) {
  if (!state || typeof state !== 'string') return null

  const dot = state.lastIndexOf('.')
  if (dot <= 0) return null

  const payload = state.slice(0, dot)
  const sig = state.slice(dot + 1)
  const expected = crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('base64url')

  if (sig.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data.v || typeof data.t !== 'number') return null
    if (Date.now() - data.t > PKCE_STATE_TTL_MS) return null
    return data.v
  } catch {
    return null
  }
}

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
router.get('/', async (_req, res) => {
  const redirectUri =
    getRedirectUri() ?? 'https://terzaapi-production.up.railway.app/api/mercadolibre/callback'
  const apiBase = process.env.API_PUBLIC_URL?.replace(/\/$/, '') ?? 'https://terzaapi-production.up.railway.app'
  const tokenRow = await getTokenRow().catch(() => null)

  res.json({
    ok: true,
    redirect_uri: redirectUri,
    webhook_url: `${apiBase}/api/mercadolibre/webhook`,
    notifications_callback_url: `${apiBase}/api/mercadolibre/webhook`,
    authorize_url: '/api/mercadolibre/authorize',
    callback_url: '/api/mercadolibre/callback',
    kapso_configured: isKapsoConfigured(),
    linked_account: tokenRow
      ? { meli_user_id: tokenRow.meli_user_id, expires_at: tokenRow.expires_at }
      : null,
    recommended_topics: ['orders_v2', 'questions', 'items', 'payments'],
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

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = createPkceState(codeVerifier)

  const url = new URL(MELI_AUTH_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')

  res.redirect(url.toString())
})

/** Callback OAuth — registrar esta URL en Mercado Libre */
router.get('/callback', async (req, res) => {
  const { code, error, error_description: errorDescription, state } = req.query

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

  const codeVerifier = parsePkceState(state ? String(state) : null)
  if (!codeVerifier) {
    return res.status(400).json({
      ok: false,
      error: 'invalid_pkce_state',
      message:
        'Falta o expiró el state de PKCE. Volvé a autorizar desde /api/mercadolibre/authorize (no reutilices el link del callback).',
    })
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: String(code),
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
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
    await saveTokens(meliUserId, tokenJson)

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

/** Webhook de notificaciones de Mercado Libre → alertas WhatsApp vía Kapso */
router.get('/webhook', (_req, res) => {
  res.status(200).json({
    ok: true,
    message: 'Webhook activo. Mercado Libre debe enviar POST a esta URL.',
    url: `${process.env.API_PUBLIC_URL?.replace(/\/$/, '') ?? 'https://terzaapi-production.up.railway.app'}/api/mercadolibre/webhook`,
  })
})

router.get('/webhook/status', requireAuth, async (_req, res) => {
  try {
    const apiBase = process.env.API_PUBLIC_URL?.replace(/\/$/, '') ?? 'https://terzaapi-production.up.railway.app'
    const count = await query('SELECT COUNT(*)::int AS total FROM meli_notifications')
    const recent = await query(
      `SELECT notification_id, topic, resource, processed_at
       FROM meli_notifications
       ORDER BY processed_at DESC
       LIMIT 15`
    )

    res.json({
      ok: true,
      webhook_url: `${apiBase}/api/mercadolibre/webhook`,
      total_received: count.rows[0].total,
      recent: recent.rows,
      hint:
        count.rows[0].total === 0
          ? 'Todavía no llegó ninguna notificación real de ML. Usá POST /api/mercadolibre/webhook/test para probar.'
          : 'Las notificaciones de ML están llegando.',
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/webhook/test', requireAuth, async (req, res) => {
  try {
    const tokenRow = await getTokenRow()
    const notificationId = `test-${Date.now()}`
    const payload = {
      _id: notificationId,
      topic: req.body?.topic || 'test_ping',
      resource: req.body?.resource || '/test/ping',
      user_id: tokenRow?.meli_user_id ?? req.body?.user_id,
    }

    await processMeliNotification(payload)

    const stored = await query(
      'SELECT notification_id, topic, processed_at FROM meli_notifications WHERE notification_id = $1',
      [notificationId]
    )

    res.json({
      ok: true,
      message: 'Notificación de prueba procesada',
      payload,
      stored: stored.rows[0] ?? null,
      whatsapp: payload.topic === 'test_ping' ? 'Se intentó enviar confirmación por Kapso' : null,
    })
  } catch (err) {
    console.error('[meli] webhook/test', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/webhook', (req, res) => {
  res.status(200).send('OK')
  processMeliNotification(req.body).catch((err) => {
    console.error('[meli] webhook process', err)
  })
})

/** Renueva tokens próximos a vencer (cron o admin) */
router.post('/refresh-tokens', requireCronOrAuth, async (_req, res) => {
  try {
    const results = await refreshAllTokens()
    res.json({ ok: true, results })
  } catch (err) {
    console.error('[meli] refresh-tokens', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

/** Sincroniza toda la data y métricas de Mercado Libre a PostgreSQL */
router.post('/sync', requireCronOrAuth, async (req, res) => {
  try {
    const tokenRow = await getTokenRow(req.body?.meli_user_id)
    if (!tokenRow) {
      return res.status(400).json({ ok: false, error: 'No hay cuenta de Mercado Libre vinculada' })
    }

    const result = await runFullSync(tokenRow.meli_user_id)
    res.json(result)
  } catch (err) {
    console.error('[meli] sync', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

/** Métricas y resumen desde la DB local */
router.get('/metrics', requireAuth, async (req, res) => {
  try {
    const tokenRow = await getTokenRow()
    if (!tokenRow) {
      return res.status(400).json({ ok: false, error: 'No hay cuenta de Mercado Libre vinculada' })
    }

    const metrics = await getMetricsSummary(tokenRow.meli_user_id)
    res.json({ ok: true, data: metrics })
  } catch (err) {
    console.error('[meli] metrics', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

/** Publicaciones sincronizadas desde ML */
router.get('/items', requireAuth, async (req, res) => {
  try {
    const tokenRow = await getTokenRow()
    if (!tokenRow) {
      return res.status(400).json({ ok: false, error: 'No hay cuenta de Mercado Libre vinculada' })
    }

    const { status, page = 1, limit = 20, catalog } = req.query
    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))
    const offset = (pageNum - 1) * limitNum
    const params = [tokenRow.meli_user_id]
    let where = 'WHERE meli_user_id = $1'

    if (catalog === 'marketplace') {
      where +=
        " AND (raw->>'domain_id' IS NULL OR raw->>'domain_id' <> 'MLA-MERCADO_PAGO') AND category_id <> 'MLA458068'"
    } else if (catalog === 'mercadopago') {
      where += " AND (raw->>'domain_id' = 'MLA-MERCADO_PAGO' OR category_id = 'MLA458068')"
    }

    if (status) {
      params.push(status)
      where += ` AND status = $${params.length}`
    }

    const count = await query(`SELECT COUNT(*)::int AS total FROM meli_items ${where}`, params)
    const { rows } = await query(
      `SELECT * FROM meli_items ${where}
       ORDER BY synced_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    )

    res.json({
      ok: true,
      data: rows,
      total: count.rows[0].total,
      page: pageNum,
      limit: limitNum,
    })
  } catch (err) {
    console.error('[meli] items', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

/** Órdenes sincronizadas desde ML */
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const tokenRow = await getTokenRow()
    if (!tokenRow) {
      return res.status(400).json({ ok: false, error: 'No hay cuenta de Mercado Libre vinculada' })
    }

    const { status, page = 1, limit = 20 } = req.query
    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))
    const offset = (pageNum - 1) * limitNum
    const params = [tokenRow.meli_user_id]
    let countWhere = 'WHERE meli_user_id = $1'
    let where = 'WHERE o.meli_user_id = $1'

    if (status) {
      params.push(status)
      countWhere += ` AND status = $${params.length}`
      where += ` AND o.status = $${params.length}`
    }

    const count = await query(`SELECT COUNT(*)::int AS total FROM meli_orders ${countWhere}`, params)
    const { rows } = await query(
      `SELECT o.*,
         COALESCE(
           json_agg(
             json_build_object(
               'meli_item_id', oi.meli_item_id,
               'title', oi.title,
               'quantity', oi.quantity,
               'unit_price', oi.unit_price
             )
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'
         ) AS items
       FROM meli_orders o
       LEFT JOIN meli_order_items oi ON oi.meli_order_id = o.meli_order_id
       ${where}
       GROUP BY o.meli_order_id
       ORDER BY o.date_created DESC NULLS LAST
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    )

    res.json({
      ok: true,
      data: rows,
      total: count.rows[0].total,
      page: pageNum,
      limit: limitNum,
    })
  } catch (err) {
    console.error('[meli] orders', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

/** Preguntas sincronizadas desde ML */
router.get('/questions', requireAuth, async (req, res) => {
  try {
    const tokenRow = await getTokenRow()
    if (!tokenRow) {
      return res.status(400).json({ ok: false, error: 'No hay cuenta de Mercado Libre vinculada' })
    }

    const { status, page = 1, limit = 20 } = req.query
    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))
    const offset = (pageNum - 1) * limitNum
    const params = [tokenRow.meli_user_id]
    let where = 'WHERE meli_user_id = $1'

    if (status) {
      params.push(status)
      where += ` AND status = $${params.length}`
    }

    const count = await query(`SELECT COUNT(*)::int AS total FROM meli_questions ${where}`, params)
    const { rows } = await query(
      `SELECT * FROM meli_questions ${where}
       ORDER BY date_created DESC NULLS LAST
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    )

    res.json({
      ok: true,
      data: rows,
      total: count.rows[0].total,
      page: pageNum,
      limit: limitNum,
    })
  } catch (err) {
    console.error('[meli] questions', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

module.exports = router
