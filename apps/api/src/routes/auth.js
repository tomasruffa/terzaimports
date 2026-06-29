const express = require('express')
const { supabase } = require('../lib/supabase')
const requireAuth = require('../middleware/auth')

const router = express.Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ data: null, error: 'Email y contraseña requeridos' })
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    return res.status(401).json({ data: null, error: error?.message ?? 'Credenciales inválidas' })
  }

  res.json({
    data: {
      user: { id: data.user.id, email: data.user.email },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
    error: null,
  })
})

router.post('/logout', (_req, res) => {
  res.json({ data: null, error: null, message: 'Sesión cerrada' })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({
    data: { id: req.user.id, email: req.user.email },
    error: null,
  })
})

module.exports = router
