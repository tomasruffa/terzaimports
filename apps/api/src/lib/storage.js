const { supabase } = require('./supabase')

const BUCKET = 'products'

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === BUCKET)
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: true })
  }
}

async function uploadProductImage(file, sku) {
  await ensureBucket()

  const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'jpg'
  const safeSku = sku.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
  const filename = `${safeSku}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file.buffer, { upsert: true, contentType: file.mimetype })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  return data.publicUrl
}

module.exports = { uploadProductImage }
