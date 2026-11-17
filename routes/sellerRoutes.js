
const router = require("express").Router();

const auth = require("../middleware/roleAuth");

const {
  getSellers,
  approveSeller,
  deleteSeller
} = require("../controllers/sellerController");

// ======================================
// VALIDATE SELLER ID
// ======================================

function validateSellerId(req, res, next) {
  const sellerId = String(req.params.id || "").trim();

  if (!sellerId) {
    return res.status(400).json({
      success: false,
      message: "Seller ID is required."
    });
  }

  req.params.id = sellerId;

  return next();
}

// ======================================
// GET ALL SELLERS
// GET /api/sellers
// ADMIN ONLY
// ======================================

router.get(
  "/",
  auth("admin"),
  getSellers
);

// ======================================
// APPROVE SELLER
// PUT /api/sellers/:id/approve
// ADMIN ONLY
// ======================================

router.put(
  "/:id/approve",
  auth("admin"),
  validateSellerId,
  approveSeller
);

// ======================================
// DELETE SELLER
// DELETE /api/sellers/:id
// ADMIN ONLY
// ======================================

router.delete(
  "/:id",
  auth("admin"),
  validateSellerId,
  deleteSeller
);

// ======================================
// EXPORT ROUTER
// ======================================

module.exports = router;
