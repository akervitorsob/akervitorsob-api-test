
const express = require("express");

const router = express.Router();

// ======================================
// CONTROLLERS
// ======================================

const {
  signup,
  login
} = require("../controllers/authController");

// ======================================
// AUTHENTICATION MIDDLEWARE
// ======================================

const auth = require("../middleware/roleAuth");

// ======================================
// USER SIGNUP
// POST /api/auth/signup
// PUBLIC
// ======================================

router.post(
  "/signup",
  signup
);

// ======================================
// USER LOGIN
// POST /api/auth/login
// PUBLIC
// ======================================

router.post(
  "/login",
  login
);

// ======================================
// GET CURRENT LOGGED-IN USER
// GET /api/auth/me
// AUTHENTICATED USERS ONLY
// ======================================

router.get(
  "/me",
  auth("admin", "seller", "customer", "rider"),
  async (req, res) => {
    try {
      return res.status(200).json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role
        }
      });

    } catch (error) {
      console.error("GET CURRENT USER ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Could not load user information"
      });
    }
  }
);

// ======================================
// EXPORT ROUTER
// ======================================

module.exports = router;
