const { supabase } = require('../lib/supabase')

module.exports = async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ data: null, error: 'No autorizado' })
  }

  const token = authHeader.slice(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ data: null, error: 'Token inválido o expirado' })
  }

  req.user = user
  next()
}
