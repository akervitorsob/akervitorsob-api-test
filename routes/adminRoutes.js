
const router = require("express").Router();

const auth = require("../middleware/roleAuth");
const repo = require("../database/repository");

// ======================================
// ADMIN DASHBOARD
// GET /api/admin/dashboard
// ADMIN ONLY
// ======================================

router.get(
  "/dashboard",
  auth("admin"),
  async (req, res) => {
    try {
      // Load dashboard statistics simultaneously.
      const [
        totalProducts,
        totalOrders,
        totalUsers,
        totalSales
      ] = await Promise.all([
        repo.countProducts(),
        repo.countOrders(),
        repo.countUsers(),
        repo.totalPaidSales()
      ]);

      return res.status(200).json({
        success: true,
        totalProducts: Number(totalProducts) || 0,
        totalOrders: Number(totalOrders) || 0,
        totalUsers: Number(totalUsers) || 0,
        totalSales: Number(totalSales) || 0
      });

    } catch (error) {
      console.error("ADMIN DASHBOARD ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Could not load dashboard"
      });
    }
  }
);

// ======================================
// EXPORT ROUTER
// ======================================

module.exports = router;
