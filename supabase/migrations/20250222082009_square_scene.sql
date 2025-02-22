-- Create customers table
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

-- Create indexes
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_company ON customers(company);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view customers they have orders with"
  ON customers FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT customer_id 
      FROM orders 
      WHERE assigned_to = auth.uid()
    ) OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can manage customers"
  ON customers FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Add trigger for updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();