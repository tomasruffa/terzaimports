const path = require('path')
const express = require('express')
const cors = require('cors')

require('dotenv').config()
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') })

const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://localhost:3001']

function parseAllowedOrigins() {
  const fromEnv = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean)
  return fromEnv?.length ? fromEnv : DEFAULT_ORIGINS
}

const allowedOrigins = parseAllowedOrigins()

const app = express()
const PORT = Number(process.env.PORT || process.env.API_PORT || 4000)
const HOST = process.env.HOSTNAME || '::'

console.log(`[startup] PORT=${process.env.PORT ?? '(unset)'} API_PORT=${process.env.API_PORT ?? '(unset)'} → listening on ${HOST}:${PORT}`)
console.log(`[startup] CORS allowed origins: ${allowedOrigins.join(', ')}`)

// Healthcheck primero — Railway valida esto antes de marcar el deploy como OK
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Terza Imports API',
    timestamp: new Date().toISOString(),
  })
})

app.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'Terza Imports API' })
})

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    console.warn(`[cors] blocked origin: ${origin}`)
    return callback(null, false)
  },
  credentials: true,
}))
app.use(express.json())

const productsRouter = require('./routes/products')
const stockRouter = require('./routes/stock')
const expensesRouter = require('./routes/expenses')
const authRouter = require('./routes/auth')
const requireAuth = require('./middleware/auth')

app.use('/api/auth', authRouter)
app.use('/api/products', productsRouter)
app.use('/api/stock', requireAuth, stockRouter)
app.use('/api/expenses', requireAuth, expensesRouter)

app.use((err, _req, res, _next) => {
  console.error(err.stack)
  res.status(500).json({ data: null, error: 'Error interno del servidor' })
})

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Terza API listening on ${HOST}:${PORT}`)
})

server.on('error', (err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
