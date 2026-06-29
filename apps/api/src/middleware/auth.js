const { supabase } = require('../lib/supabase')

function extractToken(req) {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  return null
}

module.exports = async function requireAuth(req, res, next) {
  const token = extractToken(req)
  if (!token) {
    return res.status(401).json({ data: null, error: 'No autorizado' })
  }
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ data: null, error: 'Token inválido o expirado' })
  }

  req.user = user
  next()
}
