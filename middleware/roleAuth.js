
const jwt = require("jsonwebtoken");
const repo = require("../database/repository");

module.exports = (...roles) => async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Login required"
    });
  }

  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 32
  ) {
    return res.status(500).json({
      success: false,
      message: "Authentication configuration error"
    });
  }

  const token = authHeader.split(" ")[1];

  let decoded;

  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }

  if (!decoded.id || !decoded.role) {
    return res.status(401).json({
      success: false,
      message: "Invalid token data"
    });
  }

  try {
    // Always check the latest user status from Turso.
    const user = await repo.findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found"
      });
    }

    if (user.role !== decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Account permissions have changed. Login again."
      });
    }

    // Block pending or revoked sellers.
    if (user.role === "seller" && !user.approved) {
      return res.status(403).json({
        success: false,
        message: "Seller account is not approved."
      });
    }

    if (roles.length && !roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    req.user = {
      id: user.id || user._id,
      _id: user.id || user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      approved: user.approved
    };

    return next();

  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed"
    });
  }
};
