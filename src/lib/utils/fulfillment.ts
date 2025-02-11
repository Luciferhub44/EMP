import { TransportQuote, OrderItem, FulfillmentDetails, FulfillmentStatus } from "@/types/orders"
import { db } from "@/lib/api/db"

interface GenerateQuoteParams {
  orderId: string
  companyId: string
  distance: number
  items: OrderItem[]
}

// Store fulfillment details (in a real app, this would be in a database)
export const fulfillmentStore = new Map<string, FulfillmentDetails>()

export async function generateTransportQuote({
  orderId,
  companyId,
  distance,
  items
}: GenerateQuoteParams): Promise<TransportQuote> {
  const { rows: [company] } = await db.query(
    'SELECT * FROM transport_companies WHERE id = $1',
    [companyId]
  )
  if (!company) throw new Error("Company not found")

  const totalWeight = items.reduce((sum, item) => sum + (item.quantity * 100), 0)
  
  const { rows: [vehicle] } = await db.query(
    'SELECT * FROM vehicle_types WHERE id = ANY($1) AND max_weight >= $2 LIMIT 1',
    [company.data.availableVehicles, totalWeight]
  )
  if (!vehicle) throw new Error("No suitable vehicle found")

  const totalPrice = company.data.basePrice + (distance * company.data.pricePerKm)
  const estimatedDays = Math.ceil(distance / 500) + 1

  const quote = {
    id: `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    orderId,
    provider: company.data.name,
    method: vehicle.data.name,
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

  await db.query(
    'INSERT INTO transport_quotes (id, data) VALUES ($1, $2)',
    [quote.id, quote]
  )

  return quote
}

export function calculateDistance(from: string, to: string): number {
  // Mock distance calculation - generates a number between 50 and 1000 km
  const hash = Math.abs(from.length - to.length) * 100
  return Math.floor(50 + hash % 950)
}

export async function handleAcceptQuote(quoteId: string, orderId: string): Promise<string> {
  const fulfillmentId = `ful-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  await db.query(
    'INSERT INTO fulfillments (id, data) VALUES ($1, $2)',
    [fulfillmentId, {
      orderId,
      transportQuote: quoteId,
      status: 'pending' as FulfillmentStatus,
      carrier: '',
      estimatedDelivery: '',
      actualDelivery: '',
      notes: '',
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]
  )

  return fulfillmentId
} 