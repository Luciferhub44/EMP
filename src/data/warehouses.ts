export interface Warehouse {
  id: string
  name: string
  location: string
  capacity: number
  isActive: boolean
}

export const warehouses: Warehouse[] = [
  {
    id: 'WH-1',
    name: 'Main Warehouse',
    location: '2792 NW 24th St Yard, Miami, FL 33142, United States',
    capacity: 100000,
    isActive: true
  }
]