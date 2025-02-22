import { supabase } from '@/lib/supabase'
import type { FulfillmentStatus } from '@/types'

export const fulfillmentService = {
  async updateStatus(
    orderId: string,
    status: FulfillmentStatus,
    handledBy: string,
    note?: string
  ) {
    const { error } = await supabase.rpc('update_fulfillment_status', {
      p_order_id: orderId,
      p_status: status,
      p_handled_by: handledBy,
      p_note: note
    })

    if (error) throw error
  },

  async getFulfillment(orderId: string) {
    const { data, error } = await supabase
      .from('fulfillments')
      .select(`
        *,
        handler:handled_by (
          name,
          email,
          role
        )
      `)
      .eq('order_id', orderId)
      .single()

    if (error) throw error
    return data
  },

  async updateShippingInfo(
    orderId: string,
    carrier: string,
    trackingNumber: string,
    estimatedDelivery: string
  ) {
    const { error } = await supabase
      .from('fulfillments')
      .update({
        carrier,
        tracking_number: trackingNumber,
        estimated_delivery: estimatedDelivery,
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId)

    if (error) throw error
  },

  async getTransportQuotes(orderId: string) {
    const { data, error } = await supabase
      .from('transport_quotes')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .gte('valid_until', new Date().toISOString())

    if (error) throw error
    return data
  },

  async acceptTransportQuote(quoteId: string) {
    const { error } = await supabase
      .from('transport_quotes')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)

    if (error) throw error
  }
}