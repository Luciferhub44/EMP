import { TransportQuote, OrderItem, FulfillmentDetails } from "@/types/orders"

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
  const response = await fetch('/api/transport/quotes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify({
      orderId,
      companyId,
      distance,
      items
    })
  })

  if (!response.ok) {
    throw new Error('Failed to generate transport quote')
  }

  return response.json()
}

export function calculateDistance(from: string, to: string): number {
  // Mock distance calculation - generates a number between 50 and 1000 km
  const hash = Math.abs(from.length - to.length) * 100
  return Math.floor(50 + hash % 950)
}

export async function handleAcceptQuote(quoteId: string, orderId: string): Promise<string> {
  const response = await fetch('/api/fulfillments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify({
      quoteId,
      orderId
    })
  })

  if (!response.ok) {
    throw new Error('Failed to accept quote')
  }

  const { fulfillmentId } = await response.json()
  return fulfillmentId
} 