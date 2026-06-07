import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api";
import type { Customer, DashboardSummary, Order, Product, WarehouseItem } from "./types";

type Page = "dashboard" | "erp" | "crm" | "wms" | "orders" | "health";
type ProductForm = Omit<Product, "id">;
type CustomerForm = Omit<Customer, "id">;
type WarehouseForm = Omit<WarehouseItem, "id">;
type OrderForm = Pick<Order, "customer_id" | "product_id" | "quantity" | "status">;

interface SharedCrudProps {
  reload: () => Promise<void>;
  showMessage: (message: string) => void;
  setError: (message: string) => void;
}

type TableCell = string | number | ReactNode;

const blankProduct: ProductForm = { name: "", category: "", price: "0", stock_quantity: 0 };
const blankCustomer: CustomerForm = { full_name: "", email: "", phone: "", company: "" };
const blankWarehouse: WarehouseForm = { item_name: "", location: "", quantity: 0, status: "Available" };
const blankOrder: OrderForm = { customer_id: 0, product_id: 0, quantity: 1, status: "Confirmed" };

const navItems: { page: Page; label: string; icon: string }[] = [
  { page: "dashboard", label: "Dashboard", icon: "D" },
  { page: "erp", label: "ERP Products", icon: "E" },
  { page: "crm", label: "CRM Customers", icon: "C" },
  { page: "wms", label: "WMS Inventory", icon: "W" },
  { page: "orders", label: "Orders", icon: "O" },
  { page: "health", label: "System Health", icon: "H" }
];

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardData, productData, customerData, warehouseData, orderData] = await Promise.all([
        apiRequest<DashboardSummary>("/dashboard"),
        apiRequest<Product[]>("/products"),
        apiRequest<Customer[]>("/customers"),
        apiRequest<WarehouseItem[]>("/warehouse-items"),
        apiRequest<Order[]>("/orders")
      ]);
      setSummary(dashboardData);
      setProducts(productData);
      setCustomers(customerData);
      setWarehouseItems(warehouseData);
      setOrders(orderData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load cloud system data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const showMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2600);
  };

  const pageTitle = navItems.find((item) => item.page === page)?.label ?? "Dashboard";

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-brand">
          <span className="brand-mark">CW</span>
          <div>
            <strong>CloudWear</strong>
            <small>Distribution</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              className={page === item.page ? "active" : ""}
              key={item.page}
              onClick={() => setPage(item.page)}
              type="button"
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Cloud migration console</p>
            <h1>CloudWear Distribution</h1>
            <span>ERP, CRM and WMS Cloud Migration Dashboard</span>
          </div>
          <div className="topbar-status">
            <span className="status-dot" />
            {summary?.systemStatus ?? "Checking"}
          </div>
        </header>

        {message && <div className="toast success">{message}</div>}
        {error && <div className="toast error">{error}</div>}

        <main>
          <PageHeader title={pageTitle} description={pageDescription(page)} loading={loading} />
          {error && <StateBanner tone="error" title="Request failed" message={error} />}

          {page === "dashboard" && <Dashboard summary={summary} loading={loading} />}
          {page === "erp" && (
            <ProductsPage
              products={products}
              loading={loading}
              reload={loadAll}
              showMessage={showMessage}
              setError={setError}
            />
          )}
          {page === "crm" && (
            <CustomersPage
              customers={customers}
              loading={loading}
              reload={loadAll}
              showMessage={showMessage}
              setError={setError}
            />
          )}
          {page === "wms" && (
            <WarehousePage
              items={warehouseItems}
              loading={loading}
              reload={loadAll}
              showMessage={showMessage}
              setError={setError}
            />
          )}
          {page === "orders" && (
            <OrdersPage
              orders={orders}
              products={products}
              customers={customers}
              loading={loading}
              reload={loadAll}
              showMessage={showMessage}
              setError={setError}
            />
          )}
          {page === "health" && (
            <SystemHealth summary={summary} loading={loading} products={products} customers={customers} orders={orders} />
          )}
        </main>
      </div>
    </div>
  );
}

function pageDescription(page: Page) {
  const descriptions: Record<Page, string> = {
    dashboard: "Executive view of migrated ERP, CRM, WMS and cloud service readiness.",
    erp: "Manage the product catalogue, pricing and available stock across cloud-hosted ERP workflows.",
    crm: "Maintain customer contacts and account records for sales and support teams.",
    wms: "Track warehouse inventory, operational status and stock locations.",
    orders: "Create and monitor product orders connected to customer and inventory data.",
    health: "Review operational signals for API, database and deployment readiness."
  };
  return descriptions[page];
}

function PageHeader({ title, description, loading }: { title: string; description: string; loading: boolean }) {
  return (
    <section className="page-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <span className={loading ? "sync-badge loading" : "sync-badge"}>{loading ? "Syncing" : "Live data"}</span>
    </section>
  );
}

function Dashboard({ summary, loading }: { summary: DashboardSummary | null; loading: boolean }) {
  const cards = [
    { label: "Total Products", value: summary?.totalProducts ?? 0, icon: "ERP", tone: "primary" },
    { label: "Total Customers", value: summary?.totalCustomers ?? 0, icon: "CRM", tone: "success" },
    { label: "Total Orders", value: summary?.totalOrders ?? 0, icon: "ORD", tone: "warning" },
    { label: "Warehouse Items", value: summary?.totalWarehouseItems ?? 0, icon: "WMS", tone: "primary" },
    { label: "System Status", value: summary?.systemStatus ?? "Checking", icon: "API", tone: "success" }
  ];

  return (
    <div className="stack">
      <div className="stat-grid">
        {cards.map((card) => (
          <article className="stat-card" key={card.label}>
            <div className={`metric-icon ${card.tone}`}>{card.icon}</div>
            <span>{card.label}</span>
            <strong>{loading ? "..." : card.value}</strong>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <SectionHeader title="Cloud Network Overview" subtitle="Reference architecture for hosted business modules" />
          <div className="network-map">
            <div>
              <span>Users</span>
              <strong>Admin dashboard</strong>
            </div>
            <div>
              <span>API Layer</span>
              <strong>Express service</strong>
            </div>
            <div>
              <span>Data Store</span>
              <strong>Managed PostgreSQL</strong>
            </div>
            <div>
              <span>Modules</span>
              <strong>ERP, CRM, WMS, Orders</strong>
            </div>
          </div>
        </section>

        <section className="card">
          <SectionHeader title="AWS Deployment Readiness" subtitle="Operational checks for a production cloud rollout" />
          <ul className="checklist">
            <li><Badge tone="success">Ready</Badge> Managed database connection configured</li>
            <li><Badge tone="success">Ready</Badge> API reads from centralized data service</li>
            <li><Badge tone="warning">Review</Badge> Environment variables managed outside source</li>
            <li><Badge tone="success">Ready</Badge> Responsive dashboard interface available</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function ProductsPage(props: { products: Product[]; loading: boolean } & SharedCrudProps) {
  const [form, setForm] = useState<ProductForm>(blankProduct);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [validation, setValidation] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setValidation("");
    if (!form.name || !form.category || Number(form.price) < 0 || Number(form.stock_quantity) < 0) {
      setValidation("Enter a product name, category, valid price and non-negative stock quantity.");
      return;
    }
    try {
      await apiRequest(editingId ? `/products/${editingId}` : "/products", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setForm(blankProduct);
      setEditingId(null);
      await props.reload();
      props.showMessage(editingId ? "Product updated" : "Product added");
    } catch (err) {
      props.setError(err instanceof Error ? err.message : "Product save failed");
    }
  };

  return (
    <ModuleLayout
      title="Product Entry"
      description="Add or update product catalogue records without leaving the ERP workspace."
      actionLabel={editingId ? "Editing selected product" : "Ready to add product"}
      onRefresh={props.reload}
    >
      <FormPanel validation={validation}>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Product name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Classic Cotton T-Shirt" required />
          </Field>
          <Field label="Category">
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Menswear" required />
          </Field>
          <Field label="Price">
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" min="0" step="0.01" placeholder="0.00" required />
          </Field>
          <Field label="Stock quantity">
            <input value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })} type="number" min="0" placeholder="0" required />
          </Field>
          <div className="form-actions">
            <button type="submit">{editingId ? "Update Product" : "Add Product"}</button>
          </div>
        </form>
      </FormPanel>
      <DataTable
        columns={["Name", "Category", "Price", "Stock", "Actions"]}
        emptyText="No products have been added yet."
        loading={props.loading}
        rows={props.products.map((product) => [
          product.name,
          product.category,
          `GBP ${Number(product.price).toFixed(2)}`,
          product.stock_quantity,
          <RowActions
            key={product.id}
            onEdit={() => {
              setEditingId(product.id);
              setForm({ name: product.name, category: product.category, price: product.price, stock_quantity: product.stock_quantity });
            }}
            onDelete={async () => {
              await deleteRecord(`/products/${product.id}`, props.reload, props.showMessage, props.setError, "Product deleted");
            }}
          />
        ])}
      />
    </ModuleLayout>
  );
}

function CustomersPage(props: { customers: Customer[]; loading: boolean } & SharedCrudProps) {
  const [form, setForm] = useState<CustomerForm>(blankCustomer);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [validation, setValidation] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setValidation("");
    if (!form.full_name || !form.email.includes("@") || !form.phone || !form.company) {
      setValidation("Enter a full name, valid email address, phone number and company.");
      return;
    }
    try {
      await apiRequest(editingId ? `/customers/${editingId}` : "/customers", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setForm(blankCustomer);
      setEditingId(null);
      await props.reload();
      props.showMessage(editingId ? "Customer updated" : "Customer added");
    } catch (err) {
      props.setError(err instanceof Error ? err.message : "Customer save failed");
    }
  };

  return (
    <ModuleLayout
      title="Customer Entry"
      description="Maintain CRM records used by sales and order operations."
      actionLabel={editingId ? "Editing selected customer" : "Ready to add customer"}
      onRefresh={props.reload}
    >
      <FormPanel validation={validation}>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Full name">
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Sofia Karimova" required />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="name@company.com" required />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998 90 555 2211" required />
          </Field>
          <Field label="Company">
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Silk Route Stores" required />
          </Field>
          <div className="form-actions">
            <button type="submit">{editingId ? "Update Customer" : "Add Customer"}</button>
          </div>
        </form>
      </FormPanel>
      <DataTable
        columns={["Name", "Email", "Phone", "Company", "Actions"]}
        emptyText="No customers have been added yet."
        loading={props.loading}
        rows={props.customers.map((customer) => [
          customer.full_name,
          customer.email,
          customer.phone,
          customer.company,
          <RowActions
            key={customer.id}
            onEdit={() => {
              setEditingId(customer.id);
              setForm({
                full_name: customer.full_name,
                email: customer.email,
                phone: customer.phone,
                company: customer.company
              });
            }}
            onDelete={async () => {
              await deleteRecord(`/customers/${customer.id}`, props.reload, props.showMessage, props.setError, "Customer deleted");
            }}
          />
        ])}
      />
    </ModuleLayout>
  );
}

function WarehousePage(props: { items: WarehouseItem[]; loading: boolean } & SharedCrudProps) {
  const [form, setForm] = useState<WarehouseForm>(blankWarehouse);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [validation, setValidation] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setValidation("");
    if (!form.item_name || !form.location || Number(form.quantity) < 0 || !form.status) {
      setValidation("Enter an item name, location, valid quantity and operational status.");
      return;
    }
    try {
      await apiRequest(editingId ? `/warehouse-items/${editingId}` : "/warehouse-items", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setForm(blankWarehouse);
      setEditingId(null);
      await props.reload();
      props.showMessage(editingId ? "Warehouse item updated" : "Warehouse item added");
    } catch (err) {
      props.setError(err instanceof Error ? err.message : "Warehouse item save failed");
    }
  };

  return (
    <ModuleLayout
      title="Inventory Entry"
      description="Track warehouse stock levels and location status."
      actionLabel={editingId ? "Editing selected item" : "Ready to add item"}
      onRefresh={props.reload}
    >
      <FormPanel validation={validation}>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Item name">
            <input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} placeholder="T-Shirt Cartons" required />
          </Field>
          <Field label="Location">
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Zone A-01" required />
          </Field>
          <Field label="Quantity">
            <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} type="number" min="0" placeholder="0" required />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Available</option>
              <option>Reserved</option>
              <option>Quality Check</option>
              <option>Low Stock</option>
            </select>
          </Field>
          <div className="form-actions">
            <button type="submit">{editingId ? "Update Item" : "Add Item"}</button>
          </div>
        </form>
      </FormPanel>
      <DataTable
        columns={["Item", "Location", "Quantity", "Status", "Actions"]}
        emptyText="No warehouse inventory records found."
        loading={props.loading}
        rows={props.items.map((item) => [
          item.item_name,
          item.location,
          item.quantity,
          <StatusBadge key={`${item.id}-status`} status={item.status} />,
          <RowActions
            key={item.id}
            onEdit={() => {
              setEditingId(item.id);
              setForm({
                item_name: item.item_name,
                location: item.location,
                quantity: item.quantity,
                status: item.status
              });
            }}
            onDelete={async () => {
              await deleteRecord(`/warehouse-items/${item.id}`, props.reload, props.showMessage, props.setError, "Warehouse item deleted");
            }}
          />
        ])}
      />
    </ModuleLayout>
  );
}

function OrdersPage(props: { orders: Order[]; products: Product[]; customers: Customer[]; loading: boolean } & SharedCrudProps) {
  const [form, setForm] = useState<OrderForm>(blankOrder);
  const [validation, setValidation] = useState("");
  const selectedProduct = useMemo(
    () => props.products.find((product) => product.id === Number(form.product_id)),
    [form.product_id, props.products]
  );
  const total = selectedProduct ? Number(selectedProduct.price) * Number(form.quantity) : 0;

  useEffect(() => {
    if (props.customers[0] && form.customer_id === 0) {
      setForm((current) => ({ ...current, customer_id: props.customers[0].id }));
    }
    if (props.products[0] && form.product_id === 0) {
      setForm((current) => ({ ...current, product_id: props.products[0].id }));
    }
  }, [props.customers, props.products, form.customer_id, form.product_id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setValidation("");
    if (!form.customer_id || !form.product_id || Number(form.quantity) < 1) {
      setValidation("Select a customer, product and quantity greater than zero.");
      return;
    }
    try {
      await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setForm({ ...blankOrder, customer_id: props.customers[0]?.id ?? 0, product_id: props.products[0]?.id ?? 0 });
      await props.reload();
      props.showMessage("Order created");
    } catch (err) {
      props.setError(err instanceof Error ? err.message : "Order creation failed");
    }
  };

  return (
    <ModuleLayout
      title="Order Entry"
      description="Create orders using live CRM customers and ERP products."
      actionLabel={`Estimated total GBP ${total.toFixed(2)}`}
      onRefresh={props.reload}
    >
      <FormPanel validation={validation}>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Customer">
            <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: Number(e.target.value) })} required>
              {props.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name}</option>)}
            </select>
          </Field>
          <Field label="Product">
            <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: Number(e.target.value) })} required>
              {props.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </Field>
          <Field label="Quantity">
            <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} type="number" min="1" placeholder="1" required />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Confirmed</option>
              <option>Processing</option>
              <option>Dispatched</option>
              <option>Delivered</option>
            </select>
          </Field>
          <div className="form-actions">
            <button type="submit">Create Order</button>
          </div>
        </form>
      </FormPanel>
      <DataTable
        columns={["Customer", "Product", "Quantity", "Total", "Status"]}
        emptyText="No customer orders have been created yet."
        loading={props.loading}
        rows={props.orders.map((order) => [
          order.customer_name ?? order.customer_id,
          order.product_name ?? order.product_id,
          order.quantity,
          `GBP ${Number(order.total_price).toFixed(2)}`,
          <StatusBadge key={`${order.id}-status`} status={order.status} />
        ])}
      />
    </ModuleLayout>
  );
}

function SystemHealth({
  summary,
  loading,
  products,
  customers,
  orders
}: {
  summary: DashboardSummary | null;
  loading: boolean;
  products: Product[];
  customers: Customer[];
  orders: Order[];
}) {
  return (
    <div className="dashboard-grid">
      <section className="card">
        <SectionHeader title="Service Health" subtitle="Current operational indicators" />
        <div className="health-list">
          <HealthRow label="API availability" value={loading ? "Checking" : "Online"} tone="success" />
          <HealthRow label="Database status" value={summary?.systemStatus ?? "Checking"} tone="success" />
          <HealthRow label="Products dataset" value={`${products.length} records`} tone="primary" />
          <HealthRow label="Customers dataset" value={`${customers.length} records`} tone="primary" />
          <HealthRow label="Orders dataset" value={`${orders.length} records`} tone="warning" />
        </div>
      </section>
      <section className="card">
        <SectionHeader title="Infrastructure Notes" subtitle="Production-facing cloud dashboard signals" />
        <ul className="checklist">
          <li><Badge tone="success">Healthy</Badge> Dashboard can read all core modules</li>
          <li><Badge tone="success">Healthy</Badge> Tables and forms remain available during sync</li>
          <li><Badge tone="warning">Monitor</Badge> External database latency should be watched in production</li>
          <li><Badge tone="success">Healthy</Badge> UI supports desktop, tablet and mobile layouts</li>
        </ul>
      </section>
    </div>
  );
}

function ModuleLayout({
  title,
  description,
  actionLabel,
  onRefresh,
  children
}: {
  title: string;
  description: string;
  actionLabel: string;
  onRefresh: () => Promise<void>;
  children: ReactNode;
}) {
  return (
    <div className="stack">
      <section className="module-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="module-actions">
          <span>{actionLabel}</span>
          <button className="small secondary" onClick={() => void onRefresh()} type="button">Refresh Data</button>
        </div>
      </section>
      {children}
    </div>
  );
}

function FormPanel({ validation, children }: { validation: string; children: ReactNode }) {
  return (
    <section className="card">
      <SectionHeader title="Form Section" subtitle="Compact entry fields with validation before API submission" />
      {validation && <StateBanner tone="warning" title="Validation required" message={validation} />}
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="section-header">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function DataTable({
  columns,
  rows,
  loading,
  emptyText
}: {
  columns: string[];
  rows: TableCell[][];
  loading: boolean;
  emptyText: string;
}) {
  return (
    <section className="card table-card">
      <SectionHeader title="Data Table" subtitle="Live records from the cloud API" />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="empty-state" colSpan={columns.length}>Loading records...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="empty-state" colSpan={columns.length}>{emptyText}</td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => Promise<void> }) {
  return (
    <div className="row-actions">
      <button className="small secondary" onClick={onEdit} type="button">Edit</button>
      <button className="small danger" onClick={() => void onDelete()} type="button">Delete</button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes("low") || normalized.includes("quality") || normalized.includes("processing")
    ? "warning"
    : normalized.includes("reserved")
      ? "primary"
      : "success";
  return <Badge tone={tone}>{status}</Badge>;
}

function Badge({ tone, children }: { tone: "success" | "warning" | "danger" | "primary"; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function StateBanner({ tone, title, message }: { tone: "warning" | "error"; title: string; message: string }) {
  return (
    <div className={`state-banner ${tone}`}>
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}

function HealthRow({ label, value, tone }: { label: string; value: string; tone: "success" | "warning" | "primary" }) {
  return (
    <div className="health-row">
      <span>{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}

async function deleteRecord(
  endpoint: string,
  reload: () => Promise<void>,
  showMessage: (message: string) => void,
  setError: (message: string) => void,
  successMessage: string
) {
  try {
    await apiRequest(endpoint, { method: "DELETE" });
    await reload();
    showMessage(successMessage);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Delete failed");
  }
}

export default App;
