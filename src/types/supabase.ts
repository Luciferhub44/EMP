export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'employee'
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
          agent_id: string | null
          business_info: Json | null
          payroll_info: Json | null
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: 'admin' | 'employee'
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
          agent_id?: string | null
          business_info?: Json | null
          payroll_info?: Json | null
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin' | 'employee'
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
          agent_id?: string | null
          business_info?: Json | null
          payroll_info?: Json | null
        }
      }
      products: {
        Row: {
          id: string
          name: string
          model: string
          sku: string
          price: number
          category: string
          subcategory: string | null
          status: 'active' | 'inactive'
          specifications: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          model: string
          sku: string
          price: number
          category: string
          subcategory?: string | null
          status?: 'active' | 'inactive'
          specifications?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          model?: string
          sku?: string
          price?: number
          category?: string
          subcategory?: string | null
          status?: 'active' | 'inactive'
          specifications?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          company: string | null
          address: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          company?: string | null
          address: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          company?: string | null
          address?: Json
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          customer_id: string
          status: string
          payment_status: string
          shipping_address: Json
          items: Json
          subtotal: number
          tax: number
          shipping_cost: number
          total: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          status?: string
          payment_status?: string
          shipping_address: Json
          items: Json
          subtotal: number
          tax: number
          shipping_cost: number
          total: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          status?: string
          payment_status?: string
          shipping_address?: Json
          items?: Json
          subtotal?: number
          tax?: number
          shipping_cost?: number
          total?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      warehouses: {
        Row: {
          id: string
          name: string
          location: string
          capacity: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          location: string
          capacity: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          location?: string
          capacity?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      inventory: {
        Row: {
          id: string
          product_id: string
          warehouse_id: string
          quantity: number
          minimum_stock: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          warehouse_id: string
          quantity: number
          minimum_stock: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          warehouse_id?: string
          quantity?: number
          minimum_stock?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}