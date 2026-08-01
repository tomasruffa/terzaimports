export const WA_NUMBER = '5491170751477'

export function whatsAppHref(productName: string) {
  const text = encodeURIComponent(
    `Hola! Me interesa el producto *${productName}* de terzaimports.com.ar. ¿Podrían darme precio y disponibilidad?`
  )
  return `https://wa.me/${WA_NUMBER}?text=${text}`
}
