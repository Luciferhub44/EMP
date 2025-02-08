import { Address } from './orders'

export type OrderStatus = 
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "paid"

export type PaymentStatus = 
  | "pending"
  | "paid"
  | "failed"
  | "refunded"

export interface Product {
  id: string
  category: string
  subCategory?: string
  name: string
  model: string
  sku: string
  price: number
  specifications: Record<string, string | number>
  inventory: Inventory[]
  image?: string
}

export interface ProductCategory {
  name: string
  description: string
  icon: string
  subCategories?: string[]
}

export interface Warehouse {
  id: string
  name: string
  location: string
  capacity: number
}

export interface Inventory {
  productId: string
  warehouseId: string
  quantity: number
  minimumStock: number
  lastUpdated: string
}

export interface OrderItem {
  productId: string
  quantity: number
  price: number
  productName: string
}

export interface Order {
  id: string
  customerId: string
  customerName: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  shippingAddress: Address | string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TransportCompany {
  id: string
  name: string
  rating: number
  availableVehicles: string[]
  basePrice: number
  pricePerKm: number
  serviceAreas: string[]
  insuranceCoverage: number
  contactInfo: {
    phone: string
    email: string
  }
}

export interface VehicleType {
  id: string
  name: string
  maxWeight: number
  maxLength: number
  pricePerKm: number
}

export interface TransportQuote {
  id: string
  orderId: string
  companyId: string
  vehicleType: string
  distance: number
  price: number
  estimatedDays: number
  expiresAt: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  createdAt: string
}

export interface FulfillmentDetails {
  orderId: string
  warehouseId: string
  transportQuoteId?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  scheduledDate?: string
  completedDate?: string
  notes?: string
}

export interface Customer {
  id: string
  name: string
  email: string
  company: string
  phone: string
  address: {
    street: string
    city: string
    state: string
    country: string
    postalCode: string
  }
}

export * from './orders'
export * from './products'
export * from './customer'
export * from './employee'

// Re-export common types
export type { Address } from './orders' 