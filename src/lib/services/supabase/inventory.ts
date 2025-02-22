import { supabase } from '@/lib/supabase'
import type { Product, Warehouse } from '@/types'

export const inventoryService = {
  async getTotalStock(productId: string): Promise<number> {
    const { data, error } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)
    
    if (error) throw error
    return data?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
  },

  async getWarehouseStock(productId: string, warehouseId: string): Promise<number> {
    const { data, error } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)
      .eq('warehouse_id', warehouseId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error // PGRST116 is "no rows returned"
    return data?.quantity || 0
  },

  async updateStock(productId: string, warehouseId: string, quantity: number): Promise<void> {
    const { error } = await supabase
      .from('inventory')
      .upsert({
        product_id: productId,
        warehouse_id: warehouseId,
        quantity
      })
    
    if (error) throw error
  },

  async transferStock(
    productId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    quantity: number
  ): Promise<void> {
    const { error } = await supabase.rpc('transfer_stock', {
      p_product_id: productId,
      p_from_warehouse: fromWarehouseId,
      p_to_warehouse: toWarehouseId,
      p_quantity: quantity
    })
    
    if (error) throw error
  },

  async getWarehouses(): Promise<Warehouse[]> {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data
  },

  async getProductsNeedingRestock(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        products!inner (
          id,
          name,
          model,
          sku,
          price,
          category,
          subcategory,
          status,
          specifications
        ),
        warehouse_id,
        quantity,
        minimum_stock
      `)
      .lte('quantity', 'minimum_stock')
    
    if (error) throw error
    return data?.map(item => ({
      id: item.products.id,
      name: item.products.name,
      model: item.products.model,
      sku: item.products.sku,
      price: item.products.price,
      category: item.products.category,
      subCategory: item.products.subcategory,
      status: item.products.status,
      specifications: item.products.specifications,
      inventory: [{
        quantity: item.quantity,
        minimumStock: item.minimum_stock,
        warehouseId: item.warehouse_id
      }]
    })) || []
  }
}