import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Employee } from "@/types/employee"
import { employeeService } from "@/lib/services/employee"
import { toast } from "@/components/ui/use-toast"

interface EmployeeDetailsProps {
  employee: Employee
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (updatedEmployee: Employee) => void
}

export function EmployeeDetails({ 
  employee, 
  open, 
  onOpenChange,
  onUpdate 
}: EmployeeDetailsProps) {
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [formData, setFormData] = React.useState({
    businessInfo: employee.businessInfo || {
      companyName: "",
      registrationNumber: "",
      taxId: "",
      businessAddress: {
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: ""
      }
    },
    payrollInfo: employee.payrollInfo || {
      bankName: "",
      accountNumber: "",
      routingNumber: "",
      paymentFrequency: "monthly" as const,
      baseRate: 0,
      currency: "USD"
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    try {
      const updatedEmployee = await employeeService.updateEmployee(
        employee.id, 
        {
          businessInfo: formData.businessInfo,
          payrollInfo: formData.payrollInfo
        },
        true
      )
      onUpdate(updatedEmployee)
      toast({
        title: "Success",
        description: "Employee information updated successfully",
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update employee:", error)
      toast({
        title: "Error",
        description: "Failed to update employee information",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>
          <DialogDescription>
            View and edit employee information
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="business">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="business">Business Information</TabsTrigger>
            <TabsTrigger value="payroll">Payroll Information</TabsTrigger>
          </TabsList>
          <form onSubmit={handleSubmit}>
            <TabsContent value="business" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.businessInfo.companyName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      businessInfo: {
                        ...prev.businessInfo,
                        companyName: e.target.value
                      }
                    }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="registrationNumber">Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    value={formData.businessInfo.registrationNumber}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      businessInfo: {
                        ...prev.businessInfo,
                        registrationNumber: e.target.value
                      }
                    }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    value={formData.businessInfo.taxId}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      businessInfo: {
                        ...prev.businessInfo,
                        taxId: e.target.value
                      }
                    }))}
                  />
                </div>
                <div className="grid gap-4">
                  <h3 className="text-lg font-semibold">Business Address</h3>
                  <div className="grid gap-2">
                    <Label htmlFor="street">Street</Label>
                    <Input
                      id="street"
                      value={formData.businessInfo.businessAddress.street}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessInfo: {
                          ...prev.businessInfo,
                          businessAddress: {
                            ...prev.businessInfo.businessAddress,
                            street: e.target.value
                          }
                        }
                      }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.businessInfo.businessAddress.city}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          businessInfo: {
                            ...prev.businessInfo,
                            businessAddress: {
                              ...prev.businessInfo.businessAddress,
                              city: e.target.value
                            }
                          }
                        }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.businessInfo.businessAddress.state}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          businessInfo: {
                            ...prev.businessInfo,
                            businessAddress: {
                              ...prev.businessInfo.businessAddress,
                              state: e.target.value
                            }
                          }
                        }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        value={formData.businessInfo.businessAddress.postalCode}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          businessInfo: {
                            ...prev.businessInfo,
                            businessAddress: {
                              ...prev.businessInfo.businessAddress,
                              postalCode: e.target.value
                            }
                          }
                        }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.businessInfo.businessAddress.country}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          businessInfo: {
                            ...prev.businessInfo,
                            businessAddress: {
                              ...prev.businessInfo.businessAddress,
                              country: e.target.value
                            }
                          }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="payroll" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={formData.payrollInfo.bankName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      payrollInfo: {
                        ...prev.payrollInfo,
                        bankName: e.target.value
                      }
                    }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={formData.payrollInfo.accountNumber}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        payrollInfo: {
                          ...prev.payrollInfo,
                          accountNumber: e.target.value
                        }
                      }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="routingNumber">Routing Number</Label>
                    <Input
                      id="routingNumber"
                      value={formData.payrollInfo.routingNumber}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        payrollInfo: {
                          ...prev.payrollInfo,
                          routingNumber: e.target.value
                        }
                      }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="baseRate">Base Rate</Label>
                    <Input
                      id="baseRate"
                      type="number"
                      value={formData.payrollInfo.baseRate}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        payrollInfo: {
                          ...prev.payrollInfo,
                          baseRate: parseFloat(e.target.value)
                        }
                      }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={formData.payrollInfo.currency}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        payrollInfo: {
                          ...prev.payrollInfo,
                          currency: e.target.value
                        }
                      }))}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="paymentFrequency">Payment Frequency</Label>
                  <select
                    id="paymentFrequency"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={formData.payrollInfo.paymentFrequency}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      payrollInfo: {
                        ...prev.payrollInfo,
                        paymentFrequency: e.target.value as "weekly" | "biweekly" | "monthly"
                      }
                    }))}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            </TabsContent>
            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 