export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  company: string
  address: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  createdAt?: string
  updatedAt?: string
} 