import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types'

export const customerService = {
  async getCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name')

    if (error) throw error
    return data
  },

  async getCustomer(id: string) {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        orders (
          id,
          status,
          payment_status,
          total,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return {
      ...data,
      orders: data.orders || []
    }
  },

  async createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await supabase
      .from('customers')
      .insert([{
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        company: customerData.company,
        address: customerData.address
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateCustomer(id: string, updates: Partial<Customer>) {
    const { data, error } = await supabase
      .from('customers')
      .update({
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        company: updates.company,
        address: updates.address,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteCustomer(id: string) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getCustomerOrders(customerId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }
}