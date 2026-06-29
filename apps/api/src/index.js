const path = require('path')
const express = require('express')
const cors = require('cors')

require('dotenv').config()
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') })

const app = express()
const PORT = Number(process.env.PORT || process.env.API_PORT || 4000)

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
  origin: process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || ['http://localhost:3000'],
  credentials: true,
}))
app.use(express.json())

const requireAuth = require('./middleware/auth')
const productsRouter = require('./routes/products')
const stockRouter = require('./routes/stock')
const expensesRouter = require('./routes/expenses')

app.use('/api/products', productsRouter)
app.use('/api/stock', requireAuth, stockRouter)
app.use('/api/expenses', requireAuth, expensesRouter)

app.use((err, _req, res, _next) => {
  console.error(err.stack)
  res.status(500).json({ data: null, error: 'Error interno del servidor' })
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Terza API listening on 0.0.0.0:${PORT}`)
})

server.on('error', (err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
