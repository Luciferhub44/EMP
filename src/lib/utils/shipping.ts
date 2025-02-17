import type { Address } from "@/types/orders"

interface ShippingCostParams {
  distance: number
  weight: number
  baseRate: number
  ratePerKm: number
  ratePerKg: number
}

export async function calculateDistance(origin: Address, destination: Address): Promise<number> {
  try {
    // First check if we have cached this route
    const response = await fetch(`/api/shipping/routes?originPostal=${origin.postalCode}&destPostal=${destination.postalCode}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })

    if (response.ok) {
      const cached = await response.json()
      return cached.distance
    }

    // If not cached, calculate and store
    const originCode = parseInt(origin.postalCode)
    const destCode = parseInt(destination.postalCode)
    const difference = Math.abs(originCode - destCode)
    
    // Generate a somewhat realistic distance
    const distance = Math.round(difference * 0.8) + 100

    // Cache the result
    await fetch('/api/shipping/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({
        originPostal: origin.postalCode,
        destPostal: destination.postalCode,
        distance,
        calculatedAt: new Date().toISOString()
      })
    })

    return distance
  } catch (error) {
    console.error('Error calculating distance:', error)
    // Fallback to basic calculation if API operations fail
    const difference = Math.abs(
      parseInt(origin.postalCode) - parseInt(destination.postalCode)
    )
    return Math.round(difference * 0.8) + 100
  }
}

export function calculateShippingCost({
  distance,
  weight,
  baseRate,
  ratePerKm,
  ratePerKg
}: ShippingCostParams): number {
  const distanceCost = distance * ratePerKm
  const weightCost = weight * ratePerKg
  const total = baseRate + distanceCost + weightCost
  
  // Round to 2 decimal places
  return Math.round(total * 100) / 100
} 