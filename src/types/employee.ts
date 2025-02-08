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

export interface PaymentHistory {
  id: string
  employeeId: string
  type: PaymentType
  amount: number
  currency: string
  description: string
  status: 'pending' | 'completed' | 'failed'
  paymentDate: string
  createdAt: string
  createdBy: string
  reference?: string
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
