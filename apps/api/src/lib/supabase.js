const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

let _client = null

function getClient() {
  if (!_client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos. Configurá el archivo .env')
    }
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: require('ws') },
    })
  }
  return _client
}

// Proxy que inicializa el cliente la primera vez que se usa
const supabase = new Proxy({}, {
  get(_, prop) {
    return getClient()[prop]
  }
})

module.exports = { supabase }
