/*
  # Create Inventory Management Tables

  1. New Tables
    - `warehouses`
      - `id` (uuid, primary key)
      - `name` (text)
      - `location` (text)
      - `capacity` (integer)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `inventory`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key)
      - `warehouse_id` (uuid, foreign key)
      - `quantity` (integer)
      - `minimum_stock` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  location text NOT NULL,
  capacity integer NOT NULL CHECK (capacity >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  minimum_stock integer NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);

-- Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for warehouses
CREATE POLICY "Anyone can read warehouses" ON warehouses
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage warehouses" ON warehouses
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create policies for inventory
CREATE POLICY "Anyone can read inventory" ON inventory
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage inventory" ON inventory
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create updated_at triggers
CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create transfer_stock function
CREATE OR REPLACE FUNCTION transfer_stock(
  p_product_id uuid,
  p_from_warehouse uuid,
  p_to_warehouse uuid,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if source has enough stock
  IF NOT EXISTS (
    SELECT 1 FROM inventory 
    WHERE product_id = p_product_id 
    AND warehouse_id = p_from_warehouse 
    AND quantity >= p_quantity
  ) THEN
    RAISE EXCEPTION 'Insufficient stock in source warehouse';
  END IF;

  -- Decrease stock in source warehouse
  UPDATE inventory 
  SET quantity = quantity - p_quantity
  WHERE product_id = p_product_id 
  AND warehouse_id = p_from_warehouse;

  -- Increase stock in destination warehouse
  INSERT INTO inventory (product_id, warehouse_id, quantity)
  VALUES (p_product_id, p_to_warehouse, p_quantity)
  ON CONFLICT (product_id, warehouse_id)
  DO UPDATE SET quantity = inventory.quantity + p_quantity;
END;
$$;