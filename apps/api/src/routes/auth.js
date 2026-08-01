const express = require('express')
const bcrypt = require('bcryptjs')
const { query } = require('../lib/db')
const { signAccessToken } = require('../lib/jwt')
const requireAuth = require('../middleware/auth')

const router = express.Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ data: null, error: 'Email y contraseña requeridos' })
  }

  try {
    const { rows } = await query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )
    const user = rows[0]

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ data: null, error: 'Credenciales inválidas' })
    }

    const accessToken = signAccessToken(user)

    res.json({
      data: {
        user: { id: user.id, email: user.email },
        access_token: accessToken,
        refresh_token: null,
      },
      error: null,
    })
  } catch (err) {
    console.error('[auth/login]', err)
    res.status(500).json({ data: null, error: 'Error al iniciar sesión' })
  }
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
