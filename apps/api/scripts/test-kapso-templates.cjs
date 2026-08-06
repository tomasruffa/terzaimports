/**
 * Envía cada template a ADMIN_WHATSAPP_NUMBER y verifica entrega (sin ventana 24h).
 * Usage: node scripts/test-kapso-templates.cjs
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })

const WABA_ID = process.env.KAPSO_WABA_ID || '1694598391773580'
const {
  LANG,
  TEMPLATE_NAMES,
  ADMIN_SALES_URL,
} = require('../src/lib/kapso-templates')
const { notifyAdminTemplate, waitForMessageDelivery } = require('../src/lib/kapso')

const TEST_CASES = [
  {
    key: 'VENTA',
    name: TEMPLATE_NAMES.VENTA,
    bodyParams: [
      'Mercado Libre',
      'Cliente test',
      'ARS 1.340.000',
      ADMIN_SALES_URL,
    ],
  },
  {
    key: 'STOCK_BAJO',
    name: TEMPLATE_NAMES.STOCK_BAJO,
    bodyParams: ['Ray-Ban Meta Wayfarer', '2', '5'],
  },
  {
    key: 'ML_PREGUNTA',
    name: TEMPLATE_NAMES.ML_PREGUNTA,
    bodyParams: ['MLA1908178311', '¿Tienen stock del modelo negro?'],
  },
  {
    key: 'ML_ORDEN',
    name: TEMPLATE_NAMES.ML_ORDEN,
    bodyParams: ['2000017730213076', 'FLINDUMENTARIA', 'paid', 'ARS 1.340.000'],
  },
  {
    key: 'ML_PAGO',
    name: TEMPLATE_NAMES.ML_PAGO,
    bodyParams: ['93353250128', 'approved', 'ARS 100.000'],
  },
  {
    key: 'SISTEMA_OK',
    name: TEMPLATE_NAMES.SISTEMA_OK,
    bodyParams: [
      `Test templates Terza — ${new Date().toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
      })}`,
    ],
  },
]

async function getTemplateStatus(name) {
  const apiKey = process.env.KAPSO_API_KEY
  const res = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${WABA_ID}/message_templates?name=${encodeURIComponent(name)}`,
    { headers: { 'X-API-Key': apiKey } }
  )
  const json = await res.json().catch(() => ({}))
  const row = (json.data || []).find((t) => t.name === name && t.language === LANG)
  return row?.status || 'NOT_FOUND'
}

async function main() {
  console.log(`Destino: ${process.env.ADMIN_WHATSAPP_NUMBER}`)
  console.log('Sin ventana 24h — solo templates APPROVED entregarán.\n')

  const results = []

  for (const test of TEST_CASES) {
    const metaStatus = await getTemplateStatus(test.name)
    console.log(`\n--- ${test.key} (${test.name}) — Meta: ${metaStatus} ---`)

    if (metaStatus !== 'APPROVED') {
      results.push({
        key: test.key,
        name: test.name,
        meta_status: metaStatus,
        sent: false,
        delivered: false,
        note: 'Template no aprobado todavía',
      })
      console.log('SKIP — template no aprobado')
      continue
    }

    const sendResult = await notifyAdminTemplate({
      name: test.name,
      language: LANG,
      bodyParams: test.bodyParams,
    })

    const messageId = sendResult?.messages?.[0]?.id
    let delivery = { delivered: false, status: 'no_message_id' }
    if (messageId) {
      delivery = await waitForMessageDelivery(messageId, { attempts: 8, delayMs: 2000 })
    }

    const row = {
      key: test.key,
      name: test.name,
      meta_status: metaStatus,
      sent: Boolean(messageId),
      message_id: messageId,
      delivered: delivery.delivered,
      delivery_status: delivery.status,
      errors: delivery.errors,
      api_error: sendResult?.error,
    }
    results.push(row)
    console.log(JSON.stringify(row, null, 2))
  }

  console.log('\n=== RESUMEN ===')
  console.table(
    results.map((r) => ({
      template: r.key,
      meta: r.meta_status,
      enviado: r.sent ? 'sí' : 'no',
      entregado: r.delivered ? 'sí' : 'no',
      estado: r.delivery_status || r.note || r.api_error || '—',
    }))
  )

  const delivered = results.filter((r) => r.delivered).length
  const approved = results.filter((r) => r.meta_status === 'APPROVED').length
  console.log(`\nAprobados: ${approved}/${results.length} | Entregados: ${delivered}/${results.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
