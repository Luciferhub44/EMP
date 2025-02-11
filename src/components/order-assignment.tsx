import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { employeeService } from "@/lib/services/employee"
import { ordersService } from "@/lib/services/orders"
import { toast } from "@/components/ui/use-toast"
import type { Employee } from "@/types/employee"

interface OrderAssignmentProps {
  orderId: string
  currentAssignee?: string
}

export function OrderAssignment({ orderId, currentAssignee }: OrderAssignmentProps) {
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const loadEmployees = async () => {
      try {
        const data = await employeeService.getEmployees()
        setEmployees(data)
      } catch (error) {
        console.error("Failed to load employees:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadEmployees()
  }, [])

  const handleAssign = async (employeeId: string) => {
    try {
      if (employeeId === currentAssignee) return

      // If unassigning
      if (employeeId === "unassigned" && currentAssignee) {
        await employeeService.unassignOrder(orderId, currentAssignee, true)
      } 
      // If assigning to new employee
      else if (employeeId !== "unassigned") {
        if (currentAssignee) {
          await employeeService.unassignOrder(orderId, currentAssignee, true)
        }
        await employeeService.assignOrder(orderId, employeeId, true)
      }

      await ordersService.updateOrder(orderId, {
        assignedTo: employeeId === "unassigned" ? undefined : employeeId
      })

      toast({
        title: "Success",
        description: "Order assignment updated",
      })
    } catch (error) {
      console.error("Failed to assign order:", error)
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive",
      })
    }
  }

  if (isLoading) return null

  return (
    <Select
      value={currentAssignee || "unassigned"}
      onValueChange={handleAssign}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Assign to..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {employees.map((employee) => (
          <SelectItem key={employee.id} value={employee.id}>
            {employee.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
} 