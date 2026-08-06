const { GetObjectCommand } = require('@aws-sdk/client-s3')
const { meliFetch, meliFetchBinary } = require('./meli')
const { getPool } = require('./db')
const { getS3Client, uploadBuffer, getPublicUrl } = require('./storage')

const SHIPPED_STATUSES = new Set(['shipped', 'delivered', 'not_delivered'])
const LABEL_AVAILABLE_STATUSES = new Set(['ready_to_ship', 'handling'])

function getPackIdFromOrder(order) {
  return order.pack_id ?? order.id
}

function getShippingIdFromOrder(order) {
  return order.shipping?.id ?? null
}

async function resolveShippingId(orderId, meliUserId, orderRaw) {
  const fromOrder = getShippingIdFromOrder(orderRaw || {})
  if (fromOrder) return fromOrder

  try {
    const shipment = await meliFetch(`/orders/${orderId}/shipments`, {}, meliUserId)
    return shipment?.id ?? null
  } catch {
    return null
  }
}

async function fetchLabelPdf(shipmentId, meliUserId) {
  const { buffer } = await meliFetchBinary(
    `/shipment_labels?shipment_ids=${shipmentId}&response_type=pdf`,
    {},
    meliUserId
  )
  if (!buffer || buffer.length < 100) throw new Error('label_empty')
  if (buffer[0] !== 0x25 || buffer[1] !== 0x50) throw new Error('label_not_pdf')
  return buffer
}

async function listFiscalDocuments(packId, meliUserId) {
  const data = await meliFetch(`/packs/${packId}/fiscal_documents`, {}, meliUserId)
  return data?.fiscal_documents ?? []
}

async function fetchFiscalDocumentPdf(packId, docId, meliUserId) {
  const { buffer } = await meliFetchBinary(
    `/packs/${packId}/fiscal_documents/${encodeURIComponent(docId)}`,
    {},
    meliUserId
  )
  return buffer
}

function periodKeyFromDate(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

async function fetchOrderBillingDocumentIds(orderId, meliUserId) {
  const data = await meliFetch(
    `/billing/integration/group/ML/order/details?order_ids=${orderId}`,
    {},
    meliUserId
  )
  const result = data?.results?.[0]
  if (!result) return []

  const ids = new Set()
  for (const detail of result.details ?? []) {
    const docId = detail.document_info?.document_id
    const status = detail.charge_info?.legal_document_status
    if (docId && status === 'PROCESSED') ids.add(Number(docId))
  }
  return [...ids]
}

async function findBillingFileId(documentId, meliUserId, orderDate) {
  const keys = []
  if (orderDate) {
    keys.push(periodKeyFromDate(orderDate))
    const nextMonth = new Date(orderDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    keys.push(periodKeyFromDate(nextMonth))
  }

  try {
    const periods = await meliFetch('/billing/integration/monthly/periods?group=ML&limit=6', {}, meliUserId)
    const list = periods?.results ?? periods?.periods ?? periods ?? []
    for (const p of list) {
      const key = p.key ?? p.period_key ?? p.date_from
      if (key) keys.push(String(key).slice(0, 10))
    }
  } catch {
    // billing periods may not be available for all accounts
  }

  for (const key of [...new Set(keys)]) {
    try {
      const data = await meliFetch(
        `/billing/integration/periods/key/${key}/documents?group=ML&document_type=BILL&document_id=${documentId}&limit=5`,
        {},
        meliUserId
      )
      const docs = data?.results ?? data?.documents ?? []
      for (const doc of docs) {
        const fileIds = doc.file_ids ?? (doc.file_id ? [doc.file_id] : [])
        const pdfFileId = fileIds.find((id) => String(id).toLowerCase().includes('pdf'))
        if (pdfFileId) return pdfFileId
        if (fileIds[0]) return fileIds[0]
      }
    } catch {
      continue
    }
  }

  return null
}

async function fetchBillingLegalDocumentPdf(fileId, meliUserId) {
  const { buffer } = await meliFetchBinary(
    `/billing/integration/legal_document/${encodeURIComponent(fileId)}`,
    {},
    meliUserId
  )
  return buffer
}

async function syncBillingDocument(meliOrderId, meliUserId, orderDate) {
  const documentIds = await fetchOrderBillingDocumentIds(meliOrderId, meliUserId)
  if (!documentIds.length) return null

  for (const documentId of documentIds) {
    const fileId = await findBillingFileId(documentId, meliUserId, orderDate)
    if (!fileId) continue

    try {
      const buffer = await fetchBillingLegalDocumentPdf(fileId, meliUserId)
      const key = `sales/ml-${meliOrderId}-billing.pdf`
      await uploadBuffer(key, buffer, 'application/pdf')
      return {
        billing_storage_key: key,
        billing_synced_at: new Date(),
        billing_document_id: documentId,
        billing_file_id: fileId,
      }
    } catch (err) {
      console.warn('[meli-docs] billing pdf failed', meliOrderId, documentId, err.message)
    }
  }

  return null
}

async function getMeliOrderRow(meliOrderId) {
  const { rows } = await getPool().query('SELECT * FROM meli_orders WHERE meli_order_id = $1', [
    meliOrderId,
  ])
  return rows[0] ?? null
}

async function syncMeliOrderDocuments(meliOrderId, meliUserId) {
  const row = await getMeliOrderRow(meliOrderId)
  if (!row) return { error: 'order_not_found' }

  const order = row.raw || {}
  const packId = row.pack_id ?? getPackIdFromOrder(order)
  const shippingStatus = row.shipping_status ?? order.shipping?.status
  const updates = {}

  const needsLabel =
    !SHIPPED_STATUSES.has(shippingStatus) && LABEL_AVAILABLE_STATUSES.has(shippingStatus)

  if (needsLabel && !row.label_storage_key) {
    const shippingId = row.shipping_id ?? await resolveShippingId(meliOrderId, meliUserId, order)
    if (shippingId) {
      try {
        const buffer = await fetchLabelPdf(shippingId, meliUserId)
        const key = `sales/ml-${meliOrderId}-label.pdf`
        await uploadBuffer(key, buffer, 'application/pdf')
        updates.label_storage_key = key
        updates.label_synced_at = new Date()
        if (!row.shipping_id) updates.shipping_id = shippingId
      } catch (err) {
        console.warn('[meli-docs] label fetch failed', meliOrderId, err.message)
      }
    }
  }

  if (!row.invoice_storage_key && packId) {
    try {
      const docs = await listFiscalDocuments(packId, meliUserId)
      const pdfDoc = docs.find(
        (d) => d.file_type === 'application/pdf' || String(d.filename || '').endsWith('.pdf')
      )
      if (pdfDoc) {
        const docId = pdfDoc.id ?? pdfDoc.filename
        const buffer = await fetchFiscalDocumentPdf(packId, docId, meliUserId)
        const key = `sales/ml-${meliOrderId}-invoice.pdf`
        await uploadBuffer(key, buffer, 'application/pdf')
        updates.invoice_storage_key = key
        updates.invoice_synced_at = new Date()
        updates.invoice_document_id = docId
      }
    } catch (err) {
      if (err.status !== 404) {
        console.warn('[meli-docs] invoice fetch failed', meliOrderId, err.message)
      }
    }
  }

  if (!row.billing_storage_key) {
    try {
      const orderDate = row.date_created ?? order.date_created
      const billing = await syncBillingDocument(meliOrderId, meliUserId, orderDate)
      if (billing) Object.assign(updates, billing)
    } catch (err) {
      console.warn('[meli-docs] billing sync failed', meliOrderId, err.message)
    }
  }

  if (Object.keys(updates).length) {
    const fields = Object.keys(updates)
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ')
    await getPool().query(
      `UPDATE meli_orders SET ${setClause} WHERE meli_order_id = $1`,
      [meliOrderId, ...Object.values(updates)]
    )
  }

  return { synced: true, updates }
}

function buildDocumentsInfo(sale, meliOrder) {
  const isMl = sale.channel === 'mercadolibre'
  const shippingStatus = meliOrder?.shipping_status ?? null
  const notShipped = !SHIPPED_STATUSES.has(shippingStatus)
  const labelReady = LABEL_AVAILABLE_STATUSES.has(shippingStatus)

  return {
    meli_order_id: meliOrder?.meli_order_id ?? null,
    shipping_status: shippingStatus,
    has_invoice: Boolean(meliOrder?.invoice_storage_key),
    invoice_url: meliOrder?.invoice_storage_key
      ? getPublicUrl(meliOrder.invoice_storage_key)
      : null,
    has_billing: Boolean(meliOrder?.billing_storage_key),
    billing_url: meliOrder?.billing_storage_key
      ? getPublicUrl(meliOrder.billing_storage_key)
      : null,
    has_label: Boolean(meliOrder?.label_storage_key),
    label_url: meliOrder?.label_storage_key ? getPublicUrl(meliOrder.label_storage_key) : null,
    can_fetch_label: isMl && notShipped && (labelReady || shippingStatus === 'pending'),
    can_fetch_invoice: isMl && Boolean(meliOrder?.meli_order_id),
    can_fetch_billing: isMl && Boolean(meliOrder?.meli_order_id),
  }
}

async function getSaleDocumentsInfo(saleId) {
  const { rows } = await getPool().query(
    `SELECT s.id, s.channel, s.external_id,
            mo.meli_order_id, mo.shipping_status, mo.shipping_id, mo.pack_id,
            mo.label_storage_key, mo.label_synced_at,
            mo.invoice_storage_key, mo.invoice_synced_at,
            mo.billing_storage_key, mo.billing_synced_at
     FROM sales s
     LEFT JOIN meli_orders mo ON mo.sale_id = s.id
       OR (s.channel = 'mercadolibre' AND s.external_id IS NOT NULL AND mo.meli_order_id = s.external_id::bigint)
     WHERE s.id = $1`,
    [saleId]
  )
  const row = rows[0]
  if (!row) return null

  const sale = { id: row.id, channel: row.channel, external_id: row.external_id }
  const meliOrder = row.meli_order_id
    ? {
        meli_order_id: row.meli_order_id,
        shipping_status: row.shipping_status,
        label_storage_key: row.label_storage_key,
        invoice_storage_key: row.invoice_storage_key,
        billing_storage_key: row.billing_storage_key,
      }
    : null

  return buildDocumentsInfo(sale, meliOrder)
}

async function streamStoragePdf(key, res) {
  const object = await getS3Client().send(
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    })
  )

  if (!object.Body) {
    const err = new Error('not_found')
    err.status = 404
    throw err
  }

  res.set('Content-Type', object.ContentType || 'application/pdf')
  res.set('Content-Disposition', `inline; filename="${key.split('/').pop()}"`)
  object.Body.pipe(res)
}

async function streamSaleDocument(saleId, type, res) {
  const { rows } = await getPool().query(
    `SELECT s.channel, s.external_id, mo.*
     FROM sales s
     LEFT JOIN meli_orders mo ON mo.sale_id = s.id
       OR (s.channel = 'mercadolibre' AND s.external_id IS NOT NULL AND mo.meli_order_id = s.external_id::bigint)
     WHERE s.id = $1`,
    [saleId]
  )
  const row = rows[0]
  if (!row || row.channel !== 'mercadolibre') {
    const err = new Error('not_meli_sale')
    err.status = 404
    throw err
  }

  const meliOrderId = row.meli_order_id ?? Number(row.external_id)
  const meliUserId = row.meli_user_id

  if (!meliOrderId || !meliUserId) {
    const err = new Error('meli_order_missing')
    err.status = 404
    throw err
  }

  const storageKey =
    type === 'label'
      ? row.label_storage_key
      : type === 'billing'
        ? row.billing_storage_key
        : row.invoice_storage_key
  if (storageKey) {
    return streamStoragePdf(storageKey, res)
  }

  await syncMeliOrderDocuments(meliOrderId, meliUserId)
  const refreshed = await getMeliOrderRow(meliOrderId)
  const key =
    type === 'label'
      ? refreshed?.label_storage_key
      : type === 'billing'
        ? refreshed?.billing_storage_key
        : refreshed?.invoice_storage_key

  if (!key) {
    const messages = {
      label: 'label_not_available',
      billing: 'billing_not_available',
      invoice: 'invoice_not_available',
    }
    const err = new Error(messages[type] || 'document_not_available')
    err.status = 404
    throw err
  }

  return streamStoragePdf(key, res)
}

module.exports = {
  SHIPPED_STATUSES,
  LABEL_AVAILABLE_STATUSES,
  syncMeliOrderDocuments,
  getSaleDocumentsInfo,
  buildDocumentsInfo,
  streamSaleDocument,
}
