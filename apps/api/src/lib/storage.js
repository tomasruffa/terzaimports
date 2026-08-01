const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')

let s3Client

function getS3Client() {
  if (!s3Client) {
    const endpoint = process.env.S3_ENDPOINT
    const accessKeyId = process.env.S3_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

    if (!endpoint || !accessKeyId || !secretAccessKey || !process.env.S3_BUCKET) {
      throw new Error('Configurá S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID y S3_SECRET_ACCESS_KEY')
    }

    s3Client = new S3Client({
      endpoint,
      region: process.env.S3_REGION || 'auto',
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle:
        process.env.S3_FORCE_PATH_STYLE === 'true' ||
        endpoint.includes('storageapi.dev') ||
        endpoint.includes('railway.app'),
    })
  }
  return s3Client
}

function getPublicUrl(key) {
  const apiBase = (
    process.env.API_PUBLIC_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '')
  ).replace(/\/$/, '')

  if (apiBase) {
    return `${apiBase}/api/storage/${key}`
  }

  return `/api/storage/${key}`
}

async function uploadProductImage(file, sku) {
  const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'jpg'
  const safeSku = sku.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
  const key = `products/${safeSku}-${Date.now()}.${ext}`

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  )

  return getPublicUrl(key)
}

module.exports = { getS3Client, uploadProductImage, getPublicUrl }
