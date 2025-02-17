import type { AuditActionType, AuditLog } from "@/types/audit"

export const auditService = {
  log: async (action: string, userId: string, details: any): Promise<void> => {
    try {
      await fetch('/api/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          action,
          userId,
          details
        })
      })
    } catch (error) {
      console.error('Failed to log audit:', error)
    }
  },

  getAuditLogs: async (
    startDate?: Date,
    endDate?: Date,
    userId?: string,
    action?: AuditActionType
  ): Promise<AuditLog[]> => {
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())
      if (userId) params.append('userId', userId)
      if (action) params.append('action', action)

      const response = await fetch(`/api/audit/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch audit logs')
      return response.json()
    } catch (error) {
      console.error('Failed to get audit logs:', error)
      return []
    }
  },

  clearOldLogs: async (olderThan: Date): Promise<void> => {
    try {
      await fetch('/api/audit/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ olderThan: olderThan.toISOString() })
      })
    } catch (error) {
      console.error('Failed to clear old logs:', error)
    }
  }
} 