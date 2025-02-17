import { customers } from "./customers.js"
import { products } from "./products.js"

// Helper function to generate unique order IDs
const generateOrderId = (index: number) => {
  return `ORD${String(index + 1).padStart(6, '0')}`
}

// Helper function to generate random date within the last 90 days
const generateRandomDate = () => {
  const now = new Date()
  const days = Math.floor(Math.random() * 90)
  const date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return date.toISOString()
}

// Helper function to generate random order status
const generateRandomStatus = () => {
  const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
  const weights = [15, 20, 25, 20, 15, 5] // Probability weights for each status
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  const random = Math.random() * totalWeight
  
  let sum = 0
  for (let i = 0; i < statuses.length; i++) {
    sum += weights[i]
    if (random <= sum) return statuses[i]
  }
  return "pending"
}

// Helper function to generate random payment status
const generatePaymentStatus = (orderStatus: string) => {
  if (orderStatus === "cancelled") return "refunded"
  if (["delivered", "shipped"].includes(orderStatus)) return "paid"
  if (orderStatus === "pending") return Math.random() > 0.3 ? "paid" : "pending"
  return "pending"
}

// Generate 50+ orders
export const orders = Array.from({ length: 55 }, (_, index) => {
  const customer = customers[Math.floor(Math.random() * customers.length)]
  const orderStatus = generateRandomStatus()
  const createdAt = generateRandomDate()
  
  // Generate 1-5 random items for each order
  const itemCount = Math.floor(Math.random() * 4) + 1
  const items = Array.from({ length: itemCount }, () => {
    const product = products[Math.floor(Math.random() * products.length)]
    const quantity = Math.floor(Math.random() * 3) + 1
    return {
      productId: product.id,
      productName: product.name,
      product,
      quantity,
      price: product.price
    }
  })

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return {
    id: generateOrderId(index),
    customerId: customer.id,
    customerName: customer.name,
    status: orderStatus,
    paymentStatus: generatePaymentStatus(orderStatus),
    shippingAddress: customer.address,
    billingAddress: customer.address,
    items,
    subtotal: totalAmount,
    tax: totalAmount * 0.1,
    shippingCost: 0,
    total: totalAmount,
    createdAt,
    updatedAt: createdAt,
    fulfillmentStatus: "pending",
    notes: Math.random() > 0.7 ? "Special handling required" : undefined
  }
})