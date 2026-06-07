import pg from "pg";
import type { QueryResultRow } from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. API database routes will fail until it is configured.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined
});

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params);
}

async function tableIsEmpty(tableName: string) {
  const result = await query<{ count: string }>(`SELECT COUNT(*) FROM ${tableName}`);
  return Number(result.rows[0]?.count ?? 0) === 0;
}

export async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      category VARCHAR(120) NOT NULL,
      price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
      stock_quantity INTEGER NOT NULL CHECK (stock_quantity >= 0),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(160) NOT NULL,
      email VARCHAR(180) NOT NULL UNIQUE,
      phone VARCHAR(60) NOT NULL,
      company VARCHAR(160) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS warehouse_items (
      id SERIAL PRIMARY KEY,
      item_name VARCHAR(160) NOT NULL,
      location VARCHAR(120) NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity >= 0),
      status VARCHAR(80) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
      status VARCHAR(80) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  if (await tableIsEmpty("products")) {
    await query(
      `INSERT INTO products (name, category, price, stock_quantity)
       VALUES
       ('Classic Cotton T-Shirt', 'Menswear', 8.50, 620),
       ('Premium Hoodie', 'Outerwear', 24.99, 180),
       ('Slim Fit Chinos', 'Trousers', 18.75, 240),
       ('Corporate Polo Shirt', 'Workwear', 12.40, 410)`
    );
  }

  if (await tableIsEmpty("customers")) {
    await query(
      `INSERT INTO customers (full_name, email, phone, company)
       VALUES
       ('Amina Rahman', 'amina.rahman@example.com', '+44 20 5555 0147', 'Northline Retail'),
       ('Daniel Hughes', 'daniel.hughes@example.com', '+44 20 5555 0192', 'Metro Apparel Group'),
       ('Sofia Karimova', 'sofia.karimova@example.com', '+998 90 555 2211', 'Silk Route Stores')`
    );
  }

  if (await tableIsEmpty("warehouse_items")) {
    await query(
      `INSERT INTO warehouse_items (item_name, location, quantity, status)
       VALUES
       ('T-Shirt Cartons', 'Zone A-01', 320, 'Available'),
       ('Hoodie Pallets', 'Zone B-04', 74, 'Reserved'),
       ('Returns Inspection Batch', 'Zone R-02', 28, 'Quality Check')`
    );
  }

  if (await tableIsEmpty("orders")) {
    await query(
      `WITH ranked_customers AS (
         SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS row_number FROM customers
       ),
       ranked_products AS (
         SELECT id, price, ROW_NUMBER() OVER (ORDER BY id) AS row_number FROM products
       ),
       seed_orders AS (
         SELECT 1 AS row_number, 120 AS quantity, 'Processing' AS status
         UNION ALL SELECT 2, 40, 'Dispatched'
         UNION ALL SELECT 3, 60, 'Confirmed'
       )
       INSERT INTO orders (customer_id, product_id, quantity, total_price, status)
       SELECT
         ranked_customers.id,
         ranked_products.id,
         seed_orders.quantity,
         ranked_products.price * seed_orders.quantity,
         seed_orders.status
       FROM seed_orders
       JOIN ranked_customers ON ranked_customers.row_number = seed_orders.row_number
       JOIN ranked_products ON ranked_products.row_number = seed_orders.row_number`
    );
  }
}
