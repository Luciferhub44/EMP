import { useState, useEffect } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { query } from "@/lib/db"
import { api } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Employee } from "@/types/employee"
import { Overview } from "./dashboard/overview-chart"

interface ChartData {
  name: string
  total: number
}

async function getChartData(): Promise<ChartData[]> {
  try {
    const response = await query('SELECT * FROM analytics_monthly_revenue')
    const data: ChartData[] = []
    
    // Format the data for the chart
    if (Array.isArray(response)) {
      response.forEach((row: any) => {
        const date = new Date(row.month)
        data.push({
          name: date.toLocaleString('default', { month: 'short' }),
          total: Number(row.total)
        })
      })
    }
    
    return data
  } catch (error) {
    console.error('Error fetching chart data:', error)
    return []
  }
}

interface EmployeeDetailsProps {
  employee: Employee
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (employee: Employee) => void
}

export function EmployeeDetails({ 
  employee, 
  open, 
  onOpenChange, 
  onUpdate 
}: EmployeeDetailsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{employee.name}</DialogTitle>
          <DialogDescription>
            Employee details and performance overview
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Employee Info Section */}
          <div className="grid gap-4 py-4">
            <div>
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{employee.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Agent ID</p>
                  <p>{employee.agentId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="capitalize">{employee.role}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="capitalize">{employee.status}</p>
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div>
              <h3 className="text-lg font-medium">Business Information</h3>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Company Name</p>
                  <p>{employee.businessInfo.companyName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registration Number</p>
                  <p>{employee.businessInfo.registrationNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tax ID</p>
                  <p>{employee.businessInfo.taxId || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Payroll Information */}
            <div>
              <h3 className="text-lg font-medium">Payroll Information</h3>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Bank Name</p>
                  <p>{employee.payrollInfo.bankName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Number</p>
                  <p>{employee.payrollInfo.accountNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Frequency</p>
                  <p className="capitalize">{employee.payrollInfo.paymentFrequency}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Base Rate</p>
                  <p>${employee.payrollInfo.baseRate}/hr</p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Overview */}
          <Overview />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { Overview } 