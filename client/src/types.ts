export interface Product {
  id: number;
  name: string;
  category: string;
  price: string;
  stock_quantity: number;
}

export interface Customer {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  company: string;
}

export interface WarehouseItem {
  id: number;
  item_name: string;
  location: string;
  quantity: number;
  status: string;
}

export interface Order {
  id: number;
  customer_id: number;
  product_id: number;
  quantity: number;
  total_price: string;
  status: string;
  customer_name?: string;
  product_name?: string;
  created_at?: string;
}

export interface DashboardSummary {
  totalProducts: number;
  totalCustomers: number;
  totalOrders: number;
  totalWarehouseItems: number;
  systemStatus: string;
}
