export type EmployeeRole = "admin" | "employee"
export type EmployeeStatus = "active" | "inactive"

export interface BusinessInfo {
  companyName: string
  registrationNumber: string
  taxId: string
  businessAddress: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
}

export interface PayrollInfo {
  bankName: string
  accountNumber: string
  routingNumber: string
  paymentFrequency: "weekly" | "biweekly" | "monthly"
  baseRate: number
  currency: string
  lastPaymentDate?: string
}

export type PaymentType = 'salary' | 'commission' | 'misc' | 'bonus'

export interface Payment {
  id: string
  amount: number
  date: string
  status: 'pending' | 'completed' | 'failed'
  type: 'salary' | 'bonus' | 'commission'
}

export interface PaymentHistory {
  payments: Payment[]
  totalPaid: number
  lastPaymentDate: string | null
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly'
}

export interface Employee {
  id: string
  agentId: string
  name: string
  email: string
  role: EmployeeRole
  status: EmployeeStatus
  phone?: string
  assignedOrders: string[] // Order IDs
  businessInfo: {
    companyName: string
    registrationNumber: string
    taxId: string
    businessAddress: {
      street: string
      city: string
      state: string
      postalCode: string
      country: string
    }
  }
  payrollInfo: {
    bankName: string
    accountNumber: string
    routingNumber: string
    paymentFrequency: 'weekly' | 'biweekly' | 'monthly'
    baseRate: number
    currency: string
    lastPaymentDate: string
    commissionRate?: number // Add commission rate
    paymentHistory?: PaymentHistory[] // Add payment history
  }
  createdAt: string
  updatedAt: string
  lastLogin?: string
  passwordHash: string
}

export interface EmployeeCredentials {
  agentId: string
  password: string
}  

export interface EmployeeStats {
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  customerSatisfaction: number
}
