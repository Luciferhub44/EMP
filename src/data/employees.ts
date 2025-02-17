export const employees = [
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
    passwordHash: "5b722b307fce6c944905d132691d5e4a2214b7fe92b738920eb3fce3a90420a19511c3010a0e7712b054daef5b57bad59ecbd93b3280f210578f547f4aed4d25:a72f47a6838bf4d0f539e366ee3e3e73", // "admin123"
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
    passwordHash: "8b2f8a76c8d5e3f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0:d4e5f6a7b8c9d0e1", // "password123"
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