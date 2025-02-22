import { supabase } from '@/lib/supabase'
import type { Order, OrderStatus } from '@/types'

export const ordersService = {
  async getOrders(userId: string, isAdmin: boolean) {
    const query = supabase
      .from('orders')
      .select(`
        *,
        customers (
          name,
          email,
          company
        )
      `)
      .order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) throw error
    
    return data.map(order => ({
      ...order,
      customerName: order.customers.name
    }))
  },

  async getOrder(id: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return {
      ...data,
      customerName: data.customers.name
    }
  },

  async createOrder(orderData: Partial<Order>) {
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        customer_id: orderData.customerId,
        shipping_address: orderData.shippingAddress,
        items: orderData.items,
        subtotal: orderData.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0,
        tax: 0, // Calculate tax based on your business logic
        shipping_cost: 0, // Set shipping cost based on your business logic
        total: orderData.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0,
        notes: orderData.notes
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateOrder(id: string, updates: Partial<Order>) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: updates.status,
        payment_status: updates.paymentStatus,
        shipping_address: updates.shippingAddress,
        notes: updates.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateStatus(orderId: string, status: OrderStatus) {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)

    if (error) throw error
  },

  async deleteOrder(orderId: string) {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)

    if (error) throw error
  }
}