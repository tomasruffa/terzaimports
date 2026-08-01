const { verifyAccessToken } = require('../lib/jwt')

function getBearerToken(req) {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  return null
}

async function requireAuth(req, res, next) {
  const token = getBearerToken(req)
  if (!token) {
    return res.status(401).json({ data: null, error: 'No autorizado' })
  }

  try {
    const payload = verifyAccessToken(token)
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    }
    next()
  } catch {
    return res.status(401).json({ data: null, error: 'Token inválido o expirado' })
  }
}

module.exports = requireAuth
