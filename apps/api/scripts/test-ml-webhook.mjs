/**
 * Prueba el webhook de Mercado Libre contra producción (sin auth).
 * Simula el POST que ML envía cuando hay una notificación.
 */
const WEBHOOK_URL =
  process.env.WEBHOOK_URL || 'https://terzaapi-production.up.railway.app/api/mercadolibre/webhook'

async function main() {
  const notificationId = `ext-test-${Date.now()}`
  const payload = {
    _id: notificationId,
    topic: 'test_ping',
    resource: '/test/ping',
    user_id: 295212942,
  }

  console.log('GET webhook (health)...')
  const health = await fetch(WEBHOOK_URL.replace(/\/$/, '').replace(/\/webhook$/, '') + '/webhook')
  console.log('GET status:', health.status, await health.text())

  console.log('\nPOST webhook (simulación ML)...')
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.text()
  console.log('POST status:', res.status, body)
  console.log('\nPayload enviado:', JSON.stringify(payload, null, 2))

  if (res.status === 200) {
    console.log('\n✅ El endpoint responde OK. Verificá en la DB (meli_notifications) o WhatsApp si topic=test_ping.')
  } else {
    console.log('\n❌ El webhook no respondió 200')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
