import { Building2, Bitcoin } from "lucide-react"

export const paymentMethods = [
  {
    id: "bank-wire",
    name: "GoNorth Ventures Holdings LLC",
    description: "Direct bank transfer to our account",
    icon: Building2,
    details: {
      bankName: "Bluevine Bank",
      accountNumber: "1234567890",
      routingNumber: "987654321",
      swiftCode: "EXAMPLEBK"
    }
  },
  {
    id: "crypto",
    name: "Cryptocurrency",
    description: "Pay with your preferred cryptocurrency",
    icon: Bitcoin,
    details: {
      networks: [
        {
          name: "Bitcoin",
          address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          qrCode: true
        },
        {
          name: "Ethereum",
          address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          qrCode: true
        }
      ]
    }
  }
] 