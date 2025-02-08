import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, DollarSign, Trash2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { employeeService } from "@/lib/services/employee"
import { formatDate, formatCurrency } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { PaymentDialog } from "@/components/employees/payment-dialog"
import { PaymentHistory } from "@/components/employees/payment-history"
import type { Employee, PaymentHistory as PaymentHistoryType } from "@/types/employee"

export default function EmployeeDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [employee, setEmployee] = React.useState<Employee | null>(null)
  const [payments, setPayments] = React.useState<PaymentHistoryType[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [showPaymentDialog, setShowPaymentDialog] = React.useState(false)

  React.useEffect(() => {
    const loadEmployeeData = async () => {
      if (!id || !user) return
      setIsLoading(true)
      try {
        const [employeeData, paymentData] = await Promise.all([
          employeeService.getEmployee(id),
          employeeService.getPaymentHistory(id, user.id, user.role === 'admin')
        ])
        setEmployee(employeeData)
        setPayments(paymentData)
      } catch (error) {
        console.error("Failed to load employee data:", error)
        toast({
          title: "Error",
          description: "Failed to load employee details",
          variant: "destructive",
        })
        navigate("/employees")
      } finally {
        setIsLoading(false)
      }
    }

    loadEmployeeData()
  }, [id, user, navigate])

  const handlePayment = async (paymentData: {
    type: PaymentHistoryType['type']
    amount: number
    description: string
    reference?: string
  }) => {
    if (!user || !employee) return

    try {
      const payment = await employeeService.issuePayment(
        employee.id,
        paymentData,
        user.id,
        user.role === 'admin'
      )
      setPayments(prev => [payment, ...prev])
      toast({
        title: "Success",
        description: "Payment issued successfully",
      })
      setShowPaymentDialog(false)
    } catch (error) {
      console.error("Failed to issue payment:", error)
      toast({
        title: "Error",
        description: "Failed to issue payment",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (user?.role !== 'admin' || !employee) return
    
    if (!confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
      return
    }

    try {
      await employeeService.deleteEmployee(employee.id, true)
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      })
      navigate("/employees")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!employee) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/employees")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold tracking-tight">
              {employee.name}
            </h2>
            <p className="text-muted-foreground">
              Employee ID: {employee.id}
            </p>
          </div>
          {user?.role === 'admin' && (
            <Button onClick={() => setShowPaymentDialog(true)}>
              <DollarSign className="mr-2 h-4 w-4" />
              Issue Payment
            </Button>
          )}
          {user?.role === 'admin' && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Employee
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">Status</p>
              <Badge variant={employee.status === 'active' ? 'success' : 'secondary'}>
                {employee.status}
              </Badge>
            </div>
            <div>
              <p className="font-medium">Email</p>
              <p className="text-muted-foreground">{employee.email}</p>
            </div>
            <div>
              <p className="font-medium">Phone</p>
              <p className="text-muted-foreground">{employee.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="font-medium">Joined</p>
              <p className="text-muted-foreground">{formatDate(employee.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">Base Rate</p>
              <p className="text-muted-foreground">
                {formatCurrency(employee.payrollInfo.baseRate)}
              </p>
            </div>
            <div>
              <p className="font-medium">Payment Frequency</p>
              <p className="text-muted-foreground capitalize">
                {employee.payrollInfo.paymentFrequency}
              </p>
            </div>
            {employee.payrollInfo.commissionRate && (
              <div>
                <p className="font-medium">Commission Rate</p>
                <p className="text-muted-foreground">
                  {employee.payrollInfo.commissionRate}%
                </p>
              </div>
            )}
            <div>
              <p className="font-medium">Last Payment</p>
              <p className="text-muted-foreground">
                {employee.payrollInfo.lastPaymentDate 
                  ? formatDate(employee.payrollInfo.lastPaymentDate)
                  : 'No payments yet'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No payment history available
            </p>
          ) : (
            <PaymentHistory payments={payments} />
          )}
        </CardContent>
      </Card>

      {employee && (
        <PaymentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          onSubmit={handlePayment}
          employeeName={employee.name}
        />
      )}
    </div>
  )
} 