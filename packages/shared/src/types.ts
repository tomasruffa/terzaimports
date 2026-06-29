export interface Product {
  id: string
  name: string
  sku: string
  description: string | null
  category: string
  purchase_price: number
  sale_price: number
  stock_quantity: number
  min_stock: number
  unit: string
  supplier: string | null
  origin_country: string | null
  image_url: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface StockMovement {
  id: string
  product_id: string
  type: 'in' | 'out' | 'adjustment'
  quantity: number
  reason: string | null
  reference: string | null
  created_at: string
  product?: Product
}

export interface Category {
  id: string
  name: string
  description: string | null
}

export interface DashboardMetrics {
  total_products: number
  total_stock_value: number
  low_stock_products: number
  out_of_stock_products: number
  top_products: TopProduct[]
  recent_movements: StockMovement[]
  monthly_movements: MonthlyMovement[]
}

export interface TopProduct {
  id: string
  name: string
  stock_quantity: number
  sale_price: number
  total_value: number
}

export interface MonthlyMovement {
  month: string
  entries: number
  exits: number
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  message?: string
}
