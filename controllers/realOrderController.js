
const repo = require("../database/repository");

// ======================================
// COMMON HELPERS
// ======================================

function getBody(req) {
  return req.body && typeof req.body === "object"
    ? req.body
    : {};
}

function emitEvent(req, eventName, data) {
  if (req.io && typeof req.io.emit === "function") {
    req.io.emit(eventName, data);
  }
}

function validText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function canAccessUser(req, requestedId) {
  if (!req.user) return false;

  return (
    req.user.role === "admin" ||
    String(req.user.id) === String(requestedId)
  );
}

// ======================================
// CREATE ORDER FROM CART
// ======================================

exports.createOrderFromCart = async (req, res) => {
  try {
    const body = getBody(req);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Login required"
      });
    }

    // Customer ID always comes from authenticated token.
    // Admin may specify a customer ID.
    const customerId =
      req.user.role === "admin"
        ? String(body.customerId || "").trim()
        : String(req.user.id);

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "customerId is required"
      });
    }

    if (
      req.user.role !== "admin" &&
      req.user.role !== "customer"
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot create this order."
      });
    }

    const deliveryAddress = body.deliveryAddress;

    // Keep existing payment method functionality.
    const paymentMethod = validText(body.paymentMethod)
      ? body.paymentMethod.trim()
      : "Cash";

    const transactionId = validText(body.transactionId)
      ? body.transactionId.trim()
      : "";

    const order = await repo.createOrderFromCart({
      customerId,
      sellerId: body.sellerId || null,
      deliveryAddress,
      paymentMethod,
      transactionId
    });

    if (!order) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty"
      });
    }

    emitEvent(req, "newOrder", order);

    return res.status(201).json({
      success: true,
      message: "Order created",
      order
    });

  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not create order"
    });
  }
};


// ======================================
// CREATE DIRECT ORDER
// ======================================

exports.createOrder = async (req, res) => {
  try {
    const body = getBody(req);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Login required"
      });
    }

    if (
      req.user.role !== "admin" &&
      req.user.role !== "customer"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const customerId =
      req.user.role === "admin"
        ? String(body.customerId || "").trim()
        : String(req.user.id);

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "customerId is required"
      });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items are required"
      });
    }

    const total = Number(body.total);

    if (!Number.isFinite(total) || total < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order total"
      });
    }

    const order = await repo.createOrder({
      customerId,
      sellerId: body.sellerId || null,
      items: body.items,
      total,
      paymentMethod: validText(body.paymentMethod)
        ? body.paymentMethod.trim()
        : "Cash",
      transactionId: body.transactionId || "",
      deliveryAddress: body.deliveryAddress
    });

    emitEvent(req, "newOrder", order);

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order
    });

  } catch (error) {
    console.error("CREATE DIRECT ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not create order"
    });
  }
};


// ======================================
// GET ALL ORDERS (ADMIN)
// ======================================

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await repo.listOrders({
      populate: true
    });

    return res.status(200).json(orders);

  } catch (error) {
    console.error("GET ALL ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load orders"
    });
  }
};


// ======================================
// GET CUSTOMER ORDERS
// ======================================

exports.getCustomerOrders = async (req, res) => {
  try {
    const customerId = req.params.customerId;

    if (!canAccessUser(req, customerId)) {
      return res.status(403).json({
        success: false,
        message: "You cannot access these orders."
      });
    }

    const orders = await repo.listOrders({
      field: "customerId",
      value: customerId
    });

    return res.status(200).json(orders);

  } catch (error) {
    console.error("GET CUSTOMER ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load customer orders"
    });
  }
};


// ======================================
// GET SELLER ORDERS
// ======================================

exports.getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.params.sellerId;

    if (!canAccessUser(req, sellerId)) {
      return res.status(403).json({
        success: false,
        message: "You cannot access these orders."
      });
    }

    const orders = await repo.listOrders({
      field: "sellerId",
      value: sellerId
    });

    return res.status(200).json(orders);

  } catch (error) {
    console.error("GET SELLER ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load seller orders"
    });
  }
};


// ======================================
// GET RIDER ORDERS
// ======================================

exports.getRiderOrders = async (req, res) => {
  try {
    const riderId = req.params.riderId;

    if (!canAccessUser(req, riderId)) {
      return res.status(403).json({
        success: false,
        message: "You cannot access these orders."
      });
    }

    const orders = await repo.listOrders({
      field: "riderId",
      value: riderId
    });

    return res.status(200).json(orders);

  } catch (error) {
    console.error("GET RIDER ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load rider orders"
    });
  }
};


// ======================================
// SELLER ACCEPT ORDER
// ======================================

exports.sellerAcceptOrder = async (req, res) => {
  try {
    const body = getBody(req);

    if (
      !req.user ||
      !["seller", "admin"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Seller or admin access required"
      });
    }

    const sellerId =
      req.user.role === "seller"
        ? String(req.user.id)
        : String(body.sellerId || "").trim();

    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: "Seller ID is required"
      });
    }

    const existingOrder = await repo.getOrder(req.params.id);

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (
      req.user.role === "seller" &&
      existingOrder.sellerId &&
      String(existingOrder.sellerId) !== sellerId
    ) {
      return res.status(403).json({
        success: false,
        message: "This order belongs to another seller."
      });
    }

    const order = await repo.updateOrder(
      req.params.id,
      {
        sellerId,
        status: "Confirmed"
      }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    emitEvent(req, "orderAccepted", order);

    return res.status(200).json({
      success: true,
      message: "Seller accepted order",
      order
    });

  } catch (error) {
    console.error("SELLER ACCEPT ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not update order"
    });
  }
};


// ======================================
// UPDATE ORDER STATUS (ADMIN)
// ======================================

exports.updateOrderStatus = async (req, res) => {
  try {
    const body = getBody(req);

    if (!validText(body.status)) {
      return res.status(400).json({
        success: false,
        message: "Order status is required"
      });
    }

    const order = await repo.updateOrder(
      req.params.id,
      {
        status: body.status.trim()
      }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    emitEvent(req, "orderStatusUpdate", order);

    return res.status(200).json({
      success: true,
      order
    });

  } catch (error) {
    console.error("UPDATE ORDER STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not update order status"
    });
  }
};


// ======================================
// UPDATE DELIVERY STATUS (ADMIN)
// ======================================

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const body = getBody(req);

    if (!validText(body.deliveryStatus)) {
      return res.status(400).json({
        success: false,
        message: "Delivery status is required"
      });
    }

    const updates = {
      deliveryStatus: body.deliveryStatus.trim()
    };

    // Only update riderId when explicitly supplied.
    // This prevents accidentally removing an assigned rider.

    if (Object.prototype.hasOwnProperty.call(body, "riderId")) {
      updates.riderId = body.riderId
        ? String(body.riderId).trim()
        : null;
    }

    const order = await repo.updateOrder(
      req.params.id,
      updates
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    emitEvent(req, "deliveryUpdate", order);

    return res.status(200).json({
      success: true,
      message: "Delivery updated",
      order
    });

  } catch (error) {
    console.error("UPDATE DELIVERY STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not update delivery"
    });
  }
};
