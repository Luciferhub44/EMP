-- Create authenticated role if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
END
$$;
-- Create transport_quotes table
CREATE TABLE transport_quotes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  method text NOT NULL,
  cost numeric NOT NULL CHECK (cost >= 0),
  estimated_days integer NOT NULL,
  distance numeric NOT NULL,
  insurance jsonb DEFAULT '{"included": false}',
  valid_until timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'rejected', 'expired')
  ),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transport_routes table for caching distances
CREATE TABLE transport_routes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  origin_postal text NOT NULL,
  dest_postal text NOT NULL,
  distance numeric NOT NULL,
  calculated_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(origin_postal, dest_postal)
);

-- Create indexes
CREATE INDEX idx_transport_quotes_order_id ON transport_quotes(order_id);
CREATE INDEX idx_transport_quotes_status ON transport_quotes(status);
CREATE INDEX idx_transport_quotes_valid_until ON transport_quotes(valid_until);
CREATE INDEX idx_transport_routes_postal_codes ON transport_routes(origin_postal, dest_postal);

-- Enable RLS
ALTER TABLE transport_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_routes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view quotes for assigned orders"
  ON transport_quotes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = transport_quotes.order_id
      AND (orders.assigned_to = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
    )
  );

CREATE POLICY "Admins can manage quotes"
  ON transport_quotes FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone can view routes"
  ON transport_routes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage routes"
  ON transport_routes FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Add triggers
CREATE TRIGGER update_transport_quotes_updated_at
  BEFORE UPDATE ON transport_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to expire old quotes
CREATE OR REPLACE FUNCTION expire_old_quotes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE transport_quotes
  SET status = 'expired'
  WHERE status = 'pending'
  AND valid_until < NOW();
END;
$$;

-- Create function to accept quote
CREATE OR REPLACE FUNCTION accept_transport_quote(
  p_quote_id uuid,
  p_order_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify quote exists and is valid
  IF NOT EXISTS (
    SELECT 1 FROM transport_quotes
    WHERE id = p_quote_id
    AND order_id = p_order_id
    AND status = 'pending'
    AND valid_until > NOW()
  ) THEN
    RAISE EXCEPTION 'Invalid or expired quote';
  END IF;

  -- Accept quote and reject others
  UPDATE transport_quotes
  SET status = CASE
    WHEN id = p_quote_id THEN 'accepted'
    ELSE 'rejected'
  END,
  updated_at = NOW()
  WHERE order_id = p_order_id
  AND status = 'pending';

  -- Update order status
  UPDATE orders
  SET status = 'processing',
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Create fulfillment record if it doesn't exist
  INSERT INTO fulfillments (order_id, status, notes)
  VALUES (
    p_order_id,
    'processing',
    ARRAY['Transport quote accepted']
  )
  ON CONFLICT (order_id) DO UPDATE
  SET status = 'processing',
      notes = array_append(fulfillments.notes, 'Transport quote accepted'),
      updated_at = NOW();
END;
$$;