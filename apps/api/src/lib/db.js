const { Pool, types } = require('pg')

// PostgreSQL devuelve DECIMAL/NUMERIC como string; normalizar a number.
types.setTypeParser(1700, val => (val === null ? null : parseFloat(val)))

let pool

function getPoolConfig() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL es requerido')
  }

  const useSsl =
    connectionString.includes('rlwy.net') || process.env.PGSSLMODE === 'require'

  return {
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  }
}

function getPool() {
  if (!pool) {
    pool = new Pool(getPoolConfig())
  }
  return pool
}

async function query(text, params) {
  return getPool().query(text, params)
}

module.exports = { getPool, query }
