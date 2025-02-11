import type { EmployeeRole } from "./employee"

export type AuditActionType = 
  | "login"
  | "logout"
  | "failed_login"
  | "password_change"
  | "profile_update"
  | "order_create"
  | "order_update"
  | "order_delete"
  | "product_create"
  | "product_update"
  | "product_delete"
  | "customer_create"
  | "customer_update"
  | "customer_delete"
  | "employee_create"
  | "employee_update"
  | "employee_delete"
  | "session_expired"
  | "session_terminated"

export interface AuditLog {
  id: string
  timestamp: string
  action: AuditActionType
  userId: string
  userRole: EmployeeRole
  details: {
    agentId?: string
    resourceId?: string
    resourceType?: string
    changes?: {
      before?: any
      after?: any
    }
    metadata?: {
      ip?: string
      userAgent?: string
      location?: string
    }
    status?: "success" | "failure"
    reason?: string
  }
  sessionId?: string
}

export interface AuditQuery {
  startDate?: Date
  endDate?: Date
  userId?: string
  action?: AuditActionType
  resourceType?: string
  status?: "success" | "failure"
}

export interface AuditSummary {
  totalEvents: number
  successCount: number
  failureCount: number
  actionCounts: Record<AuditActionType, number>
  userCounts: Record<string, number>
  timeDistribution: {
    hour: number
    count: number
  }[]
} 