/*
  # Fix Database Schema
  
  1. Drop existing tables
  2. Create tables in correct order
  3. Set up RLS policies
  4. Create admin user
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS payroll_adjustments CASCADE;
DROP TABLE IF EXISTS employee_schedules CASCADE;
DROP TABLE IF EXISTS transport_assignments CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS transport_routes CASCADE;
DROP TABLE IF EXISTS transport_vehicles CASCADE;
DROP TABLE IF EXISTS commission_rates CASCADE;
DROP TABLE IF EXISTS payroll_periods CASCADE;
DROP TABLE IF EXISTS transport_quotes CASCADE;
DROP TABLE IF EXISTS transport_providers CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create Users table first
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'employee')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  agent_id text UNIQUE,
  business_info jsonb DEFAULT '{}',
  payroll_info jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  model text NOT NULL,
  sku text UNIQUE NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  category text NOT NULL,
  subcategory text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  specifications jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customers table
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  address jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  shipping_address jsonb NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax numeric NOT NULL DEFAULT 0 CHECK (tax >= 0),
  shipping_cost numeric NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone can read products" ON products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage products" ON products
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone can read customers" ON customers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage customers" ON customers
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone can read orders" ON orders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage orders" ON orders
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create admin user
DO $$
DECLARE
  admin_uuid uuid := gen_random_uuid();
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    role,
    aud,
    created_at
  ) VALUES (
    admin_uuid,
    '00000000-0000-0000-0000-000000000000',
    'admin@example.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    'authenticated',
    'authenticated',
    now()
  );

  -- Insert into public.users
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    status,
    agent_id,
    business_info,
    payroll_info
  ) VALUES (
    admin_uuid,
    'admin@example.com',
    'System Admin',
    'admin',
    'active',
    'ADMIN001',
    '{
      "companyName": "SANY Equipment",
      "registrationNumber": "93-1671162",
      "taxId": "93-1671162",
      "businessAddress": {
        "street": "228 Park Ave S",
        "city": "New York",
        "state": "NY",
        "postalCode": "10003",
        "country": "USA"
      }
    }'::jsonb,
    '{
      "bankName": "Bank of America",
      "accountNumber": "483101090345",
      "routingNumber": "21000322",
      "paymentFrequency": "monthly",
      "baseRate": 5000,
      "currency": "USD",
      "commissionRate": 2.5
    }'::jsonb
  );
END $$;