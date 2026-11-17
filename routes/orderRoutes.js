
const router = require("express").Router();

const auth = require("../middleware/roleAuth");

const {
  createOrderFromCart,
  getAllOrders,
  getCustomerOrders,
  getSellerOrders,
  getRiderOrders,
  updateOrderStatus,
  updateDeliveryStatus
} = require("../controllers/realOrderController");

// ======================================
// CHECK USER OWNERSHIP
// ======================================

function checkParamUser(paramName) {
  return (req, res, next) => {
    const requestedId = String(
      req.params[paramName] || ""
    ).trim();

    if (!requestedId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required."
      });
    }

    if (
      req.user.role !== "admin" &&
      String(req.user.id) !== requestedId
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot access these orders."
      });
    }

    return next();
  };
}

// ======================================
// SECURE CUSTOMER ORDER CREATION
// ======================================

function bindAuthenticatedCustomer(req, res, next) {
  if (req.user.role !== "admin") {
    req.body = req.body || {};

    // Customer cannot create an order
    // using another customer's ID.
    req.body.customerId = req.user.id;
  }

  return next();
}

// ======================================
// CREATE ORDER FROM CART
// POST /api/orders/create-from-cart
// ======================================

router.post(
  "/create-from-cart",
  auth("customer", "admin"),
  bindAuthenticatedCustomer,
  createOrderFromCart
);

// ======================================
// GET ALL ORDERS (ADMIN)
// GET /api/orders
// ======================================

router.get(
  "/",
  auth("admin"),
  getAllOrders
);

// ======================================
// GET CUSTOMER ORDERS
// GET /api/orders/customer/:customerId
// ======================================

router.get(
  "/customer/:customerId",
  auth("customer", "admin"),
  checkParamUser("customerId"),
  getCustomerOrders
);

// ======================================
// GET SELLER ORDERS
// GET /api/orders/seller/:sellerId
// ======================================

router.get(
  "/seller/:sellerId",
  auth("seller", "admin"),
  checkParamUser("sellerId"),
  getSellerOrders
);

// ======================================
// GET RIDER ORDERS
// GET /api/orders/rider/:riderId
// ======================================

router.get(
  "/rider/:riderId",
  auth("rider", "admin"),
  checkParamUser("riderId"),
  getRiderOrders
);

// ======================================
// UPDATE ORDER STATUS (ADMIN)
// PUT /api/orders/:id/status
// ======================================

router.put(
  "/:id/status",
  auth("admin"),
  updateOrderStatus
);

// ======================================
// UPDATE DELIVERY STATUS (ADMIN)
// PUT /api/orders/:id/delivery
// ======================================

router.put(
  "/:id/delivery",
  auth("admin"),
  updateDeliveryStatus
);

// ======================================
// EXPORT ROUTER
// ======================================

module.exports = router;
