export const employees = [
  {
    id: "EMP001",
    agentId: "ADMIN001",
    name: "Admin HQ",
    email: "hq@sanyglobal.org",
    role: "admin",
    status: "active",
    assignedOrders: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: "5b722b307fce6c944905d132691d5e4a2214b7fe92b738920eb3fce3a90420a19511c3010a0e7712b054daef5b57bad59ecbd93b3280f210578f547f4aed4d25:a72f47a6838bf4d0f539e366ee3e3e73", // "sany444global"
    businessInfo: {
      companyName: "Sany Global",
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
      bankName: "Sany Global",
      accountNumber: "1234567890",
      routingNumber: "987654321",
      paymentFrequency: "monthly",
      baseRate: 5000,
      currency: "USD",
      lastPaymentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    settings: {
      theme: "light",
      notifications: {
        email: true,
        push: true
      },
      language: "en"
    }
  },
  {
    id: "EMP002",
    agentId: "AGENT48392",
    name: "David PIERRE-JEAN",
    email: "david.pierrejean@sanyglobal.org",
    role: "employee",
    status: "active",
    assignedOrders: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: "5b722b307fce6c944905d132691d5e4a2214b7fe92b738920eb3fce3a90420a19511c3010a0e7712b054daef5b57bad59ecbd93b3280f210578f547f4aed4d25:a72f47a6838bf4d0f539e366ee3e3e73", // "sany2025global"
    businessInfo: {
      companyName: "Sany Equipment",
      registrationNumber: "93-1671162",
      taxId: "93-1671162",
      businessAddress: {
        street: "228 Park Ave S",
        city: "New York",
        state: "NY",
        postalCode: "10003",
        country: "USA"
      }
    },
    payrollInfo: {
      bankName: "Bank of America",
      accountNumber: "483101090345",
      routingNumber: "21000322",
      paymentFrequency: "monthly",
      baseRate: 17000,
      currency: "USD",
      lastPaymentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    settings: {
      theme: "light",
      notifications: {
        email: true,
        push: true
      },
      language: "en"
    }
  }
]

export type Employee = typeof employees[0]