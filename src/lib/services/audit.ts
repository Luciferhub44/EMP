import { db } from "@/lib/api/db"
import type { AuditActionType, AuditLog } from "@/types/audit"
import { authService } from "@/lib/services/auth"

export const auditService = {
  log: async (action: string, userId: string, details: any): Promise<void> => {
    const employee = await authService.getEmployeeById(userId)
    const auditEntry: AuditLog = {
      id: `AUD${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: action as AuditActionType,
      userId,
      userRole: employee?.role || 'user',
      details
    }

    await db.query(
      'INSERT INTO storage (key, data) VALUES ($1, $2)',
      [`audit:${auditEntry.id}`, auditEntry]
    )
  },

  getAuditLogs: async (
    startDate?: Date,
    endDate?: Date,
    userId?: string,
    action?: AuditActionType
  ): Promise<AuditLog[]> => {
    const result = await db.query(
      'SELECT data FROM storage WHERE key LIKE \'audit:%\' ORDER BY data->>\'timestamp\' DESC'
    )

    let logs = result.rows.map((row: { data: any }) => row.data)

    // Apply filters
    if (startDate) {
      logs = logs.filter((log: AuditLog) => new Date(log.timestamp) >= startDate)
    }
    if (endDate) {
      logs = logs.filter((log: AuditLog)     => new Date(log.timestamp) <= endDate)
    }
    if (userId) {
      logs = logs.filter((log: AuditLog) => log.userId === userId)
    }
    if (action) {
      logs = logs.filter((log: AuditLog)     => log.action === action)
    }

    return logs
  },

  clearOldLogs: async (olderThan: Date): Promise<void> => {
    const result = await db.query(
      'SELECT key, data FROM storage WHERE key LIKE \'audit:%\''
    )

    const keysToDelete = result.rows
      .filter((row: { data: any }) => new Date(row.data.timestamp) < olderThan)
      .map((row: { key: string }) => row.key)

    if (keysToDelete.length > 0) {
      await db.query(
        'DELETE FROM storage WHERE key = ANY($1)',
        [keysToDelete]
      )
    }
  }
} 