
const router = require("express").Router();

const repo = require("../database/repository");
const auth = require("../middleware/roleAuth");

// ======================================
// GET ALL USERS
// GET /api/users
// ADMIN ONLY
// ======================================

router.get(
  "/",
  auth("admin"),
  async (req, res) => {
    try {
      const users = await repo.listUsers();

      // Never expose password hashes through API.
      const safeUsers = users.map((user) => {
        const {
          password,
          passwordHash,
          ...safeUser
        } = user;

        return safeUser;
      });

      return res.status(200).json({
        success: true,
        count: safeUsers.length,
        users: safeUsers
      });

    } catch (error) {
      console.error("GET USERS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Could not load users"
      });
    }
  }
);

// ======================================
// EXPORT ROUTER
// ======================================

module.exports = router;
