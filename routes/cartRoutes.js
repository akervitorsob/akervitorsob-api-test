
const router = require("express").Router();

const repo = require("../database/repository");
const auth = require("../middleware/roleAuth");

// ======================================
// CUSTOMER OWNERSHIP CHECK
// ======================================

function checkCustomer(req, res, next) {
  const rawCustomerId =
    req.params.customerId ||
    (req.body && req.body.customerId);

  if (
    rawCustomerId === undefined ||
    rawCustomerId === null ||
    String(rawCustomerId).trim() === ""
  ) {
    return res.status(400).json({
      success: false,
      message: "Customer ID is required."
    });
  }

  const requestedId = String(rawCustomerId).trim();

  // Admin can access any customer's cart.
  // Customers can access only their own cart.

  if (
    req.user.role !== "admin" &&
    String(req.user.id) !== requestedId
  ) {
    return res.status(403).json({
      success: false,
      message: "You can only access your own cart."
    });
  }

  req.cartCustomerId = requestedId;

  return next();
}

// ======================================
// QUANTITY VALIDATION
// ======================================

function parseAddQuantity(value) {
  const quantity = value || 1;
  const parsed = Number(quantity);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(1, Math.floor(parsed));
}

function parseUpdateQuantity(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return null;
  }

  return Math.floor(parsed);
}

// ======================================
// GET CUSTOMER CART
// GET /api/cart/:customerId
// ======================================

router.get(
  "/:customerId",
  auth("customer", "admin"),
  checkCustomer,
  async (req, res) => {
    try {
      const cart = await repo.getCart(
        req.cartCustomerId,
        true
      );

      return res.status(200).json(
        cart || {
          items: [],
          totalAmount: 0
        }
      );

    } catch (error) {
      console.error("GET CART ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Could not load cart"
      });
    }
  }
);

// ======================================
// ADD ITEM TO CART
// POST /api/cart/add
// ======================================

router.post(
  "/add",
  auth("customer", "admin"),
  checkCustomer,
  async (req, res) => {
    try {
      const body = req.body || {};

      const productId =
        typeof body.productId === "string"
          ? body.productId.trim()
          : "";

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required"
        });
      }

      const quantity = parseAddQuantity(body.quantity);

      if (quantity === null) {
        return res.status(400).json({
          success: false,
          message: "Invalid product quantity"
        });
      }

      const result = await repo.addCartItem({
        customerId: req.cartCustomerId,
        productId,
        quantity
      });

      if (result && result.error) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.error
        });
      }

      return res.status(200).json(result);

    } catch (error) {
      console.error("ADD CART ITEM ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Could not add cart item"
      });
    }
  }
);

// ======================================
// UPDATE CART ITEM
// PATCH /api/cart/update
// ======================================

router.patch(
  "/update",
  auth("customer", "admin"),
  checkCustomer,
  async (req, res) => {
    try {
      const body = req.body || {};

      const itemId =
        typeof body.itemId === "string"
          ? body.itemId.trim()
          : "";

      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: "Cart item ID is required"
        });
      }

      const quantity = parseUpdateQuantity(body.quantity);

      if (quantity === null) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be at least 1"
        });
      }

      const result = await repo.updateCartItem(
        req.cartCustomerId,
        itemId,
        quantity
      );

      if (result && result.error) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.error
        });
      }

      return res.status(200).json(result);

    } catch (error) {
      console.error("UPDATE CART ITEM ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Could not update cart item"
      });
    }
  }
);

// ======================================
// CLEAR CUSTOMER CART
// DELETE /api/cart/clear/:customerId
// ======================================

router.delete(
  "/clear/:customerId",
  auth("customer", "admin"),
  checkCustomer,
  async (req, res) => {
    try {
      await repo.clearCart(req.cartCustomerId);

      return res.status(200).json({
        success: true,
        message: "Cart cleared"
      });

    } catch (error) {
      console.error("CLEAR CART ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Could not clear cart"
      });
    }
  }
);

// ======================================
// REMOVE SINGLE CART ITEM
// DELETE /api/cart/:customerId/:itemId
// ======================================

router.delete(
  "/:customerId/:itemId",
  auth("customer", "admin"),
  checkCustomer,
  async (req, res) => {
    try {
      const itemId = String(req.params.itemId || "").trim();

      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: "Cart item ID is required"
        });
      }

      const result = await repo.removeCartItem(
        req.cartCustomerId,
        itemId
      );

      if (result && result.error) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.error
        });
      }

      return res.status(200).json(result);

    } catch (error) {
      console.error("REMOVE CART ITEM ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Could not remove cart item"
      });
    }
  }
);

// ======================================
// EXPORT ROUTER
// ======================================

module.exports = router;
