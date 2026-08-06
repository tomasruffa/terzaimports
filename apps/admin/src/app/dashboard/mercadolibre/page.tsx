'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  RefreshCw,
  ShoppingBag,
  Package,
  MessageCircle,
  DollarSign,
  Eye,
  Star,
  AlertCircle,
  ExternalLink,
  CreditCard,
} from 'lucide-react'
import { apiFetch } from '@/utils/apiFetch'

type Tab = 'overview' | 'items' | 'mercadopago' | 'orders' | 'questions'

interface MeliAccount {
  meli_user_id: string
  nickname: string | null
  reputation_level: string | null
  power_seller_status: string | null
  transactions_completed: number
  synced_at: string
}

interface MeliMetrics {
  account: MeliAccount | null
  items: {
    total: number
    active: number
    paused: number
    units_sold: number
    visits_total: number
    visits_last_30d: number
  }
  orders: {
    total: number
    paid: number
    gross_sales: number
    last_30d: number
  }
  questions: {
    total: number
    unanswered: number
  }
  last_sync: {
    status: string
    finished_at: string
    summary: Record<string, unknown> | null
  } | null
}

interface MeliItem {
  meli_item_id: string
  title: string
  status: string
  price: number
  available_quantity: number
  sold_quantity: number
  visits_total: number
  visits_last_30d: number
  permalink: string | null
  thumbnail?: string | null
}

interface MeliOrder {
  meli_order_id: string
  status: string
  buyer_nickname: string | null
  total_amount: number
  currency_id: string | null
  date_created: string | null
  items: Array<{ title: string; quantity: number; unit_price: number }>
}

interface MeliQuestion {
  meli_question_id: string
  meli_item_id: string | null
  text: string | null
  status: string | null
  answer_text: string | null
  date_created: string | null
}

function formatMoney(value: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadge(status: string | null) {
  const s = (status || '').toLowerCase()
  if (s === 'active' || s === 'paid' || s === 'answered') {
    return 'bg-green-500/15 text-green-400'
  }
  if (s === 'paused' || s === 'unanswered') {
    return 'bg-yellow-500/15 text-yellow-400'
  }
  return 'bg-terza-gray/15 text-terza-gray'
}

export default function MercadoLibrePage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [metrics, setMetrics] = useState<MeliMetrics | null>(null)
  const [items, setItems] = useState<MeliItem[]>([])
  const [mpItems, setMpItems] = useState<MeliItem[]>([])
  const [orders, setOrders] = useState<MeliOrder[]>([])
  const [questions, setQuestions] = useState<MeliQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const loadMetrics = useCallback(async () => {
    const res = await apiFetch('/api/mercadolibre/metrics')
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'No se pudieron cargar las métricas')
    setMetrics(json.data)
  }, [])

  const loadTabData = useCallback(async (currentTab: Tab) => {
    if (currentTab === 'items') {
      const res = await apiFetch('/api/mercadolibre/items?limit=50&catalog=marketplace')
      const json = await res.json()
      if (res.ok) setItems(json.data || [])
    }
    if (currentTab === 'mercadopago') {
      const res = await apiFetch('/api/mercadolibre/items?limit=50&catalog=mercadopago')
      const json = await res.json()
      if (res.ok) setMpItems(json.data || [])
    }
    if (currentTab === 'orders') {
      const res = await apiFetch('/api/mercadolibre/orders?limit=50')
      const json = await res.json()
      if (res.ok) setOrders(json.data || [])
    }
    if (currentTab === 'questions') {
      const res = await apiFetch('/api/mercadolibre/questions?limit=50')
      const json = await res.json()
      if (res.ok) setQuestions(json.data || [])
    }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await loadMetrics()
      await loadTabData(tab)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [loadMetrics, loadTabData, tab])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!loading) loadTabData(tab).catch(() => {})
  }, [tab, loading, loadTabData])

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage(null)
    setError(null)
    try {
      const res = await apiFetch('/api/mercadolibre/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error en sincronización')

      const summary = json.items && json.orders
        ? `${json.items.synced} publicaciones, ${json.orders.synced} órdenes, ${json.questions?.synced ?? 0} preguntas`
        : 'Sincronización completada'

      setSyncMessage(summary)
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Resumen' },
    { id: 'items', label: 'Publicaciones' },
    { id: 'mercadopago', label: 'Mercado Pago' },
    { id: 'orders', label: 'Ventas' },
    { id: 'questions', label: 'Preguntas' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-terza-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-terza-gray text-sm">Cargando Mercado Libre...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <ShoppingBag size={20} className="text-yellow-400" />
            Mercado Libre
          </h2>
          <p className="text-terza-gray text-sm">
            {metrics?.account?.nickname
              ? `Cuenta @${metrics.account.nickname} · última sync ${formatDate(metrics.last_sync?.finished_at ?? metrics.account.synced_at)}`
              : 'Conectá tu cuenta desde la API para sincronizar'}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-primary flex items-center gap-2 text-sm py-2 px-4 disabled:opacity-60"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
        </button>
      </div>

      {error && (
        <div className="card-dark border border-red-500/30 flex items-start gap-3 text-red-400 text-sm">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {syncMessage && (
        <div className="card-dark border border-green-500/30 text-green-400 text-sm">
          Sincronización OK: {syncMessage}
        </div>
      )}

      {metrics && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="card-dark flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <DollarSign size={22} className="text-green-400" />
            </div>
            <div>
              <p className="text-terza-gray text-sm">Ventas pagadas</p>
              <p className="text-white text-2xl font-bold">{formatMoney(metrics.orders.gross_sales)}</p>
              <p className="text-terza-gray/60 text-xs mt-1">{metrics.orders.paid} de {metrics.orders.total} órdenes</p>
            </div>
          </div>
          <div className="card-dark flex items-start gap-4">
            <div className="w-12 h-12 bg-terza-blue/10 rounded-xl flex items-center justify-center">
              <Package size={22} className="text-terza-blue-bright" />
            </div>
            <div>
              <p className="text-terza-gray text-sm">Publicaciones</p>
              <p className="text-white text-2xl font-bold">{metrics.items.active}</p>
              <p className="text-terza-gray/60 text-xs mt-1">{metrics.items.paused} pausadas · {metrics.items.units_sold} vendidas</p>
            </div>
          </div>
          <div className="card-dark flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Eye size={22} className="text-purple-400" />
            </div>
            <div>
              <p className="text-terza-gray text-sm">Visitas (30 días)</p>
              <p className="text-white text-2xl font-bold">{metrics.items.visits_last_30d.toLocaleString('es-AR')}</p>
              <p className="text-terza-gray/60 text-xs mt-1">{metrics.items.visits_total.toLocaleString('es-AR')} totales</p>
            </div>
          </div>
          <div className="card-dark flex items-start gap-4">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
              <MessageCircle size={22} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-terza-gray text-sm">Preguntas</p>
              <p className="text-white text-2xl font-bold">{metrics.questions.unanswered}</p>
              <p className="text-terza-gray/60 text-xs mt-1">sin responder · {metrics.questions.total} total</p>
            </div>
          </div>
        </div>
      )}

      {metrics?.account && (
        <div className="card-dark flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2 text-terza-gray">
            <Star size={16} className="text-yellow-400" />
            Reputación: <span className="text-white">{metrics.account.reputation_level || '—'}</span>
          </div>
          <div className="text-terza-gray">
            MercadoLíder: <span className="text-white">{metrics.account.power_seller_status || '—'}</span>
          </div>
          <div className="text-terza-gray">
            Ventas históricas: <span className="text-white">{metrics.account.transactions_completed}</span>
          </div>
          <div className="text-terza-gray">
            Órdenes últimos 30 días: <span className="text-white">{metrics.orders.last_30d}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b border-terza-gray-dark/30">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-terza-blue text-white'
                : 'border-transparent text-terza-gray hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && metrics && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card-dark">
            <h3 className="text-white font-bold mb-4">Resumen de ventas</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-terza-gray">Órdenes totales</dt><dd className="text-white">{metrics.orders.total}</dd></div>
              <div className="flex justify-between"><dt className="text-terza-gray">Órdenes pagadas</dt><dd className="text-white">{metrics.orders.paid}</dd></div>
              <div className="flex justify-between"><dt className="text-terza-gray">Facturación</dt><dd className="text-green-400 font-medium">{formatMoney(metrics.orders.gross_sales)}</dd></div>
              <div className="flex justify-between"><dt className="text-terza-gray">Últimos 30 días</dt><dd className="text-white">{metrics.orders.last_30d} órdenes</dd></div>
            </dl>
          </div>
          <div className="card-dark">
            <h3 className="text-white font-bold mb-4">Catálogo ML</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-terza-gray">Publicaciones activas</dt><dd className="text-white">{metrics.items.active}</dd></div>
              <div className="flex justify-between"><dt className="text-terza-gray">Pausadas</dt><dd className="text-white">{metrics.items.paused}</dd></div>
              <div className="flex justify-between"><dt className="text-terza-gray">Unidades vendidas</dt><dd className="text-white">{metrics.items.units_sold}</dd></div>
              <div className="flex justify-between"><dt className="text-terza-gray">Preguntas pendientes</dt><dd className="text-yellow-400">{metrics.questions.unanswered}</dd></div>
            </dl>
          </div>
        </div>
      )}

      {tab === 'items' && (
        <div className="card-dark overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-terza-gray-dark/30">
                {['Publicación', 'Estado', 'Precio', 'Stock', 'Vendidas', 'Visitas', ''].map((h) => (
                  <th key={h} className="text-left text-terza-gray text-xs uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.meli_item_id} className="border-b border-terza-gray-dark/20 hover:bg-terza-navy-medium/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.thumbnail && (
                        <img src={item.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover bg-terza-navy" />
                      )}
                      <span className="text-white text-sm max-w-xs truncate">{item.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusBadge(item.status)}`}>{item.status}</span>
                  </td>
                  <td className="px-4 py-3 text-white text-sm">{formatMoney(item.price)}</td>
                  <td className="px-4 py-3 text-white text-sm">{item.available_quantity}</td>
                  <td className="px-4 py-3 text-terza-gray text-sm">{item.sold_quantity}</td>
                  <td className="px-4 py-3 text-terza-gray text-sm">{item.visits_last_30d}</td>
                  <td className="px-4 py-3">
                    {item.permalink && (
                      <a href={item.permalink} target="_blank" rel="noopener noreferrer" className="text-terza-blue-bright hover:text-white">
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="text-terza-gray text-sm p-6 text-center">No hay publicaciones sincronizadas</p>}
        </div>
      )}

      {tab === 'mercadopago' && (
        <div className="space-y-4">
          <div className="card-dark border border-sky-500/20 bg-sky-500/5 flex items-start gap-3 text-sm">
            <CreditCard size={18} className="text-sky-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium">Productos de cobro Mercado Pago</p>
              <p className="text-terza-gray text-xs mt-1">
                Estos ítems no son publicaciones del catálogo ML. Se gestionan aparte y no se mezclan con el inventario Terza.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mpItems.map((item) => (
              <div key={item.meli_item_id} className="card-dark !p-4 flex gap-3">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="" className="w-16 h-16 rounded-xl object-cover bg-terza-navy shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-terza-navy flex items-center justify-center shrink-0">
                    <CreditCard size={24} className="text-sky-400/50" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium line-clamp-2">{item.title}</p>
                  <p className="text-terza-gray/70 text-xs font-mono mt-1">
                    {item.meli_item_id.replace('MLA', '#')}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-white font-semibold text-sm">{formatMoney(item.price)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(item.status)}`}>{item.status}</span>
                  </div>
                  {item.permalink && (
                    <a
                      href={item.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 text-xs mt-2 inline-flex items-center gap-1 hover:text-white"
                    >
                      Ver en MP <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          {mpItems.length === 0 && (
            <p className="text-terza-gray text-sm text-center py-8">No hay productos Mercado Pago sincronizados</p>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className="card-dark overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-terza-gray-dark/30">
                {['Orden', 'Comprador', 'Estado', 'Total', 'Fecha', 'Ítems'].map((h) => (
                  <th key={h} className="text-left text-terza-gray text-xs uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.meli_order_id} className="border-b border-terza-gray-dark/20 hover:bg-terza-navy-medium/30">
                  <td className="px-4 py-3 text-white text-sm">#{order.meli_order_id}</td>
                  <td className="px-4 py-3 text-terza-gray text-sm">{order.buyer_nickname || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusBadge(order.status)}`}>{order.status}</span>
                  </td>
                  <td className="px-4 py-3 text-green-400 text-sm font-medium">{formatMoney(order.total_amount, order.currency_id || 'ARS')}</td>
                  <td className="px-4 py-3 text-terza-gray text-sm">{formatDate(order.date_created)}</td>
                  <td className="px-4 py-3 text-terza-gray text-sm max-w-xs truncate">
                    {(order.items || []).map((i) => i.title).join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="text-terza-gray text-sm p-6 text-center">No hay órdenes sincronizadas</p>}
        </div>
      )}

      {tab === 'questions' && (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.meli_question_id} className="card-dark">
              <div className="flex items-start justify-between gap-4 mb-2">
                <span className={`text-xs px-2 py-1 rounded-full ${statusBadge(q.status)}`}>{q.status}</span>
                <span className="text-terza-gray text-xs">{formatDate(q.date_created)}</span>
              </div>
              <p className="text-white text-sm">{q.text}</p>
              {q.answer_text && (
                <p className="text-terza-gray text-sm mt-2 border-l-2 border-terza-blue pl-3">
                  {q.answer_text}
                </p>
              )}
              {q.meli_item_id && (
                <p className="text-terza-gray/60 text-xs mt-2">Publicación: {q.meli_item_id}</p>
              )}
            </div>
          ))}
          {questions.length === 0 && (
            <p className="text-terza-gray text-sm text-center py-8">No hay preguntas sincronizadas</p>
          )}
        </div>
      )}
    </div>
  )
}
