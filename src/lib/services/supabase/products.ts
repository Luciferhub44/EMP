import { supabase } from '@/lib/supabase'
import type { Product } from '@/types'

export const productService = {
  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        inventory (
          quantity,
          minimum_stock,
          warehouse_id
        )
      `)
      .order('name')

    if (error) throw error
    return data
  },

  async getProduct(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        inventory (
          quantity,
          minimum_stock,
          warehouse_id,
          warehouses (
            name,
            location
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createProduct(productData: Omit<Product, 'id' | 'inventory'>) {
    const { data, error } = await supabase
      .from('products')
      .insert([{
        name: productData.name,
        model: productData.model,
        sku: productData.sku,
        price: productData.price,
        category: productData.category,
        subcategory: productData.subCategory,
        specifications: productData.specifications,
        status: 'active'
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    const { data, error } = await supabase
      .from('products')
      .update({
        name: updates.name,
        model: updates.model,
        sku: updates.sku,
        price: updates.price,
        category: updates.category,
        subcategory: updates.subCategory,
        specifications: updates.specifications,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteProduct(id: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}