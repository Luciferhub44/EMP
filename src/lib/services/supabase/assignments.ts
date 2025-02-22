import { supabase } from '@/lib/supabase'
import type { Order } from '@/types'

export const assignmentService = {
  async assignOrder(orderId: string, employeeId: string, assignedBy: string, notes?: string) {
    const { error } = await supabase.rpc('assign_order', {
      p_order_id: orderId,
      p_employee_id: employeeId,
      p_assigned_by: assignedBy,
      p_notes: notes
    })

    if (error) throw error
  },

  async unassignOrder(orderId: string, employeeId: string) {
    const { error } = await supabase.rpc('unassign_order', {
      p_order_id: orderId,
      p_employee_id: employeeId
    })

    if (error) throw error
  },

  async getEmployeeOrders(employeeId: string): Promise<Order[]> {
    const { data, error } = await supabase.rpc('get_employee_orders', {
      p_employee_id: employeeId
    })

    if (error) throw error
    return data
  },

  async getOrderAssignments(orderId: string) {
    const { data, error } = await supabase
      .from('order_assignments')
      .select(`
        *,
        employee:employee_id (
          name,
          email,
          role
        ),
        assigned_by_user:assigned_by (
          name,
          email,
          role
        )
      `)
      .eq('order_id', orderId)
      .order('assigned_at', { ascending: false })

    if (error) throw error
    return data
  }
}