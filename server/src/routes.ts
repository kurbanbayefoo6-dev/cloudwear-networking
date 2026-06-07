import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { query } from "./db.js";
import type { Customer, Order, Product, WarehouseItem } from "./types.js";

export const api = Router();

const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(handler(req, res, next)).catch(next);

function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw Object.assign(new Error(`${field} is required`), { status: 400 });
  }
  return value.trim();
}

function requireNumber(value: unknown, field: string, min = 0) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < min) {
    throw Object.assign(new Error(`${field} must be a number greater than or equal to ${min}`), { status: 400 });
  }
  return numberValue;
}

function requireInteger(value: unknown, field: string, min = 0) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < min) {
    throw Object.assign(new Error(`${field} must be an integer greater than or equal to ${min}`), { status: 400 });
  }
  return numberValue;
}

api.get("/health", (_req, res) => {
  res.json({ status: "OK", service: "CloudWear Distribution API" });
});

api.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const [products, customers, orders, warehouseItems] = await Promise.all([
      query<{ count: string }>("SELECT COUNT(*) FROM products"),
      query<{ count: string }>("SELECT COUNT(*) FROM customers"),
      query<{ count: string }>("SELECT COUNT(*) FROM orders"),
      query<{ count: string }>("SELECT COUNT(*) FROM warehouse_items")
    ]);

    res.json({
      totalProducts: Number(products.rows[0].count),
      totalCustomers: Number(customers.rows[0].count),
      totalOrders: Number(orders.rows[0].count),
      totalWarehouseItems: Number(warehouseItems.rows[0].count),
      systemStatus: "Operational"
    });
  })
);

api.get(
  "/products",
  asyncHandler(async (_req, res) => {
    const result = await query<Product>("SELECT id, name, category, price, stock_quantity FROM products ORDER BY id DESC");
    res.json(result.rows);
  })
);

api.post(
  "/products",
  asyncHandler(async (req, res) => {
    const name = requireString(req.body.name, "name");
    const category = requireString(req.body.category, "category");
    const price = requireNumber(req.body.price, "price");
    const stockQuantity = requireInteger(req.body.stock_quantity, "stock_quantity");
    const result = await query<Product>(
      `INSERT INTO products (name, category, price, stock_quantity)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, category, price, stock_quantity`,
      [name, category, price, stockQuantity]
    );
    res.status(201).json(result.rows[0]);
  })
);

api.put(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const id = requireInteger(req.params.id, "id", 1);
    const name = requireString(req.body.name, "name");
    const category = requireString(req.body.category, "category");
    const price = requireNumber(req.body.price, "price");
    const stockQuantity = requireInteger(req.body.stock_quantity, "stock_quantity");
    const result = await query<Product>(
      `UPDATE products SET name = $1, category = $2, price = $3, stock_quantity = $4
       WHERE id = $5
       RETURNING id, name, category, price, stock_quantity`,
      [name, category, price, stockQuantity, id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Product not found" });
    res.json(result.rows[0]);
  })
);

api.delete(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const id = requireInteger(req.params.id, "id", 1);
    const result = await query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);
    if (!result.rows[0]) return res.status(404).json({ message: "Product not found" });
    res.status(204).send();
  })
);

api.get(
  "/customers",
  asyncHandler(async (_req, res) => {
    const result = await query<Customer>("SELECT id, full_name, email, phone, company FROM customers ORDER BY id DESC");
    res.json(result.rows);
  })
);

api.post(
  "/customers",
  asyncHandler(async (req, res) => {
    const fullName = requireString(req.body.full_name, "full_name");
    const email = requireString(req.body.email, "email");
    const phone = requireString(req.body.phone, "phone");
    const company = requireString(req.body.company, "company");
    const result = await query<Customer>(
      `INSERT INTO customers (full_name, email, phone, company)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, phone, company`,
      [fullName, email, phone, company]
    );
    res.status(201).json(result.rows[0]);
  })
);

api.put(
  "/customers/:id",
  asyncHandler(async (req, res) => {
    const id = requireInteger(req.params.id, "id", 1);
    const fullName = requireString(req.body.full_name, "full_name");
    const email = requireString(req.body.email, "email");
    const phone = requireString(req.body.phone, "phone");
    const company = requireString(req.body.company, "company");
    const result = await query<Customer>(
      `UPDATE customers SET full_name = $1, email = $2, phone = $3, company = $4
       WHERE id = $5
       RETURNING id, full_name, email, phone, company`,
      [fullName, email, phone, company, id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Customer not found" });
    res.json(result.rows[0]);
  })
);

api.delete(
  "/customers/:id",
  asyncHandler(async (req, res) => {
    const id = requireInteger(req.params.id, "id", 1);
    const result = await query("DELETE FROM customers WHERE id = $1 RETURNING id", [id]);
    if (!result.rows[0]) return res.status(404).json({ message: "Customer not found" });
    res.status(204).send();
  })
);

api.get(
  "/warehouse-items",
  asyncHandler(async (_req, res) => {
    const result = await query<WarehouseItem>(
      "SELECT id, item_name, location, quantity, status FROM warehouse_items ORDER BY id DESC"
    );
    res.json(result.rows);
  })
);

api.post(
  "/warehouse-items",
  asyncHandler(async (req, res) => {
    const itemName = requireString(req.body.item_name, "item_name");
    const location = requireString(req.body.location, "location");
    const quantity = requireInteger(req.body.quantity, "quantity");
    const status = requireString(req.body.status, "status");
    const result = await query<WarehouseItem>(
      `INSERT INTO warehouse_items (item_name, location, quantity, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, item_name, location, quantity, status`,
      [itemName, location, quantity, status]
    );
    res.status(201).json(result.rows[0]);
  })
);

api.put(
  "/warehouse-items/:id",
  asyncHandler(async (req, res) => {
    const id = requireInteger(req.params.id, "id", 1);
    const itemName = requireString(req.body.item_name, "item_name");
    const location = requireString(req.body.location, "location");
    const quantity = requireInteger(req.body.quantity, "quantity");
    const status = requireString(req.body.status, "status");
    const result = await query<WarehouseItem>(
      `UPDATE warehouse_items SET item_name = $1, location = $2, quantity = $3, status = $4
       WHERE id = $5
       RETURNING id, item_name, location, quantity, status`,
      [itemName, location, quantity, status, id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Warehouse item not found" });
    res.json(result.rows[0]);
  })
);

api.delete(
  "/warehouse-items/:id",
  asyncHandler(async (req, res) => {
    const id = requireInteger(req.params.id, "id", 1);
    const result = await query("DELETE FROM warehouse_items WHERE id = $1 RETURNING id", [id]);
    if (!result.rows[0]) return res.status(404).json({ message: "Warehouse item not found" });
    res.status(204).send();
  })
);

api.get(
  "/orders",
  asyncHandler(async (_req, res) => {
    const result = await query<Order>(
      `SELECT orders.id, orders.customer_id, orders.product_id, orders.quantity, orders.total_price,
              orders.status, orders.created_at, customers.full_name AS customer_name, products.name AS product_name
       FROM orders
       JOIN customers ON customers.id = orders.customer_id
       JOIN products ON products.id = orders.product_id
       ORDER BY orders.id DESC`
    );
    res.json(result.rows);
  })
);

api.post(
  "/orders",
  asyncHandler(async (req, res) => {
    const customerId = requireInteger(req.body.customer_id, "customer_id", 1);
    const productId = requireInteger(req.body.product_id, "product_id", 1);
    const quantity = requireInteger(req.body.quantity, "quantity", 1);
    const status = requireString(req.body.status, "status");
    const productResult = await query<{ price: string; stock_quantity: number }>(
      "SELECT price, stock_quantity FROM products WHERE id = $1",
      [productId]
    );
    if (!productResult.rows[0]) return res.status(404).json({ message: "Product not found" });

    const customerResult = await query("SELECT id FROM customers WHERE id = $1", [customerId]);
    if (!customerResult.rows[0]) return res.status(404).json({ message: "Customer not found" });

    const totalPrice = Number(productResult.rows[0].price) * quantity;
    const result = await query<Order>(
      `INSERT INTO orders (customer_id, product_id, quantity, total_price, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, customer_id, product_id, quantity, total_price, status, created_at`,
      [customerId, productId, quantity, totalPrice, status]
    );
    res.status(201).json(result.rows[0]);
  })
);
