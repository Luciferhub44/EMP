import type { Address } from "@/types/orders"
import { db } from "@/lib/api/db"

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
    const { rows: [cached] } = await db.query(
      `SELECT data->>'distance' as distance 
       FROM shipping_routes 
       WHERE data->>'originPostal' = $1 
       AND data->>'destPostal' = $2`,
      [origin.postalCode, destination.postalCode]
    )

    if (cached) {
      return parseInt(cached.distance)
    }

    // If not cached, calculate and store
    const originCode = parseInt(origin.postalCode)
    const destCode = parseInt(destination.postalCode)
    const difference = Math.abs(originCode - destCode)
    
    // Generate a somewhat realistic distance
    const distance = Math.round(difference * 0.8) + 100

    // Cache the result
    await db.query(
      'INSERT INTO shipping_routes (id, data) VALUES ($1, $2)',
      [`route-${origin.postalCode}-${destination.postalCode}`, {
        originPostal: origin.postalCode,
        destPostal: destination.postalCode,
        distance,
        calculatedAt: new Date().toISOString()
      }]
    )

    return distance
  } catch (error) {
    console.error('Error calculating distance:', error)
    // Fallback to basic calculation if DB operations fail
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