import pkg from 'pg';
const { Pool } = pkg;

import express from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const DEFAULT_PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = DEFAULT_PORT;

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
  ssl: { rejectUnauthorized: false },
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

    // Drop all tables in correct order to avoid constraint errors
    await client.query(`
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS messages CASCADE;
      DROP TABLE IF EXISTS transport_quotes CASCADE;
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS fulfillments CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS inventory CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS customers CASCADE;
      DROP TABLE IF EXISTS sessions CASCADE;
      DROP TABLE IF EXISTS employees CASCADE;
      DROP TABLE IF EXISTS settings CASCADE;
      DROP TABLE IF EXISTS storage CASCADE;
    `);

    // Create tables
    await client.query(`
      -- First create base tables without foreign keys
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        sku TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Then create tables with foreign keys
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

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
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS fulfillments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transport_quotes (
        id TEXT PRIMARY KEY,
        order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL REFERENCES employees(id),
        sender_id TEXT NOT NULL REFERENCES employees(id),
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES employees(id),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        changes JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS storage (
        key TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transport_companies (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transport_orders (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Now add foreign key constraints
      DO $$ 
      BEGIN
        -- Sessions FK
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_sessions_user'
        ) THEN
          ALTER TABLE sessions
            ADD CONSTRAINT fk_sessions_user
            FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE;
        END IF;

        -- Orders FK
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_customer'
        ) THEN
          ALTER TABLE orders
            ADD CONSTRAINT fk_orders_customer
            FOREIGN KEY (customer_id) REFERENCES customers(id);
        END IF;

        -- Order Items FKs
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_order'
        ) THEN
          ALTER TABLE order_items
            ADD CONSTRAINT fk_order_items_order
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_product'
        ) THEN
          ALTER TABLE order_items
            ADD CONSTRAINT fk_order_items_product
            FOREIGN KEY (product_id) REFERENCES products(id);
        END IF;

        -- Inventory FK
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventory_product'
        ) THEN
          ALTER TABLE inventory
            ADD CONSTRAINT fk_inventory_product
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
        END IF;

        -- Fulfillments FK
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_fulfillments_order'
        ) THEN
          ALTER TABLE fulfillments
            ADD CONSTRAINT fk_fulfillments_order
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
        END IF;

        -- Transport Quotes FK
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_transport_quotes_order'
        ) THEN
          ALTER TABLE transport_quotes
            ADD CONSTRAINT fk_transport_quotes_order
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
        END IF;

        -- Messages FK
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_sender'
        ) THEN
          ALTER TABLE messages
            ADD CONSTRAINT fk_messages_sender
            FOREIGN KEY (sender_id) REFERENCES employees(id);
        END IF;

        -- Notifications FK
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_user'
        ) THEN
          ALTER TABLE notifications
            ADD CONSTRAINT fk_notifications_user
            FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE;
        END IF;

        -- Audit Logs FK
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_logs_user'
        ) THEN
          ALTER TABLE audit_logs
            ADD CONSTRAINT fk_audit_logs_user
            FOREIGN KEY (user_id) REFERENCES employees(id);
        END IF;
      END $$;

      -- Now create indexes after all tables and constraints are in place
      CREATE INDEX IF NOT EXISTS idx_employees_data ON employees USING gin (data);
      CREATE INDEX IF NOT EXISTS idx_employees_agent_id ON employees ((data->>'agentId'));
      CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email ON employees ((data->>'email'));
      CREATE INDEX IF NOT EXISTS idx_employees_role ON employees ((data->>'role'));
      CREATE INDEX IF NOT EXISTS idx_employees_status ON employees ((data->>'status'));
      CREATE INDEX IF NOT EXISTS idx_employees_assigned_orders ON employees USING gin ((data->'assignedOrders'));

      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

      CREATE INDEX IF NOT EXISTS idx_customers_data ON customers USING gin (data);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email ON customers ((data->>'email'));
      CREATE INDEX IF NOT EXISTS idx_customers_name ON customers ((data->>'name'));
      CREATE INDEX IF NOT EXISTS idx_customers_company ON customers ((data->>'company'));

      CREATE INDEX IF NOT EXISTS idx_products_data ON products USING gin (data);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products ((data->>'category'));
      CREATE INDEX IF NOT EXISTS idx_products_name ON products ((data->>'name'));
      CREATE INDEX IF NOT EXISTS idx_products_price ON products ((data->>'price'));
      CREATE INDEX IF NOT EXISTS idx_products_inventory ON products USING gin((data->'inventory'));

      CREATE INDEX IF NOT EXISTS idx_orders_data ON orders USING gin (data);
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders ((data->>'status'));
      CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders ((data->>'paymentStatus'));
      CREATE INDEX IF NOT EXISTS idx_orders_total ON orders ((data->>'total'));
      CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders ((data->>'customerName'));
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders ((data->>'createdAt'));
      CREATE INDEX IF NOT EXISTS idx_orders_items ON orders USING gin((data->'items'));

      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

      CREATE INDEX IF NOT EXISTS idx_fulfillments_order ON fulfillments(order_id);
      CREATE INDEX IF NOT EXISTS idx_fulfillments_status ON fulfillments ((data->>'status'));
      CREATE INDEX IF NOT EXISTS idx_fulfillments_tracking ON fulfillments ((data->>'trackingNumber'));
      CREATE INDEX IF NOT EXISTS idx_fulfillments_carrier ON fulfillments ((data->>'carrier'));

      CREATE INDEX IF NOT EXISTS idx_transport_quotes_order ON transport_quotes(order_id);
      CREATE INDEX IF NOT EXISTS idx_transport_quotes_provider ON transport_quotes ((data->>'provider'));
      CREATE INDEX IF NOT EXISTS idx_transport_quotes_amount ON transport_quotes ((data->>'amount'));
      CREATE INDEX IF NOT EXISTS idx_transport_quotes_expires ON transport_quotes ((data->>'expiresAt'));

      CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_messages_content ON messages ((data->>'content'));
      CREATE INDEX IF NOT EXISTS idx_messages_read ON messages ((data->>'read'));

      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications ((data->>'type'));
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications ((data->>'read'));
      CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications ((data->>'createdAt'));

      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

      CREATE INDEX IF NOT EXISTS idx_transport_companies_data ON transport_companies USING gin (data);

      CREATE INDEX IF NOT EXISTS idx_transport_orders_data ON transport_orders USING gin (data);
      CREATE INDEX IF NOT EXISTS idx_transport_orders_order_id ON transport_orders ((data->>'orderId'));

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

      -- Insert test data
      
    `);

    // Insert test data
    const testData = {
      employees: [{
        id: 'ORACLEX',
        data: {
          id: 'ORACLEX',
          agentId: 'ORACLEX',
          passwordHash: 'SANY44X',
          name: 'Oraclex',
          email: 'oraclex@sanyglobal.org',
          role: 'admin',
          status: 'active',
          assignedOrders: [],
          businessInfo: {
            companyName: 'SANY',
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
            bankName: 'SANY',
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
      customers: [
        {
          id: 'CUST-1',
          name: "Robert Anderson",
          email: "r.anderson@constructioncorp.com",
          company: "Anderson Construction Corp",
          phone: "(555) 123-4567",
          address: {
            street: "789 Industrial Parkway",
            city: "Houston",
            state: "TX",
            country: "USA",
            postalCode: "77001"
          }
        },
        {
          id: 'CUST-2',
          name: "Sarah Martinez",
          email: "smartinez@buildpro.com",
          company: "BuildPro Solutions",
          phone: "(555) 234-5678",
          address: {
            street: "456 Commerce Drive",
            city: "Phoenix",
            state: "AZ",
            country: "USA",
            postalCode: "85001"
          }
        },
        {
          id: 'CUST-3',
          name: "David Wilson",
          email: "dwilson@wilsonbuilders.com",
          company: "Wilson Builders & Associates",
          phone: "(555) 345-6789",
          address: {
            street: "234 Construction Way",
            city: "Dallas",
            state: "TX",
            country: "USA",
            postalCode: "75201"
          }
        },
        {
          id: 'CUST-4',
          name: "Michael Chang",
          email: "mchang@pacificbuilders.com",
          company: "Pacific Builders Inc",
          phone: "(555) 987-6543",
          address: {
            street: "123 Harbor Boulevard",
            city: "San Francisco",
            state: "CA",
            country: "USA",
            postalCode: "94111"
          }
        },
        {
          id: 'CUST-5',
          name: "Emily Johnson",
          email: "ejohnson@midwestconstruction.com",
          company: "Midwest Construction Group",
          phone: "(555) 876-5432",
          address: {
            street: "567 Prairie Road",
            city: "Chicago",
            state: "IL",
            country: "USA",
            postalCode: "60601"
          }
        }
      ],
      products: [
        {
          id: "EX-001",
          category: "Excavators",
          name: "Compact Mini Excavator",
          model: "ME-2000",
          sku: "ME2000-001",
          price: 15000,
          status: "active",
          image: "/images/products/mini-excavator.jpg",
          specifications: {
            weight: 2000,
            power: 15,
            digDepth: 2.5,
            maxReach: 4.2,
            engineType: "Diesel",
            operatingWeight: "2000 kg",
            bucketCapacity: "0.08 m³"
          },
          inventory: [
            {
              productId: "EX-001",
              warehouseId: "wh-1",
              quantity: 5,
              minimumStock: 2,
              lastUpdated: new Date().toISOString()
            },
            {
              productId: "EX-001",
              warehouseId: "wh-2",
              quantity: 3,
              minimumStock: 1,
              lastUpdated: new Date().toISOString()
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "CR-001",
          category: "Cranes",
          name: "Heavy Duty Tower Crane",
          model: "TC-5000",
          sku: "TC5000-001",
          price: 180000,
          status: "active",
          image: "/images/products/tower-crane.jpg",
          specifications: {
            liftingCapacity: 5000,
            maxHeight: 80,
            boomLength: 60,
            engineType: "Electric",
            maxLoad: "5000 kg",
            towerHeight: "80 m",
            jibLength: "60 m"
          },
          inventory: [
            {
              productId: "CR-001",
              warehouseId: "wh-2",
              quantity: 2,
              minimumStock: 1,
              lastUpdated: new Date().toISOString()
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "CM-001",
          category: "Concrete Equipment",
          name: "Professional Concrete Mixer",
          model: "PCM-3000",
          sku: "PCM3000-001",
          price: 8500,
          status: "active",
          image: "/images/products/concrete-mixer.jpg",
          specifications: {
            capacity: 3,
            power: 7.5,
            drumSpeed: 24,
            engineType: "Electric",
            mixingCapacity: "3 m³",
            drumDiameter: "1.8 m",
            weight: "1200 kg"
          },
          inventory: [
            {
              productId: "CM-001",
              warehouseId: "wh-1",
              quantity: 8,
              minimumStock: 3,
              lastUpdated: new Date().toISOString()
            },
            {
              productId: "CM-001",
              warehouseId: "wh-3",
              quantity: 4,
              minimumStock: 2,
              lastUpdated: new Date().toISOString()
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
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
      }],
        transport_companies: [
          {
            id: "trans-1",
            name: "FastTrack Logistics",
            rating: 4.8,
            availableVehicles: ["small-truck", "medium-truck", "large-truck"],
            basePrice: 500,
            pricePerKm: 2.8,
            serviceAreas: ["New York", "Los Angeles", "Chicago"],
            insuranceCoverage: 100000,
            contactInfo: {
              phone: "1-800-555-0123",
              email: "contact@fasttrack.com"
            }
          },
          {
            id: "trans-2",
            name: "Heavy Haulers Co.",
            rating: 4.6,
            availableVehicles: ["medium-truck", "large-truck", "flatbed"],
            basePrice: 750,
            pricePerKm: 3.2,
            serviceAreas: ["Los Angeles", "San Francisco", "Seattle"],
            insuranceCoverage: 150000,
            contactInfo: {
              phone: "1-800-555-0124",
              email: "support@heavyhaulers.com"
            }
          },
          {
            id: "trans-3",
            name: "Reliable Transport",
            rating: 4.9,
            availableVehicles: ["small-truck", "medium-truck", "flatbed"],
            basePrice: 450,
            pricePerKm: 2.5,
            serviceAreas: ["Chicago", "Detroit", "Cleveland"],
            insuranceCoverage: 120000,
            contactInfo: {
              phone: "1-800-555-0125",
              email: "info@reliabletransport.com"
            }
          }
        ],
      transport_orders: [{
        id: 'TO-1',
        data: {
          id: 'TO-1',
          orderId: 'ORD-1',
          provider: 'FastTrack Logistics',
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }]
    };

    // Insert test data if not exists
    for (const [table, items] of Object.entries(testData)) {
      for (const item of items) {
        if (table === 'products' && 'sku' in item) {
          await client.query(
            `INSERT INTO ${table} (id, sku, status, data) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (id) DO NOTHING`,
            [item.id, item.sku, item.status, item]
          );
        } else {
          await client.query(
            `INSERT INTO ${table} (id, data) 
             VALUES ($1, $2) 
             ON CONFLICT (id) DO NOTHING`,
            [item.id, item]
          );
        }
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

// Add password verification endpoint
app.post('/api/auth/verify', async (req, res) => {
  const { password, hash } = req.body;
  
  try {
    const isValid = await verifyPassword(password, hash);
    res.json({ valid: isValid });
  } catch (error) {
    console.error('Password verification failed:', error);
    res.status(500).json({ error: 'Password verification failed' });
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
      console.log(`Database connected successfully`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch(console.error);