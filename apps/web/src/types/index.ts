export interface ProductBadge {
  id: string
  label: string
  tone?: 'dark' | 'accent' | 'neutral'
}

// Product Types
export interface Product {
  id: string
  slug?: string
  name: string
  description: string
  price: number
  originalPrice?: number
  compareAtPrice?: number
  images: string[]
  category: any
  categoryId: string
  rating?: number
  reviewCount?: number
  reviews?: Review[]
  isNew?: boolean
  isSale?: boolean
  isFeatured?: boolean
  inStock?: boolean
  tags?: string[]
  badges?: ProductBadge[]
  deliveryEstimate?: string
  useCases?: string[]
  highlights?: string[]
  compareGroup?: string
  bundleCandidateIds?: string[]
  popularityScore?: number
  variants?: ProductVariant[]
  supplier?: Supplier
  stock: number
  createdAt: string
  updatedAt: string
  [key: string]: any
}

export interface ProductVariant {
  id: string
  name: string
  value: string
  price?: number
  stock: number
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image?: string
  parentId?: string
  productCount?: number
  [key: string]: any
}

// Cart Types
export interface CartItem {
  id: string
  product: Product
  productId?: string
  name: string
  image: string
  price: number
  quantity: number
  variant?: ProductVariant | string
  [key: string]: any
}

// Order Types
export interface Order {
  id: string
  customerId: string
  items: OrderItem[]
  status: OrderStatus
  subtotal: number
  shipping: number
  tax: number
  total: number
  shippingAddress: Address
  billingAddress: Address
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  trackingNumber?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productImage: string
  quantity: number
  price: number
  variant?: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type PaymentMethod = 'stripe' | 'paypal' | 'klarna'

// Customer Types
export interface Customer {
  id: string
  email: string
  name: string
  phone?: string
  addresses: Address[]
  defaultAddressId?: string
  createdAt: string
}

export interface Address {
  id: string
  name: string
  street: string
  city: string
  state?: string
  postalCode: string
  country: string
  phone?: string
  isDefault?: boolean
}

// Supplier Types
export interface Supplier {
  id: string
  name: string
  email: string
  phone?: string
  website?: string
  apiEndpoint?: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  rating: number
  orderCount: number
}

// Review Types
export interface Review {
  id: string
  productId: string
  customerId: string
  customerName: string
  rating: number
  title: string
  content: string
  images?: string[]
  verified: boolean
  helpful: number
  createdAt: string
}

// AI Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
