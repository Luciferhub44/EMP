/*
  # Clean Database Setup Migration
  
  1. Tables
    - Drop and recreate auth tables
    - Drop and recreate user tables
    - Add necessary indexes and constraints
  
  2. Security
    - Enable RLS
    - Add auth policies
    - Create admin user with proper credentials
*/

-- Drop existing tables
DROP TABLE IF EXISTS auth.users CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Create auth schema
CREATE SCHEMA IF NOT EXISTS auth;

-- Create auth tables
CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  encrypted_password text NOT NULL,
  email_confirmed_at timestamptz,
  role text NOT NULL DEFAULT 'employee',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create public users table
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
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

-- Create auth functions
CREATE OR REPLACE FUNCTION auth.encrypt_password(password text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$;

CREATE OR REPLACE FUNCTION auth.verify_password(password text, encrypted_password text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encrypted_password = crypt(password, encrypted_password);
END;
$$;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can manage all users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create admin user
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Create admin in auth.users
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    role
  ) VALUES (
    'admin@example.com',
    auth.encrypt_password('admin123'),
    now(),
    'admin'
  ) RETURNING id INTO v_admin_id;

  -- Create admin in public.users
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
    v_admin_id,
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
END;
$$;