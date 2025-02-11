import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { employeeService } from "@/lib/services/employee"
import { useAuth } from "@/contexts/auth-context"
import { Plus, Key, Search, FileText } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { EmployeeDetails } from "@/components/employee-details"
import type { Employee } from "@/types/employee"
import { useNavigate } from "react-router-dom"

export default function EmployeesPage() {
  const { user } = useAuth()
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [isAddingEmployee, setIsAddingEmployee] = React.useState(false)
  const [newEmployee, setNewEmployee] = React.useState<{
    name: string
    email: string
    agentId: string
    role: "employee" | "admin"
    password: string
  }>({
    name: "",
    email: "",
    agentId: "",
    role: "employee",
    password: "",
  })
  const [resetPasswordFor, setResetPasswordFor] = React.useState<string | null>(null)
  const [newPassword, setNewPassword] = React.useState("")
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null)
  const navigate = useNavigate()

  // Load employees
  React.useEffect(() => {
    const loadEmployees = async () => {
      try {
        const data = await employeeService.getEmployees()
        setEmployees(data)
      } catch (error) {
        console.error("Failed to load employees:", error)
        toast({
          title: "Error",
          description: "Failed to load employees",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    loadEmployees()
  }, [])

  // Filter employees based on search
  const filteredEmployees = React.useMemo(() => {
    const searchLower = search.toLowerCase()
    return employees.filter(employee => 
      employee.name.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower) ||
      employee.agentId.toLowerCase().includes(searchLower)
    )
  }, [employees, search])

  // Handle adding new employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingEmployee(true)
    try {
      const employee = await employeeService.createEmployee({
        name: newEmployee.name,
        email: newEmployee.email,
        agentId: newEmployee.agentId,
        role: newEmployee.role,
        status: 'active',
        businessInfo: {
          companyName: '',
          registrationNumber: '',
          taxId: '',
          businessAddress: {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: ''
          }
        },
        payrollInfo: {
          bankName: '',
          accountNumber: '',
          routingNumber: '',
          currency: 'USD',
          paymentFrequency: 'monthly',
          baseRate: 0,
          lastPaymentDate: new Date().toISOString(),
          paymentHistory: []
        },
        assignedOrders: [],
        password: newEmployee.password
      }, true)
      setEmployees(prev => [...prev, employee as Employee])
      toast({
        title: "Success",
        description: "Employee added successfully",
      })
      setNewEmployee({
        name: "",
        email: "",
        agentId: "",
        role: "employee",
        password: "",
      })
    } catch (error) {
      console.error("Failed to add employee:", error)
      toast({
        title: "Error",
        description: "Failed to add employee",
        variant: "destructive",
      })
    } finally {
      setIsAddingEmployee(false)
    }
  }

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetPasswordFor) return

    try {
      await employeeService.resetPassword(resetPasswordFor, newPassword)
      toast({
        title: "Success",
        description: "Password reset successfully",
      })
      setResetPasswordFor(null)
      setNewPassword("")
    } catch (error) {
      console.error("Failed to reset password:", error)
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      })
    }
  }

  // Handle status toggle
  const handleToggleStatus = async (employeeId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active"
      const updatedEmployee = await employeeService.updateEmployee(employeeId, {
        status: newStatus
      }, true)
      setEmployees(prev => 
        prev.map(emp => emp.id === employeeId ? updatedEmployee : emp)
      )
      toast({
        title: "Success",
        description: `Employee ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
      })
    } catch (error) {
      console.error("Failed to update employee status:", error)
      toast({
        title: "Error",
        description: "Failed to update employee status",
        variant: "destructive",
      })
    }
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have permission to view this page.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground">
            Manage employee accounts and permissions
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Create a new employee account
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddEmployee}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee(prev => ({
                      ...prev,
                      email: e.target.value
                    }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="agentId">Agent ID</Label>
                  <Input
                    id="agentId"
                    value={newEmployee.agentId}
                    onChange={(e) => setNewEmployee(prev => ({
                      ...prev,
                      agentId: e.target.value
                    }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newEmployee.role}
                    onValueChange={(value: "employee" | "admin") => 
                      setNewEmployee((prev) => ({
                        ...prev,
                        role: value
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee(prev => ({
                      ...prev,
                      password: e.target.value
                    }))}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isAddingEmployee}>
                  {isAddingEmployee ? "Adding..." : "Add Employee"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="mt-2 text-lg font-medium">No employees found</p>
              <p className="text-sm text-muted-foreground">
                {search ? 
                  "Try adjusting your search" : 
                  "Add your first employee to get started"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Agent ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {employee.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{employee.agentId}</TableCell>
                    <TableCell>
                      <Badge variant={employee.role === "admin" ? "default" : "secondary"}>
                        {employee.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={employee.status === "active" ? "success" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => handleToggleStatus(employee.id, employee.status)}
                      >
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(employee.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setResetPasswordFor(employee.agentId)}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reset Password</DialogTitle>
                              <DialogDescription>
                                Reset password for {employee.name}
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleResetPassword}>
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="new-password">New Password</Label>
                                  <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button type="submit">
                                  Reset Password
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEmployee(employee)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/employees/${employee.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedEmployee && (
        <EmployeeDetails
          employee={selectedEmployee}
          open={!!selectedEmployee}
          onOpenChange={(open) => !open && setSelectedEmployee(null)}
          onUpdate={(updatedEmployee) => {
            setEmployees(prev => 
              prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp)
            )
          }}
        />
      )}
    </div>
  )
} 