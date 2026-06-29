const path = require('path')
// __dirname = apps/api/src → subir 3 niveles llega a la raíz del monorepo
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') })
require('dotenv').config()
const express = require('express')
const cors = require('cors')

const requireAuth = require('./middleware/auth')
const productsRouter = require('./routes/products')
const stockRouter = require('./routes/stock')
const expensesRouter = require('./routes/expenses')

const app = express()
const PORT = process.env.PORT || process.env.API_PORT || 4000

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}))
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Terza Imports API', timestamp: new Date().toISOString() })
})

app.use('/api/products', productsRouter)
app.use('/api/stock', requireAuth, stockRouter)
app.use('/api/expenses', requireAuth, expensesRouter)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ data: null, error: 'Error interno del servidor' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Terza API corriendo en puerto ${PORT}`)
})
