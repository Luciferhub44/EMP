export interface TransportQuote {
  id: string
  orderId: string
  provider: string
  method: string
  cost: number
  estimatedDays: number
  distance: number
  insurance: {
    included: boolean
    coverage: number
    cost: number
  }
  status: 'pending' | 'accepted' | 'rejected'
  validUntil: string
} 