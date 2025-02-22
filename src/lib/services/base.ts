import { Pool, PoolClient } from 'pg'
import { query, queryOne, transaction } from '@/lib/db'
import { toast } from "@/components/ui/use-toast"

export class BaseService {
  protected handleError(error: unknown, customMessage?: string) {
    console.error(error)
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
      this.handleError(error, "Database query failed")
      throw error
    }
  }

  protected async queryOne<T extends Record<string, any>>(sql: string, params?: any[]): Promise<T | null> {
    try {
      return await queryOne<T>(sql, params)
    } catch (error) {
      this.handleError(error, "Database query failed")
      throw error
    }
  }

  protected async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    try {
      return await transaction(callback)
    } catch (error) {
      this.handleError(error, "Transaction failed")
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
    const updateFields = Object.entries(updates)
      .filter(([key]) => allowedFields.includes(key))
      .map(([key, value], index) => {
        if (typeof value === 'object') {
          return `${key} = $${index + 2}::jsonb`
        }
        return `${key} = $${index + 2}`
      })

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update')
    }

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
      values: [id, ...Object.values(updates).filter((_, i) => allowedFields.includes(Object.keys(updates)[i]))]
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
        INSERT INTO ${table} (${fields.join(', ')})
        VALUES (${placeholders})
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
      `,
      values: Object.values(conditions)
    }
  }
}