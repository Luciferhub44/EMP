import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"
import { customerService } from "@/lib/services/customer"
import { toast } from "@/components/ui/use-toast"
import type { Customer } from "@/types/customer"
import { useAuth } from "@/contexts/auth-context"
import { useNavigate } from "react-router-dom"

export default function CustomersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCustomers = async () => {
      if (!user) return
      setIsLoading(true)
      try {
        const data = await customerService.getCustomers(user.id, user.role === 'admin')
        setCustomers(data)
      } catch (error) {
        console.error("Failed to load customers:", error)
        toast({
          title: "Error",
          description: "Failed to load customers",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadCustomers()
  }, [user])

  const filteredCustomers = useMemo(() => {
    const searchLower = search.toLowerCase()
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower) ||
      customer.company?.toLowerCase().includes(searchLower) ||
      customer.phone.includes(search)
    )
  }, [search, customers])

  const handleAddCustomer = () => {
    navigate("/customers/new")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">
            {user?.role === 'admin'
              ? 'Manage customer accounts and information'
              : 'View customer information for your assigned orders'
            }
          </p>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={handleAddCustomer}>
            Add Customer
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCustomers.length === 0 ? (
              <p className="text-muted-foreground">No customers found</p>
            ) : (
              <div className="space-y-4">
                {filteredCustomers.map(customer => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between border-b py-4 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.email}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 