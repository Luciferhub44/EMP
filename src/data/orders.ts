import { Order } from "@/types"
import { customers } from "./customers"
import { products } from "./products"

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
const generateRandomStatus = (): Order["status"] => {
  const statuses: Order["status"][] = ["pending", "processing", "shipped", "delivered", "cancelled"]
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
const generatePaymentStatus = (orderStatus: Order["status"]): Order["paymentStatus"] => {
  if (orderStatus === "cancelled") return "refunded"
  if (["delivered", "shipped"].includes(orderStatus)) return "paid"
  if (orderStatus === "pending") return Math.random() > 0.3 ? "paid" : "pending"
  return "pending"
}

// Helper function to generate random payment method
const generatePaymentMethod = (): Order["paymentMethod"] => {
  const methods = ["credit_card", "bank_transfer", "financing", "wire_transfer"]
  return methods[Math.floor(Math.random() * methods.length)]
}

// Generate 50+ orders
export const orders: Order[] = Array.from({ length: 55 }, (_, index) => {
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
      product,
      quantity,
      price: product.price
    }
  })

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return {
    id: generateOrderId(index),
    customerId: customer.id,
    status: orderStatus,
    paymentStatus: generatePaymentStatus(orderStatus),
    paymentMethod: generatePaymentMethod(),
    shippingAddress: customer.address,
    billingAddress: customer.address,
    items,
    total: totalAmount,
    totalAmount,
    createdAt,
    updatedAt: createdAt,
    notes: Math.random() > 0.7 ? "Special handling required" : undefined,
    fulfillmentStatus: "pending"
  }
}) 