const LANG = process.env.KAPSO_TEMPLATE_LANG || 'es_AR'

const ADMIN_SALES_URL =
  process.env.ADMIN_SALES_URL || 'https://terzaadmin-production.up.railway.app/dashboard/sales'

const TEMPLATE_NAMES = {
  VENTA: process.env.KAPSO_SALE_TEMPLATE || 'terza_venta',
  STOCK_BAJO: process.env.KAPSO_STOCK_TEMPLATE || 'terza_stock_bajo',
  ML_PREGUNTA: process.env.KAPSO_QUESTION_TEMPLATE || 'terza_ml_pregunta',
  ML_ORDEN: process.env.KAPSO_ORDER_TEMPLATE || 'terza_ml_orden',
  ML_PAGO: process.env.KAPSO_PAYMENT_TEMPLATE || 'terza_ml_pago',
  SISTEMA_OK: process.env.KAPSO_SYSTEM_TEMPLATE || 'terza_sistema_ok',
}

const TEMPLATE_DEFINITIONS = [
  {
    name: TEMPLATE_NAMES.VENTA,
    language: LANG,
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text:
          'Nueva venta en Terza Imports.\n\nCanal: {{1}}\nCliente: {{2}}\nTotal: {{3}}\n\nDocumentos: {{4}}\n\nRevisá el admin de Terza.',
        example: {
          body_text: [
            ['Mercado Libre', 'Cliente test', 'ARS 100.000', ADMIN_SALES_URL],
          ],
        },
      },
    ],
  },
  {
    name: TEMPLATE_NAMES.STOCK_BAJO,
    language: LANG,
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text:
          'Stock bajo en Terza Imports.\n\nProducto: {{1}}\nStock actual: {{2}}\nMínimo: {{3}}\n\nRevisá inventario en el admin.',
        example: { body_text: [['Ray-Ban Meta', '2', '5']] },
      },
    ],
  },
  {
    name: TEMPLATE_NAMES.ML_PREGUNTA,
    language: LANG,
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text:
          'Nueva pregunta en Mercado Libre.\n\nPublicación: {{1}}\n\nPregunta: {{2}}\n\nRespondé desde Mercado Libre.',
        example: {
          body_text: [['MLA123456', '¿Tienen stock disponible?']],
        },
      },
    ],
  },
  {
    name: TEMPLATE_NAMES.ML_ORDEN,
    language: LANG,
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text:
          'Actividad en orden Mercado Libre.\n\nOrden: {{1}}\nComprador: {{2}}\nEstado: {{3}}\nTotal: {{4}}\n\nRevisá en el admin de Terza.',
        example: {
          body_text: [['2000017730213076', 'cliente_ml', 'paid', 'ARS 1.340.000']],
        },
      },
    ],
  },
  {
    name: TEMPLATE_NAMES.ML_PAGO,
    language: LANG,
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text:
          'Pago en Mercado Libre.\n\nID: {{1}}\nEstado: {{2}}\nMonto: {{3}}\n\nRegistrado en Terza Imports.',
        example: { body_text: [['93353250128', 'approved', 'ARS 100.000']] },
      },
    ],
  },
  {
    name: TEMPLATE_NAMES.SISTEMA_OK,
    language: LANG,
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Terza Imports — sistema operativo.\n\nDetalle: {{1}}\n\nTodo en orden.',
        example: { body_text: [['Webhook ML OK — 06/08/2026 12:00']] },
      },
    ],
  },
]

function truncate(text, max = 900) {
  const value = String(text ?? '').trim()
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

function formatMoney(value, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function saleTemplateParams(sale, channelLabel) {
  return [
    truncate(channelLabel || sale.channel),
    truncate(sale.customer_name || sale.customer_contact || '—'),
    truncate(formatMoney(sale.total_amount, sale.currency_id)),
    truncate(ADMIN_SALES_URL),
  ]
}

function stockTemplateParams(product) {
  return [
    truncate(product.name),
    String(product.stock_quantity ?? 0),
    String(product.min_stock ?? 0),
  ]
}

function questionTemplateParams(question) {
  return [truncate(question.item_id || question.meli_item_id), truncate(question.text)]
}

function orderTemplateParams(order) {
  const total = order.total_amount ?? order.paid_amount
  return [
    String(order.id ?? order.meli_order_id ?? '—'),
    truncate(order.buyer?.nickname || order.buyer_nickname || order.buyer?.id || '—'),
    truncate(order.status ?? '—'),
    truncate(total != null ? formatMoney(total, order.currency_id || 'ARS') : '—'),
  ]
}

function paymentTemplateParams(payment) {
  return [
    String(payment.id ?? '—'),
    truncate(payment.status ?? '—'),
    truncate(
      payment.transaction_amount != null
        ? formatMoney(payment.transaction_amount, payment.currency_id || 'ARS')
        : '—'
    ),
  ]
}

function systemOkTemplateParams(message) {
  return [truncate(message)]
}

module.exports = {
  LANG,
  ADMIN_SALES_URL,
  TEMPLATE_NAMES,
  TEMPLATE_DEFINITIONS,
  saleTemplateParams,
  stockTemplateParams,
  questionTemplateParams,
  orderTemplateParams,
  paymentTemplateParams,
  systemOkTemplateParams,
  truncate,
}
