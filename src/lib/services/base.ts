import type { PoolClient } from 'pg'
import { query, queryOne, transaction } from '@/lib/db'
import { toast } from "@/components/ui/use-toast"

export class BaseService {
  protected handleError(error: unknown, customMessage?: string) {
    console.error('Service Error:', error)
    toast({
      title: "Error",
      description: customMessage || "An unexpected error occurred",
      variant: "destructive",
    })
    throw error
  }

  protected handleSuccess(message: string) {
    toast({
      title: "Success",
      description: message,
    })
  }

  protected async query<T extends Record<string, any>>(sql: string, params?: any[]): Promise<T[]> {
    try {
      return await query<T>(sql, params)
    } catch (error) {
      if (error instanceof Error && error.message.includes('connection')) {
        this.handleError(error, "Database connection failed")
      } else {
        this.handleError(error, "Database query failed")
      }
      throw error
    }
  }

  protected async queryOne<T extends Record<string, any>>(sql: string, params?: any[]): Promise<T | null> {
    try {
      return await queryOne<T>(sql, params)
    } catch (error) {
      if (error instanceof Error && error.message.includes('connection')) {
        this.handleError(error, "Database connection failed")
      } else {
        this.handleError(error, "Database query failed")
      }
      throw error
    }
  }

  protected async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    try {
      return await transaction(callback)
    } catch (error) {
      if (error instanceof Error && error.message.includes('connection')) {
        this.handleError(error, "Database connection failed")
      } else {
        this.handleError(error, "Transaction failed")
      }
      throw error
    }
  }

  protected buildUpdateQuery(
    table: string,
    id: string,
    updates: Record<string, any>,
    allowedFields: string[],
    additionalConditions?: string
  ) {
    const filteredUpdates: Record<string, unknown> = Object.entries(updates)
      .filter(([key]) => allowedFields.includes(key))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as Record<string, unknown>)

    if (Object.keys(filteredUpdates).length === 0) {
      throw new Error('No valid fields to update')
    }

    const updateFields = Object.keys(filteredUpdates)
      .map((key, index) => {
        const value = filteredUpdates[key]
        return typeof value === 'object' 
          ? `${key} = $${index + 2}::jsonb`
          : `${key} = $${index + 2}`
      })

    const conditions = [`id = $1`]
    if (additionalConditions) {
      conditions.push(additionalConditions)
    }

    return {
      sql: `
        UPDATE ${table}
        SET ${updateFields.join(', ')},
            updated_at = NOW()
        WHERE ${conditions.join(' AND ')}
        RETURNING *
      `,
      values: [id, ...Object.values(filteredUpdates)]
    }
  }

  protected buildInsertQuery(
    table: string,
    data: Record<string, any>,
    returnFields: string = '*'
  ) {
    const fields = Object.keys(data)
    const values = Object.values(data)
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')

    return {
      sql: `
        INSERT INTO ${table} (${fields.join(', ')}, created_at, updated_at)
        VALUES (${placeholders}, NOW(), NOW())
        RETURNING ${returnFields}
      `,
      values
    }
  }

  protected buildSelectQuery(
    table: string,
    conditions: Record<string, any> = {},
    options: {
      fields?: string[]
      joins?: string[]
      orderBy?: string
      limit?: number
      offset?: number
    } = {}
  ) {
    const fields = options.fields?.join(', ') || '*'
    const joins = options.joins?.join(' ') || ''
    const where = Object.keys(conditions).length > 0
      ? `WHERE ${Object.keys(conditions)
          .map((key, i) => `${key} = $${i + 1}`)
          .join(' AND ')}`
      : ''
    const orderBy = options.orderBy ? `ORDER BY ${options.orderBy}` : ''
    const limit = options.limit ? `LIMIT ${options.limit}` : ''
    const offset = options.offset ? `OFFSET ${options.offset}` : ''

    return {
      sql: `
        SELECT ${fields}
        FROM ${table}
        ${joins}
        ${where}
        ${orderBy}
        ${limit}
        ${offset}
      `.trim(),
      values: Object.values(conditions)
    }
  }
}