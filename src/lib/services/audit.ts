import { pool, query, queryOne, transaction } from '@/lib/db'
import { BaseService } from './base'
import type { AuditActionType, AuditLog, AuditQuery } from "@/types/audit"

interface AuditSummary {
  total_entries: number
  unique_users: number
  action_types: number
}

export class AuditService extends BaseService {
  async log(
    action: AuditActionType,
    userId: string,
    details: any,
    metadata?: {
      ip?: string
      userAgent?: string
      location?: string
    }
  ): Promise<void> {
    await pool.query(
      `INSERT INTO audit_logs (
        user_id,
        action,
        details,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        action,
        JSON.stringify(details),
        metadata?.ip,
        metadata?.userAgent
      ]
    )
  }

  async getAuditLogs(params: AuditQuery = {}): Promise<AuditLog[]> {
    const conditions = []
    const values = []
    let valueIndex = 1

    if (params.startDate) {
      conditions.push(`created_at >= $${valueIndex}`)
      values.push(params.startDate)
      valueIndex++
    }

    if (params.endDate) {
      conditions.push(`created_at < $${valueIndex}`)
      values.push(params.endDate)
      valueIndex++
    }

    if (params.userId) {
      conditions.push(`user_id = $${valueIndex}`)
      values.push(params.userId)
      valueIndex++
    }

    if (params.action) {
      conditions.push(`action = $${valueIndex}`)
      values.push(params.action)
      valueIndex++
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : ''

    return query<AuditLog>(
      `SELECT a.*,
        u.name as user_name,
        u.role as user_role
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${whereClause}
       ORDER BY created_at DESC`,
      values
    )
  }

  async getAuditSummary(startDate: Date, endDate: Date): Promise<AuditSummary> {
    try {
      const result = await queryOne<AuditSummary>(`
        SELECT 
          COUNT(*) as total_entries,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT action_type) as action_types
        FROM audit_logs
        WHERE created_at BETWEEN $1 AND $2
      `, [startDate, endDate])

      return result || {
        total_entries: 0,
        unique_users: 0,
        action_types: 0
      }
    } catch (error) {
      this.handleError(error, 'Failed to get audit summary')
      return {
        total_entries: 0,
        unique_users: 0,
        action_types: 0
      }
    }
  }

  async clearOldLogs(olderThan: Date): Promise<void> {
    await pool.query(
      'DELETE FROM audit_logs WHERE created_at < $1',
      [olderThan]
    )
  }
}

export const auditService = new AuditService()