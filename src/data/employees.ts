import type { Employee } from "@/types/employee"

export const employees: Employee[] = [
  {
    id: "EMP001",
    agentId: "ADMIN001",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    status: "active",
    assignedOrders: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: "$2a$10$dQlRrfR4z8i4XJ1xzQKJPuBzPJqQfkGZHQA7G5mGt5OY5dX5K5mKy", // "admin123"
    businessInfo: {
      companyName: "Admin Corp",
      registrationNumber: "REG123",
      taxId: "TAX123",
      businessAddress: {
        street: "123 Admin St",
        city: "Admin City",
        state: "AS",
        postalCode: "12345",
        country: "USA"
      }
    },
    payrollInfo: {
      bankName: "Admin Bank",
      accountNumber: "1234567890",
      routingNumber: "987654321",
      paymentFrequency: "monthly",
      baseRate: 5000,
      currency: "USD",
      lastPaymentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: "EMP002",
    agentId: "AGT001",
    name: "John Smith",
    email: "john@example.com",
    role: "employee",
    status: "active",
    assignedOrders: ["ORD002"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: "$2a$10$xJ1xzQKJPuBzPJqQfkGZHQA7G5mGt5OY5dX5K5mKydQlRrfR4z8i4", // "password123"
    businessInfo: {
      companyName: "Smith LLC",
      registrationNumber: "REG456",
      taxId: "TAX456",
      businessAddress: {
        street: "456 Agent St",
        city: "Agent City",
        state: "AS",
        postalCode: "67890",
        country: "USA"
      }
    },
    payrollInfo: {
      bankName: "Agent Bank",
      accountNumber: "0987654321",
      routingNumber: "123456789",
      paymentFrequency: "biweekly",
      baseRate: 3000,
      currency: "USD",
      lastPaymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
] 