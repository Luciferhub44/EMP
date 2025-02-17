export const vehicleTypes = [
  {
    id: "small-truck",
    name: "Small Truck",
    maxWeight: 3500,
    maxLength: 4.5,
    pricePerKm: 3.5
  },
  {
    id: "medium-truck",
    name: "Medium Truck",
    maxWeight: 7500,
    maxLength: 6.2,
    pricePerKm: 4.5
  },
  {
    id: "large-truck",
    name: "Large Truck",
    maxWeight: 15000,
    maxLength: 10.0,
    pricePerKm: 7.5
  },
  {
    id: "flatbed",
    name: "Flatbed Truck",
    maxWeight: 12000,
    maxLength: 10.0,
    pricePerKm: 10.0
  }
]

export const transportCompanies = [
  {
    id: "trans-1",
    name: "FastTrack Logistics",
    rating: 4.8,
    availableVehicles: ["small-truck", "medium-truck", "large-truck"],
    basePrice: 500,
    pricePerKm: 2.8,
    serviceAreas: ["New York", "Los Angeles", "Chicago"],
    insuranceCoverage: 100000,
    contactInfo: {
      phone: "1-800-555-0123",
      email: "contact@fasttrack.com"
    }
  },
  {
    id: "trans-2",
    name: "Heavy Haulers Co.",
    rating: 4.6,
    availableVehicles: ["medium-truck", "large-truck", "flatbed"],
    basePrice: 750,
    pricePerKm: 3.2,
    serviceAreas: ["Los Angeles", "San Francisco", "Seattle"],
    insuranceCoverage: 150000,
    contactInfo: {
      phone: "1-800-555-0124",
      email: "support@heavyhaulers.com"
    }
  },
  {
    id: "trans-3",
    name: "Reliable Transport",
    rating: 4.9,
    availableVehicles: ["small-truck", "medium-truck", "flatbed"],
    basePrice: 450,
    pricePerKm: 2.5,
    serviceAreas: ["Chicago", "Detroit", "Cleveland"],
    insuranceCoverage: 120000,
    contactInfo: {
      phone: "1-800-555-0125",
      email: "info@reliabletransport.com"
    }
  }
]

export const transportOrders = [
  {
    id: "TO-001",
    orderId: "ORD000001",
    companyId: "trans-1",
    status: "pending",
    pickupDate: new Date().toISOString(),
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    cost: 1500,
    vehicleType: "large-truck"
  }
]