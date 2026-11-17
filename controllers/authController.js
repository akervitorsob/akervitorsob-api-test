
const repo = require("../database/repository");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRES_IN = "7d";

function getPublicUser(user) {
  const id = user.id || user._id;

  return {
    id,
    _id: id,
    name: user.name || "",
    email: user.email,
    role: user.role,
    approved: !!user.approved
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isDuplicateEmailError(error) {
  const message = String(error?.message || error);
  const code = error?.code;

  return (
    message.includes("UNIQUE constraint failed") ||
    message.includes("users.email") ||
    code === "SQLITE_CONSTRAINT_UNIQUE" ||
    code === "SQLITE_CONSTRAINT"
  );
}

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

    const name = String(body.name || body.ownerName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    const requestedRole = String(
      body.role || "customer"
    ).trim().toLowerCase();

    const role = requestedRole === "seller"
      ? "seller"
      : "customer";

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password required"
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters"
      });
    }

    const existingUser = await repo.findUserByEmail(email);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      BCRYPT_ROUNDS
    );

    const user = await repo.createUser({
      name,
      email,
      password: hashedPassword,
      role,
      phone: String(body.phone || "").trim(),
      shopName: String(body.shopName || "").trim(),
      address: String(body.address || "").trim()
    });

    if (!user) {
      throw new Error("User creation failed.");
    }

    return res.status(201).json({
      success: true,
      message: role === "seller"
        ? "Seller registration successful. Waiting for admin approval."
        : "Registration successful.",
      user: getPublicUser(user)
    });

  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return res.status(409).json({
        success: false,
        message: "User already exists"
      });
    }

    console.error("SIGNUP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Signup failed"
    });
  }
};


// ======================================
// USER LOGIN
// ======================================

exports.login = async (req, res) => {
  try {
    const body = req.body || {};

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required"
      });
    }

    if (!hasValidJwtSecret()) {
      console.error("JWT_SECRET is missing or invalid.");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error"
      });
    }

    const user = await repo.findUserByEmail(email);

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Seller approval check

    if (
      user.role === "seller" &&
      !user.approved
    ) {
      return res.status(403).json({
        success: false,
        message: "Your seller account is waiting for admin approval."
      });
    }

    const userId = user.id || user._id;

    if (!userId || !user.role) {
      console.error("User record is missing ID or role.");

      return res.status(500).json({
        success: false,
        message: "Unable to authenticate this account"
      });
    }

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
      message: "Login successful",
      token,
      user: getPublicUser(user)
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
};
