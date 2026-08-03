const KAPSO_API_BASE = 'https://api.kapso.ai/meta/whatsapp/v24.0'

function isConfigured() {
  return Boolean(
    process.env.KAPSO_API_KEY &&
      process.env.KAPSO_PHONE_NUMBER_ID &&
      process.env.ADMIN_WHATSAPP_NUMBER
  )
}

function normalizePhoneNumber(phone) {
  return String(phone).replace(/\D/g, '')
}

async function sendText(body, to) {
  const apiKey = process.env.KAPSO_API_KEY
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID
  const recipient = normalizePhoneNumber(to || process.env.ADMIN_WHATSAPP_NUMBER)

  if (!apiKey || !phoneNumberId || !recipient) {
    console.warn('[kapso] not configured — skipping message')
    return { skipped: true }
  }

  const res = await fetch(`${KAPSO_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: { preview_url: false, body },
    }),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('[kapso] send error', res.status, json)
    throw new Error(json?.error?.message || json?.message || 'kapso_send_failed')
  }

  return json
}

async function notifyAdmin(body) {
  if (!isConfigured()) return { skipped: true }
  return sendText(body)
}

module.exports = {
  isConfigured,
  sendText,
  notifyAdmin,
}
