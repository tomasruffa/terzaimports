import { ArrowRight, Globe, Package, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-terza-gradient" />
      <div className="absolute inset-0 bg-glow-gradient" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(37,99,235,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,99,235,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-terza-blue/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-800/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-terza-blue/10 border border-terza-blue/30 rounded-full px-4 py-2 mb-8">
              <Globe size={14} className="text-terza-blue-bright" />
              <span className="text-terza-blue-bright text-sm font-medium">Importaciones globales</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight tracking-tight">
              <span className="text-white">TERZA</span>
              <br />
              <span className="gradient-text">IMPORTS</span>
            </h1>

            <p className="text-terza-gray text-xl mb-4 leading-relaxed">
              Conectamos el mundo con tu negocio. Importamos y distribuimos productos de
              <span className="text-white font-semibold"> alta calidad</span> al mejor precio del mercado.
            </p>
            <p className="text-terza-gray/70 text-base mb-10">
              Tecnología, accesorios y más — directamente desde origen hasta tu puerta.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#productos" className="btn-primary flex items-center justify-center gap-2 text-base">
                Ver Catálogo
                <ArrowRight size={18} />
              </a>
              <a href="#contacto" className="btn-secondary flex items-center justify-center gap-2 text-base">
                Contactanos
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-16 pt-10 border-t border-terza-gray-dark/40">
              {[
                { value: '500+', label: 'Productos' },
                { value: '50+', label: 'Países de origen' },
                { value: '1000+', label: 'Clientes' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="text-2xl font-black gradient-text">{stat.value}</div>
                  <div className="text-terza-gray text-sm mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: logo / visual */}
          <div className="hidden lg:flex justify-center items-center">
            <div className="relative animate-float">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-full bg-terza-blue/20 blur-2xl scale-110" />

              {/* Logo circle */}
              <div className="relative w-80 h-80 rounded-full bg-terza-navy-medium border border-terza-blue/30 flex flex-col items-center justify-center shadow-2xl shadow-blue-900/50">
                {/* Globe icon stylized */}
                <div className="relative mb-4">
                  <div className="w-32 h-32 rounded-full border-4 border-terza-blue/60 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-2 border-terza-blue-light/40 flex items-center justify-center">
                      <Globe size={48} className="text-terza-blue-bright" strokeWidth={1.5} />
                    </div>
                  </div>
                  {/* Arrow decoration */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-terza-blue rounded-full flex items-center justify-center">
                    <ArrowRight size={14} className="text-white" />
                  </div>
                </div>

                <div className="text-white font-black text-3xl tracking-[0.3em]">TERZA</div>
                <div className="w-20 h-0.5 bg-terza-blue my-2" />
                <div className="text-terza-blue-bright text-xs tracking-[0.4em] font-medium">IMPORTS</div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-terza-navy-light border border-terza-blue/30 rounded-xl p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-terza-blue-bright" />
                  <span className="text-white text-xs font-semibold">Envío a todo el país</span>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-terza-navy-light border border-terza-blue/30 rounded-xl p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-400" />
                  <span className="text-white text-xs font-semibold">Precios mayoristas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <div className="w-0.5 h-8 bg-terza-blue/50 rounded-full" />
        <div className="w-1.5 h-1.5 bg-terza-blue rounded-full" />
      </div>
    </section>
  )
}
