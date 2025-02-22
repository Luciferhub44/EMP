-- Drop existing tables and schema
DROP SCHEMA IF EXISTS auth CASCADE;
DROP SCHEMA IF EXISTS public CASCADE;

-- Recreate schemas
CREATE SCHEMA auth;
CREATE SCHEMA public;

-- Create extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table first (in public schema)
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can manage all users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (role = 'admin');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger to users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create admin user
INSERT INTO public.users (
  email,
  name,
  role,
  status,
  agent_id,
  business_info,
  payroll_info
) VALUES (
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