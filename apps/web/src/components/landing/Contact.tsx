'use client'
import { useState } from 'react'
import { Phone, MapPin, MessageCircle, Send } from 'lucide-react'

const WA_NUMBER = '5491170751477'

export default function Contact() {
  const [form, setForm] = useState({ nombre: '', empresa: '', mensaje: '' })

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const lines = [
      `Hola! Te escribo desde *terzaimports.com.ar*`,
      `*Nombre:* ${form.nombre}`,
      form.empresa ? `*Empresa:* ${form.empresa}` : null,
      ``,
      form.mensaje,
    ].filter(l => l !== null).join('\n')

    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines)}`, '_blank')
  }

  return (
    <section id="contacto" className="py-24 bg-terza-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-terza-blue-bright text-sm font-semibold tracking-widest uppercase">Contacto</span>
          <h2 className="section-title mt-3">Hablemos</h2>
          <p className="section-subtitle">
            Contanos qué necesitás y te respondemos en minutos por WhatsApp.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Info */}
          <div>
            <h3 className="text-white text-2xl font-bold mb-8">Información de contacto</h3>

            <div className="space-y-6 mb-10">
              {[
                { icon: Phone, label: 'WhatsApp', value: '+54 9 11 7075-1477' },
                { icon: MapPin, label: 'Ubicación', value: 'Buenos Aires, Argentina' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-terza-blue/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <item.icon size={20} className="text-terza-blue-bright" />
                  </div>
                  <div>
                    <div className="text-terza-gray text-sm">{item.label}</div>
                    <div className="text-white font-medium">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card-dark">
              <div className="flex items-center gap-3 mb-3">
                <MessageCircle size={20} className="text-green-400" />
                <span className="text-white font-semibold">WhatsApp Business</span>
              </div>
              <p className="text-terza-gray text-sm mb-4">
                Respondemos en minutos. Mandanos un mensaje y te asesoramos sin compromiso.
              </p>
              <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm">
                <MessageCircle size={16} />
                Escribir por WhatsApp
              </a>
            </div>
          </div>

          {/* Form → WhatsApp */}
          <div className="card-dark">
            <h3 className="text-white font-bold text-xl mb-2">Envianos un mensaje</h3>
            <p className="text-terza-gray text-sm mb-6">Completá el formulario y te vamos a redirigir a WhatsApp con todo ya escrito.</p>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-terza-gray text-sm mb-1 block">Nombre *</label>
                  <input
                    type="text"
                    required
                    placeholder="Tu nombre"
                    value={form.nombre}
                    onChange={e => set('nombre', e.target.value)}
                    className="w-full bg-terza-navy border border-terza-gray-dark/50 rounded-lg px-4 py-3 text-white
                      placeholder-terza-gray/50 focus:outline-none focus:border-terza-blue transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="text-terza-gray text-sm mb-1 block">Empresa</label>
                  <input
                    type="text"
                    placeholder="Tu empresa (opcional)"
                    value={form.empresa}
                    onChange={e => set('empresa', e.target.value)}
                    className="w-full bg-terza-navy border border-terza-gray-dark/50 rounded-lg px-4 py-3 text-white
                      placeholder-terza-gray/50 focus:outline-none focus:border-terza-blue transition-colors text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-terza-gray text-sm mb-1 block">¿Qué necesitás? *</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Contanos qué productos necesitás, volúmenes aproximados, etc."
                  value={form.mensaje}
                  onChange={e => set('mensaje', e.target.value)}
                  className="w-full bg-terza-navy border border-terza-gray-dark/50 rounded-lg px-4 py-3 text-white
                    placeholder-terza-gray/50 focus:outline-none focus:border-terza-blue transition-colors text-sm resize-none"
                />
              </div>
              <button type="submit" className="bg-green-600 hover:bg-green-500 text-white font-semibold w-full flex items-center justify-center gap-2 py-3 rounded-lg transition-colors">
                <Send size={16} />
                Enviar por WhatsApp
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
