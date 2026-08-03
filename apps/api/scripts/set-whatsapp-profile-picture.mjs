/**
 * Configura la foto de perfil del WhatsApp Business en Kapso/Meta.
 *
 * Uso:
 *   node scripts/set-whatsapp-profile-picture.mjs [image-url]
 *
 * Default: logo cuadrado de Terza en Vercel.
 */
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../../../.env') })

const KAPSO_API_KEY = process.env.KAPSO_API_KEY
const PHONE_NUMBER_ID = process.env.KAPSO_PHONE_NUMBER_ID
const IMAGE_URL =
  process.argv[2] ||
  process.env.WHATSAPP_PROFILE_IMAGE_URL ||
  'https://terzaimports-web.vercel.app/logo/terza-icon-square.png'

const ABOUT = process.env.WHATSAPP_PROFILE_ABOUT || 'Terza Imports — tecnología y estilo'
const WEBSITE = process.env.WHATSAPP_PROFILE_WEBSITE || 'https://terzaimports.com.ar'

async function main() {
  if (!KAPSO_API_KEY || !PHONE_NUMBER_ID) {
    throw new Error('Faltan KAPSO_API_KEY y KAPSO_PHONE_NUMBER_ID')
  }

  console.log('Subiendo imagen:', IMAGE_URL)

  const uploadRes = await fetch('https://api.kapso.ai/platform/v1/whatsapp/media', {
    method: 'POST',
    headers: {
      'X-API-Key': KAPSO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      media_ingest: {
        phone_number_id: PHONE_NUMBER_ID,
        source: IMAGE_URL,
        delivery: 'meta_resumable_asset',
        filename: 'terza-profile.png',
        mime_type: 'image/png',
      },
    }),
  })

  const uploadJson = await uploadRes.json().catch(() => ({}))
  if (!uploadRes.ok) {
    console.error('Upload error:', uploadRes.status, uploadJson)
    throw new Error(uploadJson?.error || 'upload_failed')
  }

  const handle = uploadJson?.data?.target?.handle
  if (!handle) {
    console.error('Upload response:', uploadJson)
    throw new Error('No se obtuvo handle de la imagen')
  }

  console.log('Handle:', handle)
  console.log('Actualizando perfil de negocio...')

  const profileRes = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${PHONE_NUMBER_ID}/whatsapp_business_profile`,
    {
      method: 'POST',
      headers: {
        'X-API-Key': KAPSO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        about: ABOUT,
        vertical: 'RETAIL',
        websites: [WEBSITE],
        profile_picture_handle: handle,
      }),
    }
  )

  const profileJson = await profileRes.json().catch(() => ({}))
  if (!profileRes.ok) {
    console.error('Profile error:', profileRes.status, profileJson)
    throw new Error(profileJson?.error?.message || profileJson?.error || 'profile_update_failed')
  }

  console.log('Perfil actualizado:', profileJson)

  const getRes = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${PHONE_NUMBER_ID}/whatsapp_business_profile?fields=about,profile_picture_url,websites,vertical`,
    { headers: { 'X-API-Key': KAPSO_API_KEY } }
  )
  const getJson = await getRes.json().catch(() => ({}))
  console.log('Perfil actual:', JSON.stringify(getJson, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
