const KAPSO_API_BASE = 'https://api.kapso.ai/meta/whatsapp/v24.0'

function isConfigured() {
  return Boolean(
    process.env.KAPSO_API_KEY &&
      process.env.KAPSO_PHONE_NUMBER_ID &&
      process.env.ADMIN_WHATSAPP_NUMBER
  )
}

function normalizePhoneNumber(phone) {
  const digits = String(phone).replace(/\D/g, '')
  // Argentina: Meta send API expects 54 + area + number (without mobile 9 after country code)
  if (digits.startsWith('549') && digits.length >= 12) {
    return `54${digits.slice(3)}`
  }
  return digits
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getMessageStatus(messageId) {
  const apiKey = process.env.KAPSO_API_KEY
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID
  if (!apiKey || !phoneNumberId || !messageId) return null

  const res = await fetch(
    `${KAPSO_API_BASE}/${phoneNumberId}/messages/${encodeURIComponent(messageId)}`,
    { headers: { 'X-API-Key': apiKey } }
  )
  const json = await res.json().catch(() => null)
  if (!res.ok) return null
  return json
}

async function waitForMessageDelivery(messageId, { attempts = 6, delayMs = 1500 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const json = await getMessageStatus(messageId)
    const status = json?.kapso?.status
    if (status === 'delivered' || status === 'read' || status === 'sent') {
      return { delivered: true, status, json }
    }
    if (status === 'failed') {
      const errors = json?.kapso?.statuses?.[0]?.errors ?? []
      return { delivered: false, status, errors, json }
    }
    await sleep(delayMs)
  }
  return { delivered: false, status: 'pending', errors: [] }
}

function isOutsideWindowError(errors = []) {
  return errors.some((e) => e.code === 131047 || e.code === 131030)
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
    const err = new Error(json?.error?.message || json?.message || 'kapso_send_failed')
    err.status = res.status
    err.details = json
    throw err
  }

  return json
}

async function sendTemplate({ name, language = 'es_AR', bodyParams = [] }, to) {
  const apiKey = process.env.KAPSO_API_KEY
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID
  const recipient = normalizePhoneNumber(to || process.env.ADMIN_WHATSAPP_NUMBER)

  if (!apiKey || !phoneNumberId || !recipient) {
    console.warn('[kapso] not configured — skipping template')
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
      type: 'template',
      template: {
        name,
        language: { code: language },
        components: bodyParams.length
          ? [{ type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text: String(text) })) }]
          : undefined,
      },
    }),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('[kapso] template error', res.status, json)
    const err = new Error(json?.error?.message || json?.message || 'kapso_template_failed')
    err.status = res.status
    err.details = json
    throw err
  }

  return json
}

async function sendDocument({ url, filename, caption }, to) {
  const apiKey = process.env.KAPSO_API_KEY
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID
  const recipient = normalizePhoneNumber(to || process.env.ADMIN_WHATSAPP_NUMBER)

  if (!apiKey || !phoneNumberId || !recipient) {
    console.warn('[kapso] not configured — skipping document')
    return { skipped: true }
  }

  const document = {
    link: url,
    filename: filename || 'documento.pdf',
  }
  if (caption) document.caption = caption

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
      type: 'document',
      document,
    }),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('[kapso] document error', res.status, json)
    const err = new Error(json?.error?.message || json?.message || 'kapso_document_failed')
    err.status = res.status
    err.details = json
    throw err
  }

  return json
}

async function sendWithDeliveryCheck(sendFn) {
  const result = await sendFn()
  if (result?.skipped || result?.error) return result

  const messageId = result?.messages?.[0]?.id
  if (!messageId) return result

  const delivery = await waitForMessageDelivery(messageId)
  if (!delivery.delivered) {
    return {
      ...result,
      delivery_failed: true,
      delivery_status: delivery.status,
      delivery_errors: delivery.errors,
    }
  }

  return { ...result, delivered: true, delivery_status: delivery.status }
}

async function notifyAdminTemplate({ name, language = 'es_AR', bodyParams = [] }, to) {
  if (!isConfigured()) return { skipped: true }
  if (!name) return { error: 'template_name_required' }

  try {
    const result = await sendWithDeliveryCheck(() =>
      sendTemplate({ name, language, bodyParams }, to)
    )
    if (result?.delivered) return result
    if (result?.delivery_failed) {
      return {
        error: result.delivery_errors?.[0]?.message || 'template_not_delivered',
        ...result,
      }
    }
    return result
  } catch (err) {
    console.error('[kapso] notifyAdminTemplate failed:', name, err.message)
    return { error: err.message, template: name }
  }
}

async function notifyAdmin(body, { template, templateFallback } = {}) {
  if (!isConfigured()) return { skipped: true }

  if (template?.name) {
    const templateResult = await notifyAdminTemplate(template)
    if (!templateResult?.error && !templateResult?.skipped) return templateResult
    console.warn('[kapso] primary template failed, trying text fallback', template.name)
  }

  try {
    const result = await sendWithDeliveryCheck(() => sendText(body))
    if (result?.delivered) return result

    const templateName = templateFallback?.name || process.env.KAPSO_SALE_TEMPLATE
    if (templateName && (result?.delivery_failed || isOutsideWindowError(result?.delivery_errors))) {
      console.warn('[kapso] text outside 24h window — trying template', templateName)
      const templateResult = await sendWithDeliveryCheck(() =>
        sendTemplate({
          name: templateName,
          language: templateFallback?.language || process.env.KAPSO_SALE_TEMPLATE_LANG || 'es_AR',
          bodyParams: templateFallback?.bodyParams || [],
        })
      )
      return templateResult
    }

    if (result?.delivery_failed) {
      console.error('[kapso] message not delivered', result.delivery_errors)
      return { error: result.delivery_errors?.[0]?.message || 'message_not_delivered', ...result }
    }

    return result
  } catch (err) {
    if (err.status === 422 && (templateFallback?.name || process.env.KAPSO_SALE_TEMPLATE)) {
      try {
        return await sendWithDeliveryCheck(() =>
          sendTemplate({
            name: templateFallback?.name || process.env.KAPSO_SALE_TEMPLATE,
            language: templateFallback?.language || process.env.KAPSO_SALE_TEMPLATE_LANG || 'es_AR',
            bodyParams: templateFallback?.bodyParams || [],
          })
        )
      } catch (templateErr) {
        console.error('[kapso] template fallback failed:', templateErr.message)
        return { error: templateErr.message }
      }
    }
    console.error('[kapso] notifyAdmin failed:', err.message)
    return { error: err.message }
  }
}

module.exports = {
  isConfigured,
  normalizePhoneNumber,
  sendText,
  sendTemplate,
  sendDocument,
  notifyAdmin,
  notifyAdminTemplate,
  waitForMessageDelivery,
}
