/** Rutas de assets animados (gif / webp animado). Next/Image solo muestra el primer frame. */
export function isAnimatedAsset(src: string) {
  return /\.gif$/i.test(src) || src.includes('transition.webp')
}
