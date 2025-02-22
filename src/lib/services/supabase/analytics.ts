import { supabase } from '@/lib/supabase'

export const analyticsService = {
  async getOrderHistory(orderId: string) {
    const { data, error } = await supabase
      .from('order_history')
      .select(`
        *,
        changed_by_user:changed_by (
          name,
          email,
          role
        )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getOrderMetrics(orderId: string) {
    const { data, error } = await supabase
      .from('order_metrics')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (error) throw error
    return data
  },

  async getAnalytics(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('order_analytics')
      .select('*')
      .gte('period_start', startDate)
      .lte('period_end', endDate)
      .order('period_start')

    if (error) throw error
    return data
  },

  async generateAnalytics(startDate: string, endDate: string) {
    const { error } = await supabase.rpc('generate_analytics', {
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) throw error
  },

  async updateOrderRating(orderId: string, rating: number) {
    const { error } = await supabase
      .from('order_metrics')
      .update({ customer_rating: rating })
      .eq('order_id', orderId)

    if (error) throw error
  },

  async getMonthlyRevenue() {
    const { data, error } = await supabase
      .from('order_analytics')
      .select('period_start, total_revenue')
      .order('period_start', { ascending: false })
      .limit(12)

    if (error) throw error
    return data
  },

  async getPerformanceMetrics() {
    const { data, error } = await supabase
      .from('order_analytics')
      .select('*')
      .order('period_start', { ascending: false })
      .limit(1)
      .single()

    if (error) throw error
    return data
  }
}