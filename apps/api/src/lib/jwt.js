const jwt = require('jsonwebtoken')

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET es requerido')
  }
  return secret
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role ?? 'admin' },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret())
}

module.exports = { signAccessToken, verifyAccessToken }
