const { query } = require('./db')
const { meliFetch } = require('./meli')
const { notifyAdmin, notifyAdminTemplate } = require('./kapso')
const {
  LANG,
  TEMPLATE_NAMES,
  questionTemplateParams,
  orderTemplateParams,
  paymentTemplateParams,
  systemOkTemplateParams,
} = require('./kapso-templates')
const { syncItemFromMeli, maybeNotifyLowStock } = require('./meli-sync')
const { syncOrderById, syncQuestionById } = require('./meli-data-sync')
const { upsertPayment } = require('./meli-repository')

async function markNotificationProcessed(notificationId, topic, resource) {
  const { rowCount } = await query(
    `INSERT INTO meli_notifications (notification_id, topic, resource)
     VALUES ($1, $2, $3)
     ON CONFLICT (notification_id) DO NOTHING`,
    [notificationId, topic, resource]
  )
  return rowCount > 0
}

function extractResourceId(resource, prefix) {
  if (!resource) return null
  const match = String(resource).match(new RegExp(`${prefix}/([^/?]+)`))
  return match?.[1] ?? null
}

async function handleOrdersV2(resource, meliUserId) {
  const orderId = extractResourceId(resource, 'orders')
  if (!orderId) return

  const order = await syncOrderById(orderId, meliUserId)
  const total = order.total_amount ?? order.paid_amount
  const status = order.status
  const buyer = order.buyer?.nickname || order.buyer?.id || 'comprador'

  await notifyAdmin(
    `🛒 Nueva actividad en Mercado Libre\n` +
      `Orden: #${orderId}\n` +
      `Comprador: ${buyer}\n` +
      `Estado: ${status}\n` +
      `Total: $${total ?? '—'}`,
    {
      template: {
        name: TEMPLATE_NAMES.ML_ORDEN,
        language: LANG,
        bodyParams: orderTemplateParams(order),
      },
    }
  )
}

async function handleQuestion(resource, meliUserId) {
  const questionId = extractResourceId(resource, 'questions')
  if (!questionId) return

  const question = await syncQuestionById(questionId, meliUserId)

  await notifyAdmin(
    `❓ Nueva pregunta en Mercado Libre\n` +
      `Publicación: ${question.item_id}\n` +
      `Pregunta: ${question.text}`,
    {
      template: {
        name: TEMPLATE_NAMES.ML_PREGUNTA,
        language: LANG,
        bodyParams: questionTemplateParams(question),
      },
    }
  )
}

async function handleItem(resource, meliUserId) {
  const itemId = extractResourceId(resource, 'items')
  if (!itemId) return

  const { product } = await syncItemFromMeli(itemId, meliUserId)
  await maybeNotifyLowStock(product)
}

async function handlePayment(resource, meliUserId) {
  const paymentId = extractResourceId(resource, 'payments')
  if (!paymentId) return

  const payment = await meliFetch(resource.startsWith('/') ? resource : `/${resource}`, {}, meliUserId)
  await upsertPayment(payment, meliUserId)

  await notifyAdmin(
    `💳 Pago en Mercado Libre\n` +
      `ID: ${paymentId}\n` +
      `Estado: ${payment.status}\n` +
      `Monto: $${payment.transaction_amount ?? '—'}`,
    {
      template: {
        name: TEMPLATE_NAMES.ML_PAGO,
        language: LANG,
        bodyParams: paymentTemplateParams(payment),
      },
    }
  )
}

async function processMeliNotification(payload) {
  const notificationId = payload._id || payload.id
  const topic = payload.topic
  const resource = payload.resource
  const meliUserId = payload.user_id ? Number(payload.user_id) : undefined

  if (!notificationId || !topic) {
    console.warn('[meli] webhook payload inválido', payload)
    return
  }

  const isNew = await markNotificationProcessed(notificationId, topic, resource)
  if (!isNew) {
    console.log('[meli] notification duplicada', notificationId)
    return
  }

  switch (topic) {
    case 'orders_v2':
    case 'orders':
      await handleOrdersV2(resource, meliUserId)
      break
    case 'questions':
      await handleQuestion(resource, meliUserId)
      break
    case 'items':
    case 'items_prices':
      await handleItem(resource, meliUserId)
      break
    case 'payments':
      await handlePayment(resource, meliUserId)
      break
    case 'test_ping':
      const testMsg = `Webhook ML OK — ${new Date().toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
      })}`
      await notifyAdminTemplate({
        name: TEMPLATE_NAMES.SISTEMA_OK,
        language: LANG,
        bodyParams: systemOkTemplateParams(testMsg),
      })
      break
    default:
      console.log('[meli] topic sin handler', topic, resource)
  }
}

module.exports = {
  processMeliNotification,
}
