import { supabase } from '@/lib/supabase'
import type { Employee } from '@/types'

export const employeeService = {
  async getEmployees() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name')

    if (error) throw error
    return data
  },

  async getEmployee(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        assigned_orders:orders(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async updateEmployee(id: string, updates: Partial<Employee>) {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: updates.name,
        email: updates.email,
        role: updates.role,
        status: updates.status,
        business_info: updates.businessInfo,
        payroll_info: updates.payrollInfo,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async calculateCommission(orderId: string, employeeId: string) {
    const { data, error } = await supabase.rpc('calculate_commission', {
      p_order_id: orderId,
      p_employee_id: employeeId
    })

    if (error) throw error
    return data
  },

  async getCommissions(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_commissions')
      .select(`
        *,
        order:order_id (
          id,
          total,
          status
        )
      `)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getPerformance(employeeId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('employee_performance')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('period_start', startDate)
      .lte('period_end', endDate)
      .order('period_start', { ascending: false })

    if (error) throw error
    return data
  },

  async getSchedule(employeeId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('employee_schedules')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')

    if (error) throw error
    return data
  },

  async getEarnings(employeeId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase.rpc('get_employee_earnings', {
      p_employee_id: employeeId,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) throw error
    return data
  }
}