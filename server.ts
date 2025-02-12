import pkg from 'pg';
const { Pool } = pkg;

import express from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Helper function for password hashing
async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, salt, 1000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
}

// Helper function for password verification
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    crypto.pbkdf2(password, salt, 1000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString('hex'));
    });
  });
}

// Configure database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      -- Drop existing indexes first to avoid conflicts
      DROP INDEX IF EXISTS idx_employees_agent_id;
      DROP INDEX IF EXISTS idx_employees_data;
      DROP INDEX IF EXISTS idx_sessions_token;
      DROP INDEX IF EXISTS idx_sessions_user;
      DROP INDEX IF EXISTS idx_customers_email;
      DROP INDEX IF EXISTS idx_customers_data;
      DROP INDEX IF EXISTS idx_products_data;
      DROP INDEX IF EXISTS idx_orders_data;
      DROP INDEX IF EXISTS idx_orders_customer;
      DROP INDEX IF EXISTS idx_orders_status;
      DROP INDEX IF EXISTS idx_orders_payment;
      DROP INDEX IF EXISTS idx_orders_created;
      DROP INDEX IF EXISTS idx_order_items_order;
      DROP INDEX IF EXISTS idx_order_items_product;
      DROP INDEX IF EXISTS idx_fulfillments_order;
      DROP INDEX IF EXISTS idx_fulfillments_status;
      DROP INDEX IF EXISTS idx_transport_quotes_order;
      DROP INDEX IF EXISTS idx_transport_quotes_expires;
      DROP INDEX IF EXISTS idx_messages_thread;
      DROP INDEX IF EXISTS idx_messages_sender;
      DROP INDEX IF EXISTS idx_notifications_user;
      DROP INDEX IF EXISTS idx_notifications_read;
      DROP INDEX IF EXISTS idx_audit_logs_user;
      DROP INDEX IF EXISTS idx_audit_logs_action;
      DROP INDEX IF EXISTS idx_audit_logs_entity;

      -- Auth and Users
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for JSONB fields
      CREATE INDEX IF NOT EXISTS idx_employees_data ON employees USING gin (data);
      CREATE INDEX IF NOT EXISTS idx_employees_agent_id ON employees ((data->>'agentId'));
      CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email ON employees ((data->>'email'));
      CREATE INDEX IF NOT EXISTS idx_employees_role ON employees ((data->>'role'));
      CREATE INDEX IF NOT EXISTS idx_employees_status ON employees ((data->>'status'));
      CREATE INDEX IF NOT EXISTS idx_employees_assigned_orders ON employees USING gin ((data->'assignedOrders'));

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Core Business Tables
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        search_vector tsvector,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Add search vector update function for customers
      CREATE OR REPLACE FUNCTION customers_update_search_vector()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          to_tsvector('english',
            coalesce(NEW.data->>'name', '') || ' ' ||
            coalesce(NEW.data->>'email', '') || ' ' ||
            coalesce(NEW.data->>'company', '')
          );
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;

      -- Add trigger for customers search vector
      DROP TRIGGER IF EXISTS customers_vector_update ON customers;
      CREATE TRIGGER customers_vector_update
        BEFORE INSERT OR UPDATE ON customers
        FOR EACH ROW
        EXECUTE FUNCTION customers_update_search_vector();
      
      -- Create indexes for customers
      CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email 
      ON customers ((data->>'email'));
      CREATE INDEX IF NOT EXISTS idx_customers_name 
      ON customers ((data->>'name'));
      CREATE INDEX IF NOT EXISTS idx_customers_company 
      ON customers ((data->>'company'));
      CREATE INDEX IF NOT EXISTS idx_customers_search 
      ON customers USING gin(search_vector);
      
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        sku TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL,
        data JSONB NOT NULL,
        search_vector tsvector,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Add search vector update function for products
      CREATE OR REPLACE FUNCTION products_update_search_vector()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          to_tsvector('english',
            coalesce(NEW.data->>'name', '') || ' ' ||
            coalesce(NEW.data->>'description', '') || ' ' ||
            coalesce(NEW.data->>'category', '')
          );
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;

      -- Add trigger for products search vector
      DROP TRIGGER IF EXISTS products_vector_update ON products;
      CREATE TRIGGER products_vector_update
        BEFORE INSERT OR UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION products_update_search_vector();

      -- Create indexes for products
      CREATE INDEX IF NOT EXISTS idx_products_category 
      ON products ((data->>'category'));
      CREATE INDEX IF NOT EXISTS idx_products_name 
      ON products ((data->>'name'));
      CREATE INDEX IF NOT EXISTS idx_products_price 
      ON products ((data->>'price'));
      CREATE INDEX IF NOT EXISTS idx_products_search 
      ON products USING gin(search_vector);
      CREATE INDEX IF NOT EXISTS idx_products_inventory 
      ON products USING gin((data->'inventory'));

      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
        warehouse_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        min_quantity INTEGER NOT NULL DEFAULT 0,
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT REFERENCES customers(id),
        search_vector tsvector,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Add search vector update function for orders
      CREATE OR REPLACE FUNCTION orders_update_search_vector()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          to_tsvector('english',
            coalesce(NEW.data->>'id', '') || ' ' ||
            coalesce(NEW.data->>'customerName', '') || ' ' ||
            coalesce(NEW.data->>'status', '')
          );
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;

      -- Add trigger for orders search vector
      DROP TRIGGER IF EXISTS orders_vector_update ON orders;
      CREATE TRIGGER orders_vector_update
        BEFORE INSERT OR UPDATE ON orders
        FOR EACH ROW
        EXECUTE FUNCTION orders_update_search_vector();

      -- Create indexes for orders
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders ((data->>'status'));
      CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders ((data->>'paymentStatus'));
      CREATE INDEX IF NOT EXISTS idx_orders_total ON orders ((data->>'total'));
      CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders ((data->>'customerName'));
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders ((data->>'createdAt'));
      CREATE INDEX IF NOT EXISTS idx_orders_items ON orders USING gin((data->'items'));
      CREATE INDEX IF NOT EXISTS idx_orders_search ON orders USING gin(search_vector);

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
        product_id TEXT REFERENCES products(id),
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Fulfillment and Shipping
      CREATE TABLE IF NOT EXISTS fulfillments (
        id TEXT PRIMARY KEY,
        order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for fulfillments
      CREATE INDEX IF NOT EXISTS idx_fulfillments_status 
      ON fulfillments ((data->>'status'));
      CREATE INDEX IF NOT EXISTS idx_fulfillments_tracking 
      ON fulfillments ((data->>'trackingNumber'));
      CREATE INDEX IF NOT EXISTS idx_fulfillments_carrier 
      ON fulfillments ((data->>'carrier'));

      CREATE TABLE IF NOT EXISTS transport_quotes (
        id TEXT PRIMARY KEY,
        order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for transport quotes
      CREATE INDEX IF NOT EXISTS idx_transport_quotes_provider 
      ON transport_quotes ((data->>'provider'));
      CREATE INDEX IF NOT EXISTS idx_transport_quotes_amount 
      ON transport_quotes ((data->>'amount'));
      CREATE INDEX IF NOT EXISTS idx_transport_quotes_expires 
      ON transport_quotes ((data->>'expiresAt'));

      -- Messaging and Notifications
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        sender_id TEXT REFERENCES employees(id),
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for messages
      CREATE INDEX IF NOT EXISTS idx_messages_content 
      ON messages ((data->>'content'));
      CREATE INDEX IF NOT EXISTS idx_messages_read 
      ON messages ((data->>'read'));

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for notifications
      CREATE INDEX IF NOT EXISTS idx_notifications_type 
      ON notifications ((data->>'type'));
      CREATE INDEX IF NOT EXISTS idx_notifications_read 
      ON notifications ((data->>'read'));
      CREATE INDEX IF NOT EXISTS idx_notifications_created 
      ON notifications ((data->>'createdAt'));

      -- Audit and Logging
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES employees(id),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        changes JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Settings and Configuration
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Storage and Files
      CREATE TABLE IF NOT EXISTS storage (
        key TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_employees_data ON employees USING gin (data);
      CREATE INDEX IF NOT EXISTS idx_employees_agent_id ON employees ((data->>'agentId'));
      CREATE INDEX IF NOT EXISTS idx_customers_data ON customers USING gin (data);
      CREATE INDEX IF NOT EXISTS idx_products_data ON products USING gin (data);
      CREATE INDEX IF NOT EXISTS idx_orders_data ON orders USING gin (data);

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

      CREATE INDEX IF NOT EXISTS idx_fulfillments_order ON fulfillments(order_id);

      CREATE INDEX IF NOT EXISTS idx_transport_quotes_order ON transport_quotes(order_id);

      CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

      -- Create triggers for updated_at timestamps
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_employees_updated_at
          BEFORE UPDATE ON employees
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_customers_updated_at
          BEFORE UPDATE ON customers
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_products_updated_at
          BEFORE UPDATE ON products
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_inventory_updated_at
          BEFORE UPDATE ON inventory
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_orders_updated_at
          BEFORE UPDATE ON orders
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_fulfillments_updated_at
          BEFORE UPDATE ON fulfillments
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      -- Create audit logging function
      CREATE OR REPLACE FUNCTION log_audit_event(
        p_user_id TEXT,
        p_action TEXT,
        p_entity_type TEXT,
        p_entity_id TEXT,
        p_changes JSONB
      )
      RETURNS void AS $$
      BEGIN
        INSERT INTO audit_logs (
          id, user_id, action, entity_type, entity_id, changes
        ) VALUES (
          'audit_' || gen_random_uuid()::text,
          p_user_id,
          p_action,
          p_entity_type,
          p_entity_id,
          p_changes
        );
      END;
      $$ LANGUAGE plpgsql;

      -- Create inventory update function with checks
      CREATE OR REPLACE FUNCTION update_inventory(
        p_product_id TEXT,
        p_warehouse_id TEXT,
        p_quantity INTEGER
      )
      RETURNS INTEGER AS $$
      DECLARE
        v_current_quantity INTEGER;
        v_min_quantity INTEGER;
      BEGIN
        SELECT quantity, min_quantity 
        INTO v_current_quantity, v_min_quantity
        FROM inventory
        WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

        IF v_current_quantity IS NULL THEN
          INSERT INTO inventory (
            id, product_id, warehouse_id, quantity, min_quantity
          ) VALUES (
            'inv_' || gen_random_uuid()::text,
            p_product_id,
            p_warehouse_id,
            p_quantity,
            0
          );
          RETURN p_quantity;
        END IF;

        UPDATE inventory
        SET quantity = v_current_quantity + p_quantity
        WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

        IF v_current_quantity + p_quantity <= v_min_quantity THEN
          INSERT INTO notifications (
            id, type, title, message, data
          ) VALUES (
            'not_' || gen_random_uuid()::text,
            'inventory',
            'Low Stock Alert',
            'Product ' || p_product_id || ' is below minimum stock level',
            jsonb_build_object(
              'product_id', p_product_id,
              'warehouse_id', p_warehouse_id,
              'current_quantity', v_current_quantity + p_quantity,
              'min_quantity', v_min_quantity
            )
          );
        END IF;

        RETURN v_current_quantity + p_quantity;
      END;
      $$ LANGUAGE plpgsql;

      -- Update existing records with search vectors
      UPDATE customers SET data = data;
      UPDATE products SET data = data;
      UPDATE orders SET data = data;
    `);

    // Insert test data
    const testData = {
      employees: [{
        id: 'admin1',
        data: {
          id: 'admin1',
          agentId: 'admin',
          passwordHash: 'admin123',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
          status: 'active',
          assignedOrders: [],
          businessInfo: {
            companyName: 'EMP',
            registrationNumber: '12345',
            taxId: '67890',
            businessAddress: {
              street: '123 Main St',
              city: 'Example City',
              state: 'EX',
              postalCode: '12345',
              country: 'US'
            }
          },
          payrollInfo: {
            bankName: 'Example Bank',
            accountNumber: '123456789',
            routingNumber: '987654321',
            paymentFrequency: 'monthly',
            baseRate: 5000,
            currency: 'USD',
            lastPaymentDate: new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }],
      customers: [{
        id: 'CUST-1',
        data: {
          id: 'CUST-1',
          name: 'Test Customer',
          email: 'customer@example.com',
          phone: '1234567890',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }],
      products: [{
        id: 'PROD-1',
        data: {
          id: 'PROD-1',
          name: 'Test Product',
          description: 'A test product',
          price: 99.99,
          inventory: [{
            warehouseId: 'WH-1',
            quantity: 100,
            minimumStock: 10
          }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }],
      orders: [{
        id: 'ORD-1',
        customer_id: 'CUST-1',
        data: {
          id: 'ORD-1',
          customerId: 'CUST-1',
          items: [{
            productId: 'PROD-1',
            quantity: 1,
            price: 99.99
          }],
          status: 'pending',
          paymentStatus: 'pending',
          total: 99.99,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }],
      transport_quotes: [{
        id: 'TQ-1',
        data: {
          id: 'TQ-1',
          orderId: 'ORD-1',
          provider: 'Test Shipping',
          price: 10.00,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }]
    };

    // Insert test data if not exists
    for (const [table, items] of Object.entries(testData)) {
      for (const item of items) {
        await client.query(
          `INSERT INTO ${table} (id, data) 
           VALUES ($1, $2) 
           ON CONFLICT (id) DO NOTHING`,
          [item.id, item.data]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Database initialized with test data');
  } catch (err) {
    await client.query('ROLLBACK');
    const error = err as Error;
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

// Wrapper function for database queries with error handling
async function executeQuery(queryText: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(queryText, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// API routes
app.get('/api/db/test', async (req, res) => {
  try {
    const result = await executeQuery('SELECT NOW()');
    res.json({ success: true, timestamp: result.rows[0].now });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.post('/api/db/query', async (req, res) => {
  const { text, params } = req.body;
  console.log('Received query:', { text, params });

  try {
    const result = await executeQuery(text, params);
    console.log('Query success:', result.rows.length, 'rows');
    res.json(result);
  } catch (err) {
    const error = err as Error;
    console.error('Query error details:', {
      message: error.message,
      stack: error.stack,
      query: text,
      params: params
    });
    res.status(500).json({ error: error.message });
  }
});

// Add this route to check employee data
app.get('/api/debug/employees', async (req, res) => {
  try {
    const result = await executeQuery('SELECT * FROM employees');
    console.log('Current employees:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server function
async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Database connected: ${process.env.NODE_ENV === 'production' ? 'Production' : 'Development'} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch(console.error);