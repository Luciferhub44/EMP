export const productCategories = [
  {
    name: "Excavators",
    description: "Digging and earthmoving equipment",
    icon: "shovel",
    subCategories: ["Mini Excavators", "Crawler Excavators", "Wheeled Excavators"]
  },
  {
    name: "Cranes",
    description: "Lifting and material handling equipment",
    icon: "crane",
    subCategories: ["Tower Cranes", "Mobile Cranes", "Crawler Cranes"]
  },
  {
    name: "Concrete Equipment",
    description: "Concrete mixing and pumping equipment",
    icon: "mixer",
    subCategories: ["Concrete Mixers", "Concrete Pumps", "Concrete Plants"]
  }
]

export const products = [
  {
    id: "EX-001",
    category: "Excavators",
    name: "Compact Mini Excavator",
    model: "ME-2000",
    sku: "ME2000-001",
    price: 15000,
    status: "active",
    image: "/images/products/mini-excavator.jpg",
    specifications: {
      weight: 2000,
      power: 15,
      digDepth: 2.5,
      maxReach: 4.2,
      engineType: "Diesel",
      operatingWeight: "2000 kg",
      bucketCapacity: "0.08 m³"
    },
    inventory: [
      {
        productId: "EX-001",
        warehouseId: "wh-1",
        quantity: 5,
        minimumStock: 2,
        lastUpdated: new Date().toISOString()
      },
      {
        productId: "EX-001",
        warehouseId: "wh-2",
        quantity: 3,
        minimumStock: 1,
        lastUpdated: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "CR-001",
    category: "Cranes",
    name: "Heavy Duty Tower Crane",
    model: "TC-5000",
    sku: "TC5000-001",
    price: 180000,
    status: "active",
    image: "/images/products/tower-crane.jpg",
    specifications: {
      liftingCapacity: 5000,
      maxHeight: 80,
      boomLength: 60,
      engineType: "Electric",
      maxLoad: "5000 kg",
      towerHeight: "80 m",
      jibLength: "60 m"
    },
    inventory: [
      {
        productId: "CR-001",
        warehouseId: "wh-2",
        quantity: 2,
        minimumStock: 1,
        lastUpdated: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "CM-001",
    category: "Concrete Equipment",
    name: "Professional Concrete Mixer",
    model: "PCM-3000",
    sku: "PCM3000-001",
    price: 8500,
    status: "active",
    image: "/images/products/concrete-mixer.jpg",
    specifications: {
      capacity: 3,
      power: 7.5,
      drumSpeed: 24,
      engineType: "Electric",
      mixingCapacity: "3 m³",
      drumDiameter: "1.8 m",
      weight: "1200 kg"
    },
    inventory: [
      {
        productId: "CM-001",
        warehouseId: "wh-1",
        quantity: 8,
        minimumStock: 3,
        lastUpdated: new Date().toISOString()
      },
      {
        productId: "CM-001",
        warehouseId: "wh-3",
        quantity: 4,
        minimumStock: 2,
        lastUpdated: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]