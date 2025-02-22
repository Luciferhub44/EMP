-- Create authenticated role if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
END
$$;

-- Create employee_payments table
CREATE TABLE employee_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('salary', 'commission', 'bonus', 'misc')),
  amount numeric NOT NULL CHECK (amount >= 0),
  description text NOT NULL,
  reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  issued_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_employee_payments_employee_id ON employee_payments(employee_id);
CREATE INDEX idx_employee_payments_created_at ON employee_payments(created_at);
CREATE INDEX idx_employee_payments_status ON employee_payments(status);

-- Enable RLS
ALTER TABLE employee_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Employees can view own payments"
  ON employee_payments FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage payments"
  ON employee_payments FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Add trigger for updated_at
CREATE TRIGGER update_employee_payments_updated_at
  BEFORE UPDATE ON employee_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();