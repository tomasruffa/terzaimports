import { Shield, Truck, Globe, Headphones } from 'lucide-react'

const values = [
  {
    icon: Globe,
    title: 'Alcance Global',
    desc: 'Trabajamos con proveedores en más de 50 países para traerte los mejores productos del mundo.'
  },
  {
    icon: Shield,
    title: 'Calidad Garantizada',
    desc: 'Cada producto pasa por un riguroso control de calidad antes de llegar a nuestro stock.'
  },
  {
    icon: Truck,
    title: 'Logística Eficiente',
    desc: 'Gestionamos todo el proceso de importación, aduana y distribución por vos.'
  },
  {
    icon: Headphones,
    title: 'Soporte Dedicado',
    desc: 'Nuestro equipo está disponible para asesorarte en cada paso de la compra.'
  },
]

export default function About() {
  return (
    <section id="nosotros" className="py-24 bg-terza-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <span className="text-terza-blue-bright text-sm font-semibold tracking-widest uppercase">Quiénes somos</span>
            <h2 className="section-title mt-3">
              Importaciones que<br />
              <span className="gradient-text">mueven tu negocio</span>
            </h2>
            <p className="text-terza-gray text-lg leading-relaxed mb-6">
              Terza Imports nació con una misión clara: democratizar el acceso a productos de calidad internacional.
              Somos el puente entre los mejores fabricantes del mundo y los negocios argentinos.
            </p>
            <p className="text-terza-gray leading-relaxed mb-8">
              Con años de experiencia en comercio exterior, hemos construido una red de proveedores confiables
              que nos permite ofrecer productos innovadores a precios competitivos, con stock disponible
              y entregas rápidas en todo el país.
            </p>
            <div className="flex gap-8">
              <div>
                <div className="text-3xl font-black gradient-text">5+</div>
                <div className="text-terza-gray text-sm">Años de experiencia</div>
              </div>
              <div>
                <div className="text-3xl font-black gradient-text">98%</div>
                <div className="text-terza-gray text-sm">Clientes satisfechos</div>
              </div>
              <div>
                <div className="text-3xl font-black gradient-text">24h</div>
                <div className="text-terza-gray text-sm">Tiempo de respuesta</div>
              </div>
            </div>
          </div>

          {/* Right: values grid */}
          <div className="grid grid-cols-2 gap-4">
            {values.map(v => (
              <div key={v.title} className="card-dark hover:border-terza-blue/40 transition-all duration-300 group">
                <div className="w-10 h-10 bg-terza-blue/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-terza-blue/20 transition-colors">
                  <v.icon size={20} className="text-terza-blue-bright" />
                </div>
                <h3 className="text-white font-semibold mb-2">{v.title}</h3>
                <p className="text-terza-gray text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
