'use client'
import { useState, useRef, useCallback } from 'react'
import { X, Save, Upload, Trash2, ImagePlus, GripVertical } from 'lucide-react'
import Image from 'next/image'
import { apiFetch } from '@/utils/apiFetch'
import { getSupabaseClient } from '@/lib/supabase'

interface Product {
  id?: string
  name: string
  sku: string
  category: string
  purchase_price: number
  sale_price: number
  stock_quantity: number
  min_stock: number
  unit: string
  supplier: string | null
  origin_country: string | null
  image_url: string | null
  images: string[]
}

interface Props {
  product: Product | null
  onClose: () => void
  onSaved: () => void
}

const EMPTY: Product = {
  name: '', sku: '', category: '', purchase_price: 0, sale_price: 0,
  stock_quantity: 0, min_stock: 5, unit: 'unidad', supplier: '',
  origin_country: '', image_url: null, images: []
}

async function ensureBucket(supabase: ReturnType<typeof getSupabaseClient>) {
  if (!supabase) return
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some((b: { name: string }) => b.name === 'products')
  if (!exists) {
    await supabase.storage.createBucket('products', { public: true })
  }
}

async function uploadImage(file: File, sku: string): Promise<string> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error('Supabase no disponible')

  await ensureBucket(supabase)

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const safeSku = sku.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
  const filename = `${safeSku}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('products')
    .upload(filename, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('products').getPublicUrl(filename)
  return data.publicUrl
}

export default function ProductModal({ product, onClose, onSaved }: Props) {
  const initialForm: Product = product
    ? { ...EMPTY, ...product, images: (product as any).images ?? [], image_url: (product as any).image_url ?? null }
    : EMPTY

  const [form, setForm] = useState<Product>(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof Product, v: string | number | null | string[]) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (!form.sku) {
      setError('Ingresá el SKU antes de subir imágenes')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        const url = await uploadImage(file, form.sku)
        urls.push(url)
      }
      setForm(f => {
        const newImages = [...f.images, ...urls]
        return { ...f, images: newImages, image_url: newImages[0] ?? f.image_url }
      })
    } catch (e: any) {
      setError(`Error subiendo imagen: ${e.message}`)
    } finally {
      setUploading(false)
    }
  }, [form.sku])

  const removeImage = (idx: number) => {
    setForm(f => {
      const newImages = f.images.filter((_, i) => i !== idx)
      return { ...f, images: newImages, image_url: newImages[0] ?? null }
    })
  }

  const moveFirst = (idx: number) => {
    if (idx === 0) return
    setForm(f => {
      const newImages = [f.images[idx], ...f.images.filter((_, i) => i !== idx)]
      return { ...f, images: newImages, image_url: newImages[0] }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const method = product?.id ? 'PUT' : 'POST'
      const path = product?.id ? `/api/products/${product.id}` : `/api/products`
      const payload = { ...form, image_url: form.images[0] ?? form.image_url }
      const res = await apiFetch(path, { method, body: JSON.stringify(payload) })
      const json = await res.json()
      if (json.error) setError(json.error)
      else onSaved()
    } catch {
      setError('Error de conexión con la API')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-terza-navy-light border border-terza-gray-dark/40 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-terza-gray-dark/30">
          <h2 className="text-white font-bold text-lg">{product?.id ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button onClick={onClose} className="text-terza-gray hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>
          )}

          {/* ── Imágenes ── */}
          <div>
            <label className="text-terza-gray text-sm mb-2 block">Imágenes del producto</label>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                ${dragOver ? 'border-terza-blue bg-terza-blue/10' : 'border-terza-gray-dark/50 hover:border-terza-blue/50 hover:bg-terza-blue/5'}`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-terza-blue border-t-transparent rounded-full animate-spin" />
                  <span className="text-terza-gray text-sm">Subiendo...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <ImagePlus size={28} className="text-terza-gray/50" />
                  <span className="text-terza-gray text-sm">
                    Arrastrá imágenes acá o <span className="text-terza-blue-bright underline">hacé click</span>
                  </span>
                  <span className="text-terza-gray/50 text-xs">JPG, PNG, WEBP · múltiples archivos</span>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
              />
            </div>

            {/* Thumbnails */}
            {form.images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {form.images.map((url, i) => (
                  <div key={url} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-terza-gray-dark/40">
                    <Image src={url} alt="" fill className="object-cover" sizes="80px" />

                    {/* Primary badge */}
                    {i === 0 && (
                      <span className="absolute top-1 left-1 bg-terza-blue text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Principal
                      </span>
                    )}

                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      {i !== 0 && (
                        <button
                          type="button"
                          onClick={() => moveFirst(i)}
                          title="Hacer principal"
                          className="w-6 h-6 bg-terza-blue rounded flex items-center justify-center hover:bg-terza-blue-light transition-colors"
                        >
                          <GripVertical size={12} className="text-white" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="w-6 h-6 bg-red-600 rounded flex items-center justify-center hover:bg-red-500 transition-colors"
                      >
                        <Trash2 size={12} className="text-white" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add more */}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border border-dashed border-terza-gray-dark/50 hover:border-terza-blue/50 flex items-center justify-center text-terza-gray/50 hover:text-terza-blue-bright transition-colors"
                >
                  <Upload size={18} />
                </button>
              </div>
            )}
          </div>

          {/* ── Campos del producto ── */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nombre *">
              <input value={form.name} onChange={e => set('name', e.target.value)} required className="input-field" placeholder="Nombre del producto" />
            </Field>
            <Field label="SKU *">
              <input value={form.sku} onChange={e => set('sku', e.target.value)} required className="input-field" placeholder="CAB-USBC-2M" />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Categoría *">
              <input value={form.category} onChange={e => set('category', e.target.value)} required className="input-field" placeholder="Cables, Audio..." />
            </Field>
            <Field label="Unidad">
              <input value={form.unit} onChange={e => set('unit', e.target.value)} className="input-field" placeholder="unidad, kg, m..." />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Precio de compra (USD)">
              <input type="number" step="0.01" min="0" value={form.purchase_price} onChange={e => set('purchase_price', parseFloat(e.target.value))} className="input-field" />
            </Field>
            <Field label="Precio de venta (USD)">
              <input type="number" step="0.01" min="0" value={form.sale_price} onChange={e => set('sale_price', parseFloat(e.target.value))} className="input-field" />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Stock inicial">
              <input type="number" min="0" value={form.stock_quantity} onChange={e => set('stock_quantity', parseInt(e.target.value))} className="input-field" />
            </Field>
            <Field label="Stock mínimo">
              <input type="number" min="0" value={form.min_stock} onChange={e => set('min_stock', parseInt(e.target.value))} className="input-field" />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Proveedor">
              <input value={form.supplier ?? ''} onChange={e => set('supplier', e.target.value)} className="input-field" placeholder="Nombre del proveedor" />
            </Field>
            <Field label="País de origen">
              <input value={form.origin_country ?? ''} onChange={e => set('origin_country', e.target.value)} className="input-field" placeholder="China, Vietnam..." />
            </Field>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving || uploading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? 'Guardando...' : 'Guardar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-terza-gray text-sm mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}
