import { pool, query, queryOne } from '@/lib/db'
import type { AuditActionType, AuditLog, AuditQuery, AuditSummary } from "@/types/audit"

class AuditService {
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
    return queryOne<AuditSummary>(
      `SELECT
        COUNT(*) as "totalEvents",
        COUNT(*) FILTER (WHERE details->>'status' = 'success') as "successCount",
        COUNT(*) FILTER (WHERE details->>'status' = 'failure') as "failureCount",
        jsonb_object_agg(
          action,
          COUNT(*)
        ) as "actionCounts",
        jsonb_object_agg(
          user_id,
          COUNT(*)
        ) as "userCounts",
        array_agg(
          json_build_object(
            'hour', EXTRACT(HOUR FROM created_at),
            'count', COUNT(*)
          )
        ) as "timeDistribution"
       FROM audit_logs
       WHERE created_at >= $1
       AND created_at < $2
       GROUP BY DATE_TRUNC('day', created_at)`,
      [startDate, endDate]
    )
  }

  async clearOldLogs(olderThan: Date): Promise<void> {
    await pool.query(
      'DELETE FROM audit_logs WHERE created_at < $1',
      [olderThan]
    )
  }
}

export const auditService = new AuditService()