import { supabase } from '@/lib/supabase'

export const paymentService = {
  async processPayment(
    orderId: string,
    amount: number,
    method: string,
    referenceId: string,
    processedBy: string
  ) {
    const { data, error } = await supabase.rpc('process_payment', {
      p_order_id: orderId,
      p_amount: amount,
      p_method: method,
      p_reference_id: referenceId,
      p_processed_by: processedBy
    })

    if (error) throw error
    return data
  },

  async getOrderPayments(orderId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        processor:processed_by (
          name,
          email,
          role
        )
      `)
      .eq('order_id', orderId)
      .order('processed_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getPaymentsByStatus(status: string) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        order:order_id (
          id,
          customer_id,
          total
        ),
        processor:processed_by (
          name,
          email
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }
}