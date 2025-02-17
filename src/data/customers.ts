// Helper function to generate unique customer IDs
const generateCustomerId = (index: number) => {
  return `CUS${String(index + 1).padStart(5, '0')}`
}

export const customers = [
  {
    id: generateCustomerId(0),
    name: "Robert Anderson",
    email: "r.anderson@constructioncorp.com",
    company: "Anderson Construction Corp",
    phone: "(555) 123-4567",
    address: {
      street: "789 Industrial Parkway",
      city: "Houston",
      state: "TX",
      country: "USA",
      postalCode: "77001"
    }
  },
  {
    id: generateCustomerId(1),
    name: "Sarah Martinez",
    email: "smartinez@buildpro.com",
    company: "BuildPro Solutions",
    phone: "(555) 234-5678",
    address: {
      street: "456 Commerce Drive",
      city: "Phoenix",
      state: "AZ",
      country: "USA",
      postalCode: "85001"
    }
  },
  {
    id: generateCustomerId(2),
    name: "David Wilson",
    email: "dwilson@wilsonbuilders.com",
    company: "Wilson Builders & Associates",
    phone: "(555) 345-6789",
    address: {
      street: "234 Construction Way",
      city: "Dallas",
      state: "TX",
      country: "USA",
      postalCode: "75201"
    }
  },
  {
    id: generateCustomerId(48),
    name: "Michael Chang",
    email: "mchang@pacificbuilders.com",
    company: "Pacific Builders Inc",
    phone: "(555) 987-6543",
    address: {
      street: "123 Harbor Boulevard",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      postalCode: "94111"
    }
  },
  {
    id: generateCustomerId(49),
    name: "Emily Johnson",
    email: "ejohnson@midwestconstruction.com",
    company: "Midwest Construction Group",
    phone: "(555) 876-5432",
    address: {
      street: "567 Prairie Road",
      city: "Chicago",
      state: "IL",
      country: "USA",
      postalCode: "60601"
    }
  }
]