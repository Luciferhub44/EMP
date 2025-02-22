-- Create auth schema
CREATE SCHEMA IF NOT EXISTS auth;

-- Create auth.users table
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  email text UNIQUE NOT NULL,
  encrypted_password text NOT NULL,
  email_confirmed_at timestamptz,
  role text NOT NULL DEFAULT 'authenticated',
  aud text DEFAULT 'authenticated',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create public.users table
CREATE TABLE IF NOT EXISTS public.users (
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
  USING (role = 'admin');

-- Create admin user
DO $$
DECLARE
  admin_uuid uuid := gen_random_uuid();
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    role
  ) VALUES (
    admin_uuid,
    'admin@example.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    'authenticated'
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