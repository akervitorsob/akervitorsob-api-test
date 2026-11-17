CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    approved INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    price REAL NOT NULL DEFAULT 0,
    discountPrice REAL NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    image TEXT NOT NULL DEFAULT '',
    images TEXT NOT NULL DEFAULT '[]',
    weights TEXT NOT NULL DEFAULT '["250g","500g","750g","1kg"]',
    colors TEXT NOT NULL DEFAULT '[]',
    sellerId TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    featured INTEGER NOT NULL DEFAULT 0,
    rating REAL NOT NULL DEFAULT 0,
    reviews TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    image TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS carts (
    id TEXT PRIMARY KEY,
    customerId TEXT NOT NULL UNIQUE,
    totalAmount REAL NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id TEXT PRIMARY KEY,
    cartId TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    productId TEXT,
    name TEXT NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 1,
    price REAL NOT NULL DEFAULT 0,
    image TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    sellerId TEXT,
    total REAL NOT NULL DEFAULT 0,
    paymentStatus TEXT NOT NULL DEFAULT 'Pending',
    paymentMethod TEXT NOT NULL DEFAULT 'Cash',
    transactionId TEXT NOT NULL DEFAULT '',
    deliveryAddress TEXT NOT NULL DEFAULT '{}',
    riderId TEXT,
    deliveryStatus TEXT NOT NULL DEFAULT 'Waiting',
    status TEXT NOT NULL DEFAULT 'Pending',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    orderId TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    productId TEXT,
    name TEXT NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 1,
    price REAL NOT NULL DEFAULT 0,
    image TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    orderId TEXT NOT NULL,
    customerId TEXT NOT NULL,
    method TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    transactionId TEXT NOT NULL DEFAULT '',
    gatewayResponse TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'Pending',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sellers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    phone TEXT,
    shopName TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    approved INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    country TEXT NOT NULL DEFAULT 'BD',
    city TEXT NOT NULL DEFAULT '',
    address TEXT,
    location TEXT NOT NULL DEFAULT '{"type":"Point","coordinates":[90.4125,23.8103]}',
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS warehouse_inventory (
    id TEXT PRIMARY KEY,
    warehouseId TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    productId TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    reserved REAL NOT NULL DEFAULT 0,
    lowStockAlert REAL NOT NULL DEFAULT 10
  );

  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_products_status_created ON products(status, createdAt);
  CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customerId, createdAt);
  CREATE INDEX IF NOT EXISTS idx_orders_seller_status_created ON orders(sellerId, status, createdAt);
  CREATE INDEX IF NOT EXISTS idx_orders_rider_status_created ON orders(riderId, status, createdAt);
  CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(orderId);
  CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cartId);
  CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_wh ON warehouse_inventory(warehouseId);
