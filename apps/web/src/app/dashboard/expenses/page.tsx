'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit, DollarSign, CreditCard, Zap } from 'lucide-react'
import ExpenseModal from '@/components/dashboard/ExpenseModal'

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  payment_method: string | null
  expense_date: string
  notes: string | null
  created_at: string
}

import { apiFetch } from '@/utils/apiFetch'

const DEMO_EXPENSES: Expense[] = [
  { id: '1', category: 'Comisiones', description: 'Comisión Mercado Pago', amount: 450.50, payment_method: 'Débito', expense_date: new Date().toISOString().split('T')[0], notes: 'Mes de junio', created_at: new Date().toISOString() },
  { id: '2', category: 'Servicios', description: 'Hosting Supabase', amount: 25, payment_method: 'Tarjeta', expense_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], notes: null, created_at: new Date().toISOString() },
  { id: '3', category: 'Oficina', description: 'Alquiler local', amount: 1200, payment_method: 'Transferencia', expense_date: new Date(Date.now() - 172800000).toISOString().split('T')[0], notes: 'Junio 2026', created_at: new Date().toISOString() },
]

const categoryColors = {
  Comisiones: { icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  Servicios: { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  Oficina: { icon: CreditCard, color: 'text-green-400', bg: 'bg-green-500/10' },
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)

  const fetchExpenses = async () => {
    try {
      const res = await apiFetch(`/api/expenses?limit=50`)
      const json = await res.json()
      if (json.data) setExpenses(json.data)
      else { setExpenses(DEMO_EXPENSES); setIsDemo(true) }
    } catch {
      setExpenses(DEMO_EXPENSES)
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchExpenses() }, [])

  const handleEdit = (e: Expense) => { setEditExpense(e); setModalOpen(true) }
  const handleNew = () => { setEditExpense(null); setModalOpen(true) }
  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return
    try {
      await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' })
      fetchExpenses()
    } catch { }
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {isDemo && (
        <div className="bg-terza-blue/10 border border-terza-blue/30 rounded-xl px-4 py-3 text-terza-blue-bright text-sm">
          Mostrando datos de demo. Conectá la API para ver datos reales.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Gastos Operacionales</h2>
          <p className="text-terza-gray text-sm">Registra fees, servicios, alquileres y otros gastos</p>
        </div>
        <button onClick={handleNew} className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
          <Plus size={16} />
          Nuevo gasto
        </button>
      </div>

      {/* Resumen */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-dark">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-terza-gray text-sm">Total</p>
              <p className="text-2xl font-bold text-white mt-1">${total.toFixed(2)}</p>
            </div>
            <DollarSign size={24} className="text-terza-blue-bright opacity-50" />
          </div>
        </div>
        {Object.entries(byCategory).map(([cat, amount]) => {
          const cfg = categoryColors[cat as keyof typeof categoryColors] || { icon: DollarSign, color: 'text-gray-400', bg: 'bg-gray-500/10' }
          return (
            <div key={cat} className="card-dark">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-terza-gray text-xs">{cat}</p>
                  <p className="text-xl font-bold text-white mt-1">${amount.toFixed(2)}</p>
                </div>
                <cfg.icon size={20} className={cfg.color} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabla */}
      <div className="card-dark p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-terza-gray-dark/30">
                {['Categoría', 'Descripción', 'Monto', 'Método', 'Fecha', 'Notas'].map(h => (
                  <th key={h} className="text-left text-terza-gray text-xs uppercase px-4 py-3">{h}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-terza-gray">Cargando...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-terza-gray">Sin gastos registrados</td></tr>
              ) : expenses.map(e => {
                const cfg = categoryColors[e.category as keyof typeof categoryColors]
                const Icon = cfg?.icon || DollarSign
                return (
                  <tr key={e.id} className="border-b border-terza-gray-dark/20 hover:bg-terza-navy-medium/50">
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-2 ${cfg?.color} ${cfg?.bg} px-2.5 py-1 rounded-full text-xs font-medium`}>
                        <Icon size={12} />
                        {e.category}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white text-sm">{e.description}</td>
                    <td className="px-4 py-3 text-white font-bold">${e.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-terza-gray text-sm">{e.payment_method || '—'}</td>
                    <td className="px-4 py-3 text-terza-gray text-sm">
                      {new Date(e.expense_date).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-terza-gray text-xs max-w-[200px] truncate">{e.notes || '—'}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => handleEdit(e)} className="text-terza-gray hover:text-terza-blue-bright transition p-1">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(e.id)} className="text-terza-gray hover:text-red-400 transition p-1">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <ExpenseModal
          expense={editExpense}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchExpenses() }}
        />
      )}
    </div>
  )
}
