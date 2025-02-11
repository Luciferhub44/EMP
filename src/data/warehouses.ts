export interface Warehouse {
  id: string
  name: string
  location: string
  capacity: number
  isActive: boolean
}

export const warehouses: Warehouse[] = [
  {
    id: "WH001",
    name: "Main Warehouse",
    location: "New York",
    capacity: 100000,
    isActive: true
  },
  {
    id: "WH002",
    name: "West Coast Warehouse",
    location: "Los Angeles",
    capacity: 80000,
    isActive: true
  }
] 