import { TransportQuote, OrderItem, FulfillmentDetails } from "@/types"
import { transportCompanies, vehicleTypes } from "@/data/transport"

interface GenerateQuoteParams {
  orderId: string
  companyId: string
  distance: number
  items: OrderItem[]
}

// Store fulfillment details (in a real app, this would be in a database)
const fulfillmentStore = new Map<string, FulfillmentDetails>()

export function generateTransportQuote({
  orderId,
  companyId,
  distance,
  items
}: GenerateQuoteParams): TransportQuote {
  const company = transportCompanies.find(c => c.id === companyId)
  if (!company) throw new Error("Company not found")

  // Calculate total weight and find appropriate vehicle
  const totalWeight = items.reduce((sum, item) => sum + (item.quantity * 100), 0) // Mock weight calculation
  const vehicle = vehicleTypes.find(v => 
    company.availableVehicles.includes(v.id) && v.maxWeight >= totalWeight
  )
  if (!vehicle) throw new Error("No suitable vehicle found")

  // Calculate price based on distance and company rates
  const basePrice = company.basePrice
  const distancePrice = distance * company.pricePerKm
  const totalPrice = basePrice + distancePrice

  // Calculate estimated days based on distance
  const estimatedDays = Math.ceil(distance / 500) + 1 // Assume 500km per day

  return {
    id: `quote-${Math.random().toString(36).substr(2, 9)}`,
    orderId,
    companyId,
    vehicleType: vehicle.id,
    distance,
    price: totalPrice,
    estimatedDays,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    status: 'pending',
    createdAt: new Date().toISOString()
  }
}

export function calculateDistance(from: string, to: string): number {
  // Mock distance calculation - generates a number between 50 and 1000 km
  const hash = Math.abs(from.length - to.length) * 100
  return Math.floor(50 + hash % 950)
}

export async function handleAcceptQuote(quoteId: string, orderId: string): Promise<string> {
  // In a real app, this would make an API call to accept the quote
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      const fulfillmentId = `ful-${Math.random().toString(36).substr(2, 9)}`
      
      // Create fulfillment record
      fulfillmentStore.set(fulfillmentId, {
        orderId,
        transportQuoteId: quoteId,
        status: 'pending',
        paymentStatus: 'pending',
        amount: 0, // This would be set from the quote amount
        createdAt: new Date().toISOString()

      })

      console.log(`Quote ${quoteId} accepted, fulfillment ID: ${fulfillmentId}`)
      resolve(fulfillmentId)
    }, 1000)
  })
} 