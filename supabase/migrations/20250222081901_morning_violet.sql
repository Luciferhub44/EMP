-- Create orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')
  ),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'paid', 'failed', 'refunded')
  ),
  items jsonb NOT NULL DEFAULT '[]',
  shipping_address jsonb,
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax numeric NOT NULL DEFAULT 0 CHECK (tax >= 0),
  shipping_cost numeric NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes text,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_history table for tracking status changes
CREATE TABLE order_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  previous_status text,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create fulfillments table
CREATE TABLE fulfillments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'shipped', 'delivered', 'failed')
  ),
  carrier text,
  tracking_number text,
  estimated_delivery timestamptz,
  actual_delivery timestamptz,
  notes text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view assigned orders"
  ON orders FOR SELECT TO authenticated
  USING (
    assigned_to = auth.uid() OR 
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Users can update assigned orders"
  ON orders FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid() OR 
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can manage orders"
  ON orders FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view order history"
  ON order_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_history.order_id
      AND (orders.assigned_to = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
    )
  );

CREATE POLICY "Users can view fulfillments"
  ON fulfillments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = fulfillments.order_id
      AND (orders.assigned_to = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
    )
  );

CREATE POLICY "Users can update assigned fulfillments"
  ON fulfillments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = fulfillments.order_id
      AND (orders.assigned_to = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
    )
  );

-- Add triggers
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fulfillments_updated_at
  BEFORE UPDATE ON fulfillments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();