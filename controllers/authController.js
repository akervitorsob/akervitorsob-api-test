
const repo = require("../database/repository");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;
const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRES_IN = "7d";

const ALLOWED_SIGNUP_ROLES = [
  "customer",
  "seller"
];

// ======================================
// PUBLIC USER INFORMATION
// ======================================

function getPublicUser(user) {
  const id = user.id || user._id;

  return {
    id,
    _id: id,
    name: user.name || "",
    email: user.email,
    role: user.role,
    approved: Boolean(user.approved)
  };
}

// ======================================
// DUPLICATE EMAIL CHECK
// ======================================

function isDuplicateEmailError(error) {
  const message = String(error?.message || error);
  const code = error?.code;

  return (
    message.includes("UNIQUE constraint failed") ||
    message.includes("users.email") ||
    message.includes("sellers.email") ||
    code === "SQLITE_CONSTRAINT_UNIQUE" ||
    code === "SQLITE_CONSTRAINT"
  );
}

// ======================================
// JWT SECRET VALIDATION
// ======================================

function hasValidJwtSecret() {
  return (
    typeof process.env.JWT_SECRET === "string" &&
    process.env.JWT_SECRET.length >= 32
  );
}

// ======================================
// USER SIGNUP
// ======================================

exports.signup = async (req, res) => {
  try {
    const body = req.body || {};

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required."
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name cannot exceed 100 characters."
      });
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address."
      });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters."
      });
    }

    if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
      return res.status(400).json({
        success: false,
        message: "Password is too long."
      });
    }

    // Only customer and seller signup are allowed.
    const requestedRole =
      typeof body.role === "string"
        ? body.role.trim().toLowerCase()
        : "customer";

    if (!ALLOWED_SIGNUP_ROLES.includes(requestedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid signup role."
      });
    }

    // Check existing user.
    const existingUser = await repo.findUserByEmail(email);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists."
      });
    }

    // Secure password hashing.
    const hashedPassword = await bcrypt.hash(
      password,
      BCRYPT_ROUNDS
    );

    // Create user in Turso.
    // Seller profile must also be created by repository.
    const user = await repo.createUser({
      name,
      email,
      password: hashedPassword,
      role: requestedRole,

      // Seller approval is always controlled by admin.
      approved: requestedRole === "customer"
        ? false
        : false,

      phone: body.phone || "",
      shopName: body.shopName || "",
      address: body.address || ""
    });

    if (!user) {
      throw new Error("User creation failed.");
    }

    return res.status(201).json({
      success: true,
      message:
        requestedRole === "seller"
          ? "Seller registration submitted. Awaiting admin approval."
          : "Account created successfully.",
      user: getPublicUser(user)
    });

  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return res.status(409).json({
        success: false,
        message: "User already exists."
      });
    }

    console.error("SIGNUP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Signup failed."
    });
  }
};

// ======================================
// USER LOGIN
// ======================================

exports.login = async (req, res) => {
  try {
    const body = req.body || {};

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    // Validate JWT configuration.
    if (!hasValidJwtSecret()) {
      console.error("JWT_SECRET is missing or invalid.");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error."
      });
    }

    // Find user from Turso.
    // Repository must return password hash here.
    const user = await repo.findUserByEmail(email);

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    // Verify password.
    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    // Seller must be approved by admin.
    if (
      user.role === "seller" &&
      !user.approved
    ) {
      return res.status(403).json({
        success: false,
        message: "Your seller account is awaiting admin approval."
      });
    }

    const userId = user.id || user._id;

    if (!userId || !user.role) {
      console.error("User record is missing ID or role.");

      return res.status(500).json({
        success: false,
        message: "Unable to authenticate this account."
      });
    }

    // Generate JWT.
    const token = jwt.sign(
      {
        id: userId,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: TOKEN_EXPIRES_IN,
        algorithm: "HS256"
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: getPublicUser(user)
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed."
    });
  }
};
