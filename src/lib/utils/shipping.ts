import type { Address } from "@/types/orders"

interface ShippingCostParams {
  distance: number
  weight: number
  baseRate: number
  ratePerKm: number
  ratePerKg: number
}

export async function calculateDistance(origin: Address, destination: Address): Promise<number> {
  // In a real app, this would call a mapping API
  // For demo, generate a realistic distance based on postal codes
  const originCode = parseInt(origin.postalCode)
  const destCode = parseInt(destination.postalCode)
  const difference = Math.abs(originCode - destCode)
  
  // Generate a somewhat realistic distance
  return Math.round(difference * 0.8) + 100
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