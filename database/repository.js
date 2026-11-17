const { client } = require("./db");
const { randomBytes } = require("node:crypto");

const makeId = () => randomBytes(12).toString("hex");
const now = () => new Date().toISOString();
const parseJson = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
};
const json = (value, fallback) => JSON.stringify(value === undefined ? fallback : value);
const bool = (value) => value === true || value === 1 || value === "1" || value === "true" || value === "on" ? 1 : 0;
const number = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const text = (value, fallback = "") => value === undefined || value === null ? fallback : String(value);

async function run(sql, args = [], executor = client) {
  const result = await executor.execute({ sql, args });
  return {
    changes: Number(result.rowsAffected || 0),
    lastInsertRowid: result.lastInsertRowid
  };
}

async function get(sql, args = [], executor = client) {
  const result = await executor.execute({ sql, args });
  return result.rows.length ? result.rows[0] : null;
}

async function all(sql, args = [], executor = client) {
  const result = await executor.execute({ sql, args });
  return result.rows;
}

async function transaction(fn) {
  const tx = await client.transaction("write");
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (error) {
    try { await tx.rollback(); } catch (_) {}
    throw error;
  }
}

function mapUser(row, includePassword = true) {
  if (!row) return null;
  const result = {
    _id: row.id, id: row.id, name: row.name, email: row.email,
    role: row.role, approved: !!row.approved,
    createdAt: row.createdAt, updatedAt: row.updatedAt
  };
  if (includePassword) result.password = row.password;
  return result;
}

function mapProduct(row) {
  if (!row) return null;
  return {
    _id: row.id, id: row.id, name: row.name, description: row.description,
    category: row.category, price: row.price, discountPrice: row.discountPrice,
    stock: row.stock, image: row.image, images: parseJson(row.images, []),
    weights: parseJson(row.weights, ["250g", "500g", "750g", "1kg"]),
    colors: parseJson(row.colors, []), sellerId: row.sellerId,
    status: row.status, featured: !!row.featured, rating: row.rating,
    reviews: parseJson(row.reviews, []), createdAt: row.createdAt, updatedAt: row.updatedAt
  };
}

function mapCategory(row) {
  if (!row) return null;
  return {
    _id: row.id, id: row.id, name: row.name, image: row.image,
    description: row.description, active: !!row.active,
    createdAt: row.createdAt, updatedAt: row.updatedAt
  };
}

async function mapCart(row, populate = false, executor = client) {
  if (!row) return null;
  const items = await all(
    "SELECT * FROM cart_items WHERE cartId = ? ORDER BY rowid ASC",
    [row.id], executor
  );
  const mappedItems = [];
  for (const item of items) {
    const product = populate && item.productId
      ? mapProduct(await get("SELECT * FROM products WHERE id = ?", [item.productId], executor))
      : null;
    mappedItems.push({
      _id: item.id,
      productId: product || item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      image: item.image
    });
  }
  return {
    _id: row.id, id: row.id, customerId: row.customerId,
    items: mappedItems, totalAmount: row.totalAmount,
    createdAt: row.createdAt, updatedAt: row.updatedAt
  };
}

async function mapOrder(row, populate = false, executor = client) {
  if (!row) return null;
  const items = await all(
    "SELECT * FROM order_items WHERE orderId = ? ORDER BY rowid ASC",
    [row.id], executor
  );
  const result = {
    _id: row.id, id: row.id, customerId: row.customerId, sellerId: row.sellerId,
    items: items.map((item) => ({
      _id: item.id, productId: item.productId, name: item.name,
      quantity: item.quantity, price: item.price, image: item.image
    })),
    total: row.total, paymentStatus: row.paymentStatus,
    paymentMethod: row.paymentMethod, transactionId: row.transactionId,
    deliveryAddress: parseJson(row.deliveryAddress, {}),
    riderId: row.riderId, deliveryStatus: row.deliveryStatus,
    status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt
  };
  if (populate) {
    const customerRow = row.customerId
      ? await get("SELECT * FROM users WHERE id = ?", [row.customerId], executor)
      : null;
    const sellerRow = row.sellerId
      ? await get("SELECT * FROM users WHERE id = ?", [row.sellerId], executor)
      : null;
    const riderRow = row.riderId
      ? await get("SELECT * FROM users WHERE id = ?", [row.riderId], executor)
      : null;
    const customer = mapUser(customerRow, false);
    const seller = mapUser(sellerRow, false);
    const rider = mapUser(riderRow, false);
    result.customerId = customer ? { _id: customer._id, name: customer.name, email: customer.email } : null;
    result.sellerId = seller ? { _id: seller._id, name: seller.name, email: seller.email } : null;
    result.riderId = rider ? { _id: rider._id, name: rider.name, email: rider.email } : null;
  }
  return result;
}

function mapPayment(row) {
  if (!row) return null;
  return {
    _id: row.id, id: row.id, orderId: row.orderId, customerId: row.customerId,
    method: row.method, amount: row.amount, transactionId: row.transactionId,
    gatewayResponse: parseJson(row.gatewayResponse, {}),
    status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt
  };
}

function mapSeller(row) {
  if (!row) return null;
  return {
    _id: row.id, id: row.id, name: row.name, email: row.email,
    phone: row.phone, shopName: row.shopName, address: row.address,
    status: row.status, approved: !!row.approved,
    createdAt: row.createdAt, updatedAt: row.updatedAt
  };
}

async function mapWarehouse(row, executor = client) {
  if (!row) return null;
  const inventory = await all(
    "SELECT * FROM warehouse_inventory WHERE warehouseId = ? ORDER BY rowid ASC",
    [row.id], executor
  );
  return {
    _id: row.id, id: row.id, name: row.name, code: row.code,
    country: row.country, city: row.city, address: row.address,
    location: parseJson(row.location, { type: "Point", coordinates: [90.4125, 23.8103] }),
    inventory: inventory.map((item) => ({
      _id: item.id, productId: item.productId, quantity: item.quantity,
      reserved: item.reserved, lowStockAlert: item.lowStockAlert
    })),
    active: !!row.active,
    createdAt: row.createdAt, updatedAt: row.updatedAt
  };
}

// USERS
async function findUserByEmail(email, executor = client) {
  // Login needs the password hash for bcrypt.compare().
  return mapUser(await get(
    "SELECT * FROM users WHERE email = ? COLLATE NOCASE LIMIT 1",
    [text(email).trim()], executor
  ), true);
}

async function findUserById(id, executor = client) {
  // ID-based lookups must never expose the password hash.
  return mapUser(
    await get("SELECT * FROM users WHERE id = ?", [text(id)], executor),
    false
  );
}

async function createUser(data, executor = client) {
  const id = makeId();
  const timestamp = now();
  const role = text(data.role, "customer").trim().toLowerCase();
  const email = text(data.email).trim().toLowerCase();

  const create = async (tx) => {
    // Sellers must remain unapproved until an administrator approves them.
    const approved = role === "seller" ? 0 : bool(data.approved);

    await run(
      `INSERT INTO users
       (id,name,email,password,role,approved,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        id,
        text(data.name).trim(),
        email,
        text(data.password),
        role,
        approved,
        timestamp,
        timestamp
      ],
      tx
    );

    // Keep the seller profile and user account linked by the same ID.
    // Both inserts are part of one transaction, so partial registration
    // cannot leave an orphaned user or seller record.
    if (role === "seller") {
      await run(
        `INSERT INTO sellers
         (id,name,email,phone,shopName,address,status,approved,createdAt,updatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          text(data.name).trim(),
          email,
          text(data.phone).trim() || null,
          text(data.shopName).trim() || null,
          text(data.address).trim() || null,
          "Pending",
          0,
          timestamp,
          timestamp
        ],
        tx
      );
    }

    return findUserById(id, tx);
  };

  // Reuse an existing transaction when this function is called from one.
  if (executor !== client) {
    return create(executor);
  }

  return transaction(create);
}

async function updateAdminUser(email, password) {
  return transaction(async (tx) => {
    const existing = await findUserByEmail(email, tx);
    if (existing) {
      await run(
        "UPDATE users SET password=?, role='admin', approved=1, updatedAt=? WHERE id=?",
        [password, now(), existing._id], tx
      );
      return findUserById(existing._id, tx);
    }
    return createUser({
      name: "Administrator", email, password, role: "admin", approved: true
    }, tx);
  });
}

async function listUsers() {
  return (await all("SELECT * FROM users ORDER BY createdAt DESC"))
    .map((row) => mapUser(row, false));
}

async function countUsers() {
  const row = await get("SELECT COUNT(*) AS count FROM users");
  return Number(row?.count || 0);
}

// PRODUCTS
async function getProduct(id, executor = client) {
  return mapProduct(await get("SELECT * FROM products WHERE id = ?", [text(id)], executor));
}

async function listProducts() {
  return (await all("SELECT * FROM products ORDER BY createdAt DESC")).map(mapProduct);
}

async function countProducts() {
  const row = await get("SELECT COUNT(*) AS count FROM products");
  return Number(row?.count || 0);
}

async function createProduct(data) {
  const id = makeId(), timestamp = now();
  await run(
    `INSERT INTO products
     (id,name,description,category,price,discountPrice,stock,image,images,weights,colors,sellerId,status,featured,rating,reviews,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, text(data.name), text(data.description), text(data.category),
      number(data.price), number(data.discountPrice), number(data.stock),
      text(data.image), json(data.images, []), json(data.weights, ["250g", "500g", "750g", "1kg"]),
      json(data.colors, []), data.sellerId ? text(data.sellerId) : null,
      text(data.status, "active"), bool(data.featured), number(data.rating),
      json(data.reviews, []), timestamp, timestamp
    ]
  );
  return getProduct(id);
}

async function updateProduct(id, data) {
  const current = await getProduct(id);
  if (!current) return null;
  const allowed = [
    "name", "description", "category", "price", "discountPrice", "stock",
    "image", "images", "weights", "colors", "sellerId", "status",
    "featured", "rating", "reviews"
  ];
  const next = { ...current };
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(data, key)) next[key] = data[key];
  }
  await run(
    `UPDATE products SET name=?,description=?,category=?,price=?,discountPrice=?,stock=?,image=?,images=?,weights=?,colors=?,sellerId=?,status=?,featured=?,rating=?,reviews=?,updatedAt=? WHERE id=?`,
    [
      text(next.name), text(next.description), text(next.category), number(next.price),
      number(next.discountPrice), number(next.stock), text(next.image),
      json(next.images, []), json(next.weights, []), json(next.colors, []),
      next.sellerId ? text(next.sellerId) : null, text(next.status, "active"),
      bool(next.featured), number(next.rating), json(next.reviews, []), now(), text(id)
    ]
  );
  return getProduct(id);
}

async function deleteProduct(id) {
  const result = await run("DELETE FROM products WHERE id = ?", [text(id)]);
  return result.changes > 0;
}

// CATEGORIES
async function listCategories() {
  return (await all("SELECT * FROM categories ORDER BY createdAt DESC")).map(mapCategory);
}

async function createCategory(data) {
  const id = makeId(), timestamp = now();
  await run(
    "INSERT INTO categories (id,name,image,description,active,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)",
    [
      id, text(data.name).trim(), text(data.image), text(data.description),
      data.active === undefined ? 1 : bool(data.active), timestamp, timestamp
    ]
  );
  return mapCategory(await get("SELECT * FROM categories WHERE id = ?", [id]));
}

async function deleteCategory(id) {
  const result = await run("DELETE FROM categories WHERE id = ?", [text(id)]);
  return result.changes > 0;
}

// CARTS
async function getCart(customerId, populate = false) {
  const row = await get("SELECT * FROM carts WHERE customerId = ? LIMIT 1", [text(customerId)]);
  return mapCart(row, populate);
}

async function recalculateCart(cartId, executor) {
  const row = await get(
    "SELECT COALESCE(SUM(price * quantity),0) AS total FROM cart_items WHERE cartId = ?",
    [cartId], executor
  );
  await run(
    "UPDATE carts SET totalAmount=?, updatedAt=? WHERE id=?",
    [number(row?.total), now(), cartId], executor
  );
}

async function addCartItem({ customerId, productId, quantity = 1 }) {
  return transaction(async (tx) => {
    const product = await getProduct(productId, tx);
    if (!product) return { error: "Product not found", status: 404 };
    const qty = Math.max(1, Math.floor(number(quantity, 1)));
    let cart = await get(
      "SELECT * FROM carts WHERE customerId = ? LIMIT 1",
      [text(customerId)], tx
    );
    const timestamp = now();
    if (!cart) {
      const cartId = makeId();
      await run(
        "INSERT INTO carts (id,customerId,totalAmount,createdAt,updatedAt) VALUES (?,?,?,?,?)",
        [cartId, text(customerId), 0, timestamp, timestamp], tx
      );
      cart = await get("SELECT * FROM carts WHERE id = ?", [cartId], tx);
    }
    const existing = await get(
      "SELECT * FROM cart_items WHERE cartId=? AND productId=? LIMIT 1",
      [cart.id, text(productId)], tx
    );
    if (existing) {
      await run(
        "UPDATE cart_items SET quantity=? WHERE id=?",
        [existing.quantity + qty, existing.id], tx
      );
    } else {
      await run(
        "INSERT INTO cart_items (id,cartId,productId,name,quantity,price,image) VALUES (?,?,?,?,?,?,?)",
        [makeId(), cart.id, text(productId), product.name, qty, product.price, product.image], tx
      );
    }
    await recalculateCart(cart.id, tx);
    return mapCart(await get("SELECT * FROM carts WHERE id=?", [cart.id], tx), true, tx);
  });
}

async function updateCartItem(customerId, itemId, quantity) {
  return transaction(async (tx) => {
    const cart = await get("SELECT * FROM carts WHERE customerId=? LIMIT 1", [text(customerId)], tx);
    if (!cart) return { error: "Cart not found", status: 404 };
    const item = await get(
      "SELECT * FROM cart_items WHERE id=? AND cartId=?",
      [text(itemId), cart.id], tx
    );
    if (!item) return { error: "Item not found", status: 404 };
    const qty = Math.floor(number(quantity, 0));
    if (qty < 1) return { error: "Quantity must be at least 1", status: 400 };
    await run("UPDATE cart_items SET quantity=? WHERE id=?", [qty, item.id], tx);
    await recalculateCart(cart.id, tx);
    return mapCart(await get("SELECT * FROM carts WHERE id=?", [cart.id], tx), true, tx);
  });
}

async function removeCartItem(customerId, itemId) {
  return transaction(async (tx) => {
    const cart = await get("SELECT * FROM carts WHERE customerId=? LIMIT 1", [text(customerId)], tx);
    if (!cart) return { error: "Cart not found", status: 404 };
    await run("DELETE FROM cart_items WHERE id=? AND cartId=?", [text(itemId), cart.id], tx);
    await recalculateCart(cart.id, tx);
    return mapCart(await get("SELECT * FROM carts WHERE id=?", [cart.id], tx), true, tx);
  });
}

async function clearCart(customerId) {
  return transaction(async (tx) => {
    const cart = await get("SELECT * FROM carts WHERE customerId=? LIMIT 1", [text(customerId)], tx);
    if (cart) {
      await run("DELETE FROM cart_items WHERE cartId=?", [cart.id], tx);
      await run(
        "UPDATE carts SET totalAmount=0, updatedAt=? WHERE id=?",
        [now(), cart.id], tx
      );
    }
    return true;
  });
}

// ORDERS
async function insertOrder(data, executor) {
  const id = makeId(), timestamp = now();
  const items = Array.isArray(data.items) ? data.items : [];
  await run(
    `INSERT INTO orders
     (id,customerId,sellerId,total,paymentStatus,paymentMethod,transactionId,deliveryAddress,riderId,deliveryStatus,status,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, data.customerId ? text(data.customerId) : null,
      data.sellerId ? text(data.sellerId) : null, number(data.total),
      text(data.paymentStatus, "Pending"), text(data.paymentMethod, "Cash"),
      text(data.transactionId), json(data.deliveryAddress, {}),
      data.riderId ? text(data.riderId) : null, text(data.deliveryStatus, "Waiting"),
      text(data.status, "Pending"), timestamp, timestamp
    ],
    executor
  );
  for (const item of items) {
    const productId = item.productId && typeof item.productId === "object"
      ? (item.productId._id || item.productId.id || null)
      : (item.productId ? text(item.productId) : null);
    await run(
      "INSERT INTO order_items (id,orderId,productId,name,quantity,price,image) VALUES (?,?,?,?,?,?,?)",
      [
        makeId(), id, productId, text(item.name),
        Math.max(1, Math.floor(number(item.quantity, 1))),
        number(item.price), text(item.image)
      ],
      executor
    );
  }
  return id;
}

async function createOrder(data) {
  const id = await transaction((tx) => insertOrder(data, tx));
  return getOrder(id);
}

async function createOrderFromCart(data = {}) {
  const customerId = text(data.customerId).trim();

  if (!customerId) {
    throw new Error("Customer ID is required.");
  }

  const paymentMethod = text(data.paymentMethod, "Cash").trim() || "Cash";
  const result = await transaction(async (tx) => {
    const cart = await get(
      "SELECT * FROM carts WHERE customerId=? LIMIT 1",
      [customerId],
      tx
    );

    if (!cart) return null;

    const items = await all(
      "SELECT * FROM cart_items WHERE cartId=? ORDER BY rowid ASC",
      [cart.id],
      tx
    );

    if (!items.length) return null;

    const orderItems = items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      image: item.image
    }));

    // Recalculate the order total from the stored cart line items.
    const total = items.reduce((sum, item) => {
      const quantity = Math.max(1, Math.floor(number(item.quantity, 1)));
      const price = number(item.price, 0);
      return sum + (price * quantity);
    }, 0);

    if (!Number.isFinite(total) || total <= 0) {
      throw new Error("Cart total is invalid.");
    }

    const id = await insertOrder({
      customerId,
      sellerId: data.sellerId || null,
      items: orderItems,
      total,
      paymentStatus: "Pending",
      paymentMethod,
      deliveryAddress: data.deliveryAddress,
      status: "Pending"
    }, tx);

    // Clear the cart only after the order and all order items are inserted.
    await run(
      "DELETE FROM cart_items WHERE cartId=?",
      [cart.id],
      tx
    );

    await run(
      "UPDATE carts SET totalAmount=0, updatedAt=? WHERE id=?",
      [now(), cart.id],
      tx
    );

    return id;
  });

  return result ? getOrder(result) : null;
}

async function getOrder(id, populate = false, executor = client) {
  return mapOrder(await get("SELECT * FROM orders WHERE id=?", [text(id)], executor), populate, executor);
}

async function listOrders({ field, value, populate = false } = {}) {
  const allowed = { customerId: "customerId", sellerId: "sellerId", riderId: "riderId" };
  let rows;
  if (field && allowed[field]) {
    rows = await all(
      `SELECT * FROM orders WHERE ${allowed[field]}=? ORDER BY createdAt DESC`,
      [text(value)]
    );
  } else {
    rows = await all("SELECT * FROM orders ORDER BY createdAt DESC");
  }
  return Promise.all(rows.map((row) => mapOrder(row, populate)));
}

async function updateOrder(id, updates) {
  return transaction(async (tx) => {
    const current = await getOrder(id, false, tx);
    if (!current) return null;
    const allowed = ["sellerId", "riderId", "status", "deliveryStatus", "paymentStatus", "paymentMethod", "transactionId"];
    const next = { ...current };
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) next[key] = updates[key];
    }
    await run(
      `UPDATE orders SET sellerId=?,riderId=?,status=?,deliveryStatus=?,paymentStatus=?,paymentMethod=?,transactionId=?,updatedAt=? WHERE id=?`,
      [
        next.sellerId || null, next.riderId || null, text(next.status, "Pending"),
        text(next.deliveryStatus, "Waiting"), text(next.paymentStatus, "Pending"),
        text(next.paymentMethod, "Cash"), text(next.transactionId), now(), text(id)
      ],
      tx
    );
    return getOrder(id, false, tx);
  });
}

async function countOrders() {
  const row = await get("SELECT COUNT(*) AS count FROM orders");
  return Number(row?.count || 0);
}

async function totalPaidSales() {
  const row = await get("SELECT COALESCE(SUM(total),0) AS total FROM orders WHERE paymentStatus='Paid'");
  return number(row?.total);
}

// PAYMENTS
async function createPayment(data = {}) {
  const orderId = text(data.orderId).trim();
  const customerId = text(data.customerId).trim();
  const method = text(data.method).trim().toLowerCase();
  const amount = Number(data.amount);

  const supportedMethods = ["bkash", "nagad", "rocket", "upay"];

  if (!orderId || !customerId) {
    throw new Error("Order ID and Customer ID are required.");
  }

  if (!supportedMethods.includes(method)) {
    throw new Error("Unsupported payment method.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid payment amount.");
  }

  return transaction(async (tx) => {
    const order = await getOrder(orderId, false, tx);

    if (!order) {
      throw new Error("Order not found.");
    }

    if (String(order.customerId) !== customerId) {
      throw new Error("Payment customer does not match order owner.");
    }

    if (order.paymentStatus === "Paid") {
      throw new Error("This order has already been paid.");
    }

    if (["cancelled", "canceled"].includes(String(order.status || "").toLowerCase())) {
      throw new Error("Payment cannot be created for a cancelled order.");
    }

    const orderAmount = Number(order.total);

    if (
      !Number.isFinite(orderAmount) ||
      Math.round(amount * 100) !== Math.round(orderAmount * 100)
    ) {
      throw new Error("Payment amount does not match order total.");
    }

    // Do not create another pending payment for the same order and method.
    const existingPending = await get(
      `SELECT * FROM payments
       WHERE orderId=? AND method=? AND status='Pending'
       ORDER BY createdAt DESC LIMIT 1`,
      [orderId, method],
      tx
    );

    if (existingPending) {
      throw new Error("A pending payment already exists for this order and payment method.");
    }

    const id = makeId();
    const timestamp = now();

    await run(
      `INSERT INTO payments
       (id,orderId,customerId,method,amount,transactionId,gatewayResponse,status,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        orderId,
        customerId,
        method,
        amount,
        text(data.transactionId),
        json(data.gatewayResponse, {}),
        "Pending",
        timestamp,
        timestamp
      ],
      tx
    );

    await run(
      "UPDATE orders SET paymentMethod=?,updatedAt=? WHERE id=?",
      [method, timestamp, orderId],
      tx
    );

    return mapPayment(
      await get("SELECT * FROM payments WHERE id=?", [id], tx)
    );
  });
}

async function getPayment(id) {
  return mapPayment(await get("SELECT * FROM payments WHERE id=?", [text(id)]));
}

async function updatePayment(id, updates = {}) {
  return transaction(async (tx) => {
    const row = await get(
      "SELECT * FROM payments WHERE id=?",
      [text(id)],
      tx
    );

    if (!row) return null;

    const current = mapPayment(row);

    const requestedStatus = Object.prototype.hasOwnProperty.call(updates, "status")
      ? text(updates.status).trim().toLowerCase()
      : String(current.status || "Pending").toLowerCase();

    const statusMap = {
      pending: "Pending",
      success: "Success",
      failed: "Failed"
    };

    const status = statusMap[requestedStatus];

    if (!status) {
      throw new Error("Invalid payment status.");
    }

    // Once successful, a payment cannot be downgraded or overwritten.
    if (current.status === "Success" && status !== "Success") {
      return current;
    }

    const transactionId = Object.prototype.hasOwnProperty.call(updates, "transactionId")
      ? text(updates.transactionId)
      : current.transactionId;

    if (status === "Success" && !transactionId.trim()) {
      throw new Error("A verified transaction ID is required for successful payment.");
    }

    const gatewayResponse = Object.prototype.hasOwnProperty.call(updates, "gatewayResponse")
      ? json(updates.gatewayResponse, {})
      : json(current.gatewayResponse, {});

    await run(
      `UPDATE payments
       SET transactionId=?,gatewayResponse=?,status=?,updatedAt=?
       WHERE id=?`,
      [transactionId, gatewayResponse, status, now(), text(id)],
      tx
    );

    return mapPayment(
      await get("SELECT * FROM payments WHERE id=?", [text(id)], tx)
    );
  });
}

async function listPayments() {
  return (await all("SELECT * FROM payments ORDER BY createdAt DESC")).map(mapPayment);
}

// SELLERS
async function listSellers() {
  return (await all("SELECT * FROM sellers ORDER BY createdAt DESC")).map(mapSeller);
}

async function approveSeller(id) {
  return transaction(async (tx) => {
    const sellerId = text(id).trim();
    const seller = await get(
      "SELECT * FROM sellers WHERE id=?",
      [sellerId],
      tx
    );

    if (!seller) return null;

    const timestamp = now();

    // Update seller profile and linked login account together.
    await run(
      `UPDATE sellers
       SET status='Approved',approved=1,updatedAt=?
       WHERE id=?`,
      [timestamp, sellerId],
      tx
    );

    await run(
      `UPDATE users
       SET approved=1,updatedAt=?
       WHERE id=? AND role='seller'`,
      [timestamp, sellerId],
      tx
    );

    return mapSeller(
      await get("SELECT * FROM sellers WHERE id=?", [sellerId], tx)
    );
  });
}

async function deleteSeller(id) {
  return transaction(async (tx) => {
    const sellerId = text(id).trim();
    const result = await run(
      "DELETE FROM sellers WHERE id=?",
      [sellerId],
      tx
    );

    if (result.changes > 0) {
      // Revoke seller login access without deleting the user account.
      await run(
        `UPDATE users
         SET approved=0,updatedAt=?
         WHERE id=? AND role='seller'`,
        [now(), sellerId],
        tx
      );
    }

    return result.changes > 0;
  });
}

// WAREHOUSES
async function listWarehouses() {
  const rows = await all("SELECT * FROM warehouses WHERE active=1 ORDER BY createdAt DESC");
  return Promise.all(rows.map((row) => mapWarehouse(row)));
}

async function createWarehouse(data) {
  return transaction(async (tx) => {
    const id = makeId(), timestamp = now();
    await run(
      `INSERT INTO warehouses (id,name,code,country,city,address,location,active,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        id, text(data.name), text(data.code), text(data.country, "BD"),
        text(data.city), text(data.address),
        json(data.location, { type: "Point", coordinates: [90.4125, 23.8103] }),
        data.active === undefined ? 1 : bool(data.active), timestamp, timestamp
      ],
      tx
    );
    for (const item of (Array.isArray(data.inventory) ? data.inventory : [])) {
      await run(
        "INSERT INTO warehouse_inventory (id,warehouseId,productId,quantity,reserved,lowStockAlert) VALUES (?,?,?,?,?,?)",
        [
          makeId(), id, text(item.productId), number(item.quantity),
          number(item.reserved), number(item.lowStockAlert, 10)
        ],
        tx
      );
    }
    return mapWarehouse(await get("SELECT * FROM warehouses WHERE id=?", [id], tx), tx);
  });
}

async function updateWarehouseInventory(id, productId, quantity) {
  return transaction(async (tx) => {
    const warehouse = await get("SELECT * FROM warehouses WHERE id=?", [text(id)], tx);
    if (!warehouse) return null;
    const existing = await get(
      "SELECT * FROM warehouse_inventory WHERE warehouseId=? AND productId=? LIMIT 1",
      [warehouse.id, text(productId)], tx
    );
    if (existing) {
      await run("UPDATE warehouse_inventory SET quantity=? WHERE id=?", [number(quantity), existing.id], tx);
    } else {
      await run(
        "INSERT INTO warehouse_inventory (id,warehouseId,productId,quantity,reserved,lowStockAlert) VALUES (?,?,?,?,?,?)",
        [makeId(), warehouse.id, text(productId), number(quantity), 0, 10], tx
      );
    }
    await run("UPDATE warehouses SET updatedAt=? WHERE id=?", [now(), warehouse.id], tx);
    return mapWarehouse(await get("SELECT * FROM warehouses WHERE id=?", [warehouse.id], tx), tx);
  });
}

module.exports = {
  makeId, transaction,
  findUserByEmail, findUserById, createUser, updateAdminUser, listUsers, countUsers,
  getProduct, listProducts, countProducts, createProduct, updateProduct, deleteProduct,
  listCategories, createCategory, deleteCategory,
  getCart, addCartItem, updateCartItem, removeCartItem, clearCart,
  createOrder, createOrderFromCart, getOrder, listOrders, updateOrder, countOrders, totalPaidSales,
  createPayment, getPayment, updatePayment, listPayments,
  listSellers, approveSeller, deleteSeller,
  listWarehouses, createWarehouse, updateWarehouseInventory
};
