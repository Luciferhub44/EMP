import { TransportQuote, OrderItem, FulfillmentDetails, FulfillmentStatus } from "@/types/orders"
import { transportCompanies, vehicleTypes } from "@/data/transport"

interface GenerateQuoteParams {
  orderId: string
  companyId: string
  distance: number
  items: OrderItem[]
}

// Store fulfillment details (in a real app, this would be in a database)
export const fulfillmentStore = new Map<string, FulfillmentDetails>()

export function generateTransportQuote({
  orderId,
  companyId,
  distance,
  items
}: GenerateQuoteParams): TransportQuote {
  const company = transportCompanies.find(c => c.id === companyId)
  if (!company) throw new Error("Company not found")

  // Calculate total weight and find appropriate vehicle
  const totalWeight = items.reduce((sum, item) => sum + (item.quantity * 100), 0)
  const vehicle = vehicleTypes.find(v => 
    company.availableVehicles.includes(v.id) && v.maxWeight >= totalWeight
  )
  if (!vehicle) throw new Error("No suitable vehicle found")

  const totalPrice = company.basePrice + (distance * company.pricePerKm)
  const estimatedDays = Math.ceil(distance / 500) + 1

  return {
    id: `quote-${Math.random().toString(36).substr(2, 9)}`,
    orderId,
    provider: company.name,
    method: vehicle.name,
    cost: totalPrice,
    estimatedDays,
    distance,
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    weightBased: true,
    insurance: {
      included: true,
      coverage: totalPrice
    }
  }
}

export function calculateDistance(from: string, to: string): number {
  // Mock distance calculation - generates a number between 50 and 1000 km
  const hash = Math.abs(from.length - to.length) * 100
  return Math.floor(50 + hash % 950)
}

export async function handleAcceptQuote(quoteId: string, orderId: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const fulfillmentId = `ful-${Math.random().toString(36).substr(2, 9)}`
      
      fulfillmentStore.set(fulfillmentId, {
        orderId,
        transportQuote: quoteId,
        status: 'pending' as FulfillmentStatus,
        carrier: '',
        estimatedDelivery: '',
        actualDelivery: '',
        notes: '',
        history: [],
      })

      resolve(fulfillmentId)
    }, 1000)
  })
} 