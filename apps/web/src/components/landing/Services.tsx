import { Ship, FileText, BarChart3, Users, Repeat, Search } from 'lucide-react'

const services = [
  {
    icon: Ship,
    title: 'Importación directa',
    desc: 'Nos encargamos de todo el proceso: búsqueda de proveedor, negociación, compra y flete internacional.'
  },
  {
    icon: FileText,
    title: 'Gestión aduanera',
    desc: 'Tramitamos toda la documentación de aduana, aranceles y permisos de importación por vos.'
  },
  {
    icon: BarChart3,
    title: 'Venta mayorista',
    desc: 'Precios especiales por volumen para revendedores, distribuidores y empresas.'
  },
  {
    icon: Search,
    title: 'Sourcing a pedido',
    desc: 'Si necesitás un producto que no tenemos en stock, lo buscamos y conseguimos para vos.'
  },
  {
    icon: Repeat,
    title: 'Reposición automática',
    desc: 'Programá tu stock mínimo y te avisamos cuando sea hora de reponer tus productos más vendidos.'
  },
  {
    icon: Users,
    title: 'Cuenta corporativa',
    desc: 'Atención personalizada, crédito comercial y condiciones especiales para empresas.'
  },
]

export default function Services() {
  return (
    <section id="servicios" className="py-24 bg-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-terza-blue text-sm font-semibold tracking-widest uppercase">Servicios</span>
          <h2 className="section-title-light mt-3">Todo lo que necesitás</h2>
          <p className="section-subtitle-light">
            Desde la importación hasta la entrega en tu puerta, somos tu socio estratégico de comercio exterior.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(s => (
            <div key={s.title}
              className="card-light group flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-terza-blue/10 rounded-xl flex items-center justify-center group-hover:bg-terza-blue/20 transition-colors">
                <s.icon size={22} className="text-terza-blue" />
              </div>
              <div>
                <h3 className="text-gray-900 font-semibold mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
