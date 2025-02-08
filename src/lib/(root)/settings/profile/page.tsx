import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { employeeService } from "@/lib/services/employee"
import { toast } from "@/components/ui/use-toast"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { formatDate, formatCurrency } from "@/lib/utils"
import type { Employee, PayrollInfo } from "@/types/employee"

interface PaymentHistory {
  id: string
  amount: number
  date: string
  status: "pending" | "completed" | "failed"
  period: {
    start: string
    end: string
  }
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [loading, setLoading] = React.useState(true)
  const [employee, setEmployee] = React.useState<Employee | null>(null)
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [payrollInfo, setPayrollInfo] = React.useState<PayrollInfo | null>(null)
  const [paymentHistory, setPaymentHistory] = React.useState<PaymentHistory[]>([])

  React.useEffect(() => {
    const loadProfile = async () => {
      if (!user) return
      
      try {
        const employeeData = await employeeService.getEmployee(user.id)
        if (employeeData) {
          setEmployee(employeeData)
          setPayrollInfo(employeeData.payrollInfo || null)
        }
        
        // In a real app, fetch payment history from API
        // Mock data for now
        setPaymentHistory([
          {
            id: "PAY001",
            amount: 2500,
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: "completed",
            period: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
            }
          },
          {
            id: "PAY002",
            amount: 2500,
            date: new Date().toISOString(),
            status: "pending",
            period: {
              start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString()
            }
          }
        ])
      } catch (error) {
        console.error("Failed to load profile:", error)
        toast({
          title: "Error",
          description: "Failed to load profile information",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    loadProfile()
  }, [user])

  const handlePayrollUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee || !payrollInfo) return

    setIsUpdating(true)
    try {
      const updatedEmployee = await employeeService.updateEmployee(employee.id, {
        payrollInfo: {
          ...payrollInfo,
          lastPaymentDate: payrollInfo.lastPaymentDate || new Date().toISOString()
        }
      })
      setEmployee(updatedEmployee)
      toast({
        title: "Success",
        description: "Payroll information updated successfully",
      })
    } catch (error) {
      console.error("Failed to update payroll info:", error)
      toast({
        title: "Error",
        description: "Failed to update payroll information",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 className="text-2xl font-bold">Profile not found</h2>
        <p className="text-muted-foreground">
          Unable to load your profile information
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">
          View and manage your profile information
        </p>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Personal Information</TabsTrigger>
          <TabsTrigger value="business">Business Information</TabsTrigger>
          <TabsTrigger value="payroll">Payroll & Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Your personal and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <p className="text-sm">{employee.name}</p>
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <p className="text-sm">{employee.email}</p>
              </div>
              <div className="grid gap-2">
                <Label>Agent ID</Label>
                <p className="text-sm">{employee.agentId}</p>
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Badge variant={employee.role === "admin" ? "default" : "secondary"}>
                  {employee.role}
                </Badge>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Badge variant={employee.status === "active" ? "success" : "secondary"}>
                  {employee.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Your registered business details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {employee.businessInfo ? (
                <>
                  <div className="grid gap-2">
                    <Label>Company Name</Label>
                    <p className="text-sm">{employee.businessInfo.companyName}</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Registration Number</Label>
                    <p className="text-sm">{employee.businessInfo.registrationNumber}</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tax ID</Label>
                    <p className="text-sm">{employee.businessInfo.taxId}</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Business Address</Label>
                    <p className="text-sm">
                      {employee.businessInfo.businessAddress.street}<br />
                      {employee.businessInfo.businessAddress.city}, {employee.businessInfo.businessAddress.state}<br />
                      {employee.businessInfo.businessAddress.postalCode}<br />
                      {employee.businessInfo.businessAddress.country}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No business information available. Please contact administration to update.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Payroll Information</CardTitle>
                <CardDescription>
                  Update your payment details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePayrollUpdate} className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Base Rate</Label>
                    <p className="text-lg font-semibold">
                      {payrollInfo ? formatCurrency(payrollInfo.baseRate) : "N/A"} {payrollInfo?.currency || "USD"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Paid {payrollInfo?.paymentFrequency || "monthly"}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={payrollInfo?.bankName || ""}
                      onChange={(e) => setPayrollInfo(prev => prev ? {
                        ...prev,
                        bankName: e.target.value
                      } : null)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        value={payrollInfo?.accountNumber || ""}
                        onChange={(e) => setPayrollInfo(prev => prev ? {
                          ...prev,
                          accountNumber: e.target.value
                        } : null)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="routingNumber">Routing Number</Label>
                      <Input
                        id="routingNumber"
                        value={payrollInfo?.routingNumber || ""}
                        onChange={(e) => setPayrollInfo(prev => prev ? {
                          ...prev,
                          routingNumber: e.target.value
                        } : null)}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? "Updating..." : "Update Payment Information"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  Your recent payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentHistory.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Period: {formatDate(payment.period.start)} - {formatDate(payment.period.end)}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge
                          variant={
                            payment.status === "completed" ? "success" :
                            payment.status === "pending" ? "secondary" : "destructive"
                          }
                        >
                          {payment.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 