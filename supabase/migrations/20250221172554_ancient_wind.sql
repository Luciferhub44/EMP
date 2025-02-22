/*
  # Payment and Fulfillment Management System

  1. New Tables
    - payments: Track order payments
    - fulfillments: Track order fulfillment status
    - transport_quotes: Store shipping quotes
    
  2. Functions
    - process_payment: Handle payment processing
    - update_fulfillment_status: Update fulfillment status
    - calculate_shipping: Calculate shipping costs
    
  3. Security
    - RLS policies for all new tables
    - Function security settings
*/

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  method text NOT NULL,
  reference_id text,
  processed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  processed_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create fulfillments table
CREATE TABLE IF NOT EXISTS fulfillments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'failed')),
  carrier text,
  tracking_number text,
  estimated_delivery timestamptz,
  actual_delivery timestamptz,
  handled_by uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transport_quotes table
CREATE TABLE IF NOT EXISTS transport_quotes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  method text NOT NULL,
  cost numeric NOT NULL CHECK (cost >= 0),
  estimated_days integer NOT NULL,
  distance numeric NOT NULL,
  insurance_included boolean DEFAULT false,
  insurance_cost numeric,
  valid_until timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_quotes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Employees can view payments"
  ON payments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Employees can view fulfillments"
  ON fulfillments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Employees can update assigned fulfillments"
  ON fulfillments FOR UPDATE TO authenticated
  USING (
    handled_by = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can manage fulfillments"
  ON fulfillments FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone can view transport quotes"
  ON transport_quotes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage transport quotes"
  ON transport_quotes FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create process_payment function
CREATE OR REPLACE FUNCTION process_payment(
  p_order_id uuid,
  p_amount numeric,
  p_method text,
  p_reference_id text,
  p_processed_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  -- Validate order exists
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id = p_order_id) THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Create payment record
  INSERT INTO payments (
    order_id,
    amount,
    method,
    reference_id,
    processed_by,
    status
  ) VALUES (
    p_order_id,
    p_amount,
    p_method,
    p_reference_id,
    p_processed_by,
    'completed'
  ) RETURNING id INTO v_payment_id;

  -- Update order payment status
  UPDATE orders SET
    payment_status = 'paid',
    updated_at = now()
  WHERE id = p_order_id;

  RETURN v_payment_id;
END;
$$;

-- Create update_fulfillment_status function
CREATE OR REPLACE FUNCTION update_fulfillment_status(
  p_order_id uuid,
  p_status text,
  p_handled_by uuid,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate fulfillment exists
  IF NOT EXISTS (SELECT 1 FROM fulfillments WHERE order_id = p_order_id) THEN
    INSERT INTO fulfillments (order_id, handled_by) VALUES (p_order_id, p_handled_by);
  END IF;

  -- Update fulfillment
  UPDATE fulfillments SET
    status = p_status,
    handled_by = p_handled_by,
    notes = CASE
      WHEN p_note IS NOT NULL THEN array_append(COALESCE(notes, ARRAY[]::text[]), p_note)
      ELSE notes
    END,
    updated_at = now()
  WHERE order_id = p_order_id;

  -- Update order status based on fulfillment
  UPDATE orders SET
    status = CASE
      WHEN p_status = 'delivered' THEN 'delivered'
      WHEN p_status = 'shipped' THEN 'shipped'
      WHEN p_status = 'processing' THEN 'processing'
      ELSE status
    END,
    updated_at = now()
  WHERE id = p_order_id;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fulfillments_updated_at
  BEFORE UPDATE ON fulfillments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transport_quotes_updated_at
  BEFORE UPDATE ON transport_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();