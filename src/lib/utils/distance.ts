// Simple distance calculation based on string comparison for demo
// In a real app, this would use geocoding and actual distance calculation
export function calculateDistance(from: string, to: string): number {
  // Mock distance calculation - generates a number between 50 and 1000 km
  const hash = Math.abs(from.length - to.length) * 100
  return Math.floor(50 + hash % 950)
} 