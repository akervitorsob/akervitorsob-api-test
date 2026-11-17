
const jwt = require("jsonwebtoken");

module.exports = (...roles) => {
  return (req, res, next) => {
    try {
      // Check authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || typeof authHeader !== "string") {
        return res.status(401).json({
          message: "Login required"
        });
      }

      // Extract Bearer token
      const match = authHeader.match(/^Bearer\s+(.+)$/i);

      if (!match || !match[1].trim()) {
        return res.status(401).json({
          message: "Login required"
        });
      }

      const token = match[1].trim();

      // Verify JWT secret
      if (
        !process.env.JWT_SECRET ||
        process.env.JWT_SECRET.length < 32
      ) {
        console.error("JWT_SECRET is missing or invalid.");

        return res.status(500).json({
          message: "Server authentication configuration error"
        });
      }

      // Verify token
      const user = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      // Validate decoded token payload
      if (
        !user ||
        typeof user !== "object" ||
        Array.isArray(user)
      ) {
        return res.status(401).json({
          message: "Invalid token"
        });
      }

      // Check user role
      if (
        roles.length > 0 &&
        !roles.includes(user.role)
      ) {
        return res.status(403).json({
          message: "Access denied"
        });
      }

      // Attach authenticated user
      req.user = user;

      return next();

    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Token expired"
        });
      }

      return res.status(401).json({
        message: "Invalid token"
      });
    }
  };
};
