
const repo = require("../database/repository");

// ======================================
// GET ALL SELLERS
// GET /api/sellers
// ADMIN ONLY
// ======================================

exports.getSellers = async (req, res) => {
  try {
    const sellers = await repo.listSellers();

    return res.status(200).json({
      success: true,
      count: sellers.length,
      sellers
    });

  } catch (error) {
    console.error("GET SELLERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load sellers"
    });
  }
};

// ======================================
// APPROVE SELLER
// PUT /api/sellers/:id/approve
// ADMIN ONLY
// ======================================

exports.approveSeller = async (req, res) => {
  try {
    const sellerId = String(req.params.id || "").trim();

    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: "Seller ID is required"
      });
    }

    const seller = await repo.approveSeller(sellerId);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Seller approved successfully",
      seller
    });

  } catch (error) {
    console.error("APPROVE SELLER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not approve seller"
    });
  }
};

// ======================================
// DELETE SELLER
// DELETE /api/sellers/:id
// ADMIN ONLY
// ======================================

exports.deleteSeller = async (req, res) => {
  try {
    const sellerId = String(req.params.id || "").trim();

    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: "Seller ID is required"
      });
    }

    const deleted = await repo.deleteSeller(sellerId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Seller not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Seller deleted successfully"
    });

  } catch (error) {
    console.error("DELETE SELLER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not delete seller"
    });
  }
};
