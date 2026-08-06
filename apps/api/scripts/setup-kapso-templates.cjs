/**
 * Registra todos los templates UTILITY de Terza en Meta vía Kapso.
 * Usage: node scripts/setup-kapso-templates.cjs
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })

const WABA_ID = process.env.KAPSO_WABA_ID || '1694598391773580'
const { TEMPLATE_DEFINITIONS } = require('../src/lib/kapso-templates')

async function createTemplate(def) {
  const apiKey = process.env.KAPSO_API_KEY
  const res = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${WABA_ID}/message_templates`,
    {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(def),
    }
  )
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, json }
}

async function listTemplates() {
  const apiKey = process.env.KAPSO_API_KEY
  const res = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${WABA_ID}/message_templates?limit=50`,
    { headers: { 'X-API-Key': apiKey } }
  )
  const json = await res.json().catch(() => ({}))
  return json.data || []
}

async function main() {
  if (!process.env.KAPSO_API_KEY) {
    console.error('Falta KAPSO_API_KEY')
    process.exit(1)
  }

  const existing = await listTemplates()
  const existingNames = new Set(existing.map((t) => `${t.name}:${t.language}`))

  console.log('\n=== Templates existentes ===')
  for (const t of existing) {
    console.log(`  ${t.name} (${t.language}) — ${t.status}`)
  }

  console.log('\n=== Creando templates ===')
  for (const def of TEMPLATE_DEFINITIONS) {
    const key = `${def.name}:${def.language}`
    if (existingNames.has(key)) {
      console.log(`SKIP ${def.name} — ya existe`)
      continue
    }

    const result = await createTemplate(def)
    if (result.ok) {
      console.log(`OK   ${def.name} — ${result.json.status || 'created'} (id ${result.json.id || '—'})`)
    } else {
      console.log(`FAIL ${def.name} — ${result.status}`, JSON.stringify(result.json))
    }
  }

  console.log('\n=== Estado final ===')
  const final = await listTemplates()
  for (const t of final) {
    console.log(`  ${t.name} (${t.language}) — ${t.status}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
