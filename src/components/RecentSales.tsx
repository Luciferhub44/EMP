import { User } from 'lucide-react'

export function RecentSales() {
  return (
    <div className="space-y-8">
      {recentSales.map((sale, index) => (
        <div key={index} className="flex items-center">
          <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">
            <span className="flex h-full w-full items-center justify-center rounded-full bg-muted">
              <User className="h-4 w-4" />
            </span>
          </span>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{sale.name}</p>
            <p className="text-sm text-muted-foreground">{sale.email}</p>
          </div>
          <div className="ml-auto font-medium">{sale.amount}</div>
        </div>
      ))}
    </div>
  )
}

const recentSales = [
  {
    name: "John Doe",
    email: "john@example.com",
    amount: "+$1,999.00"
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    amount: "+$39.00"
  },
  {
    name: "Mike Johnson",
    email: "mike@example.com",
    amount: "+$299.00"
  },
  {
    name: "Sarah Wilson",
    email: "sarah@example.com",
    amount: "+$99.00"
  },
  {
    name: "Tom Brown",
    email: "tom@example.com",
    amount: "+$2,499.00"
  }
] 