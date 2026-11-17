
const {
  createBkashPayment,
  verifyBkashPayment
} = require("./bkash");

const {
  createNagadPayment,
  verifyNagadPayment
} = require("./nagad");

const {
  createRocketPayment,
  verifyRocketPayment
} = require("./rocket");

const {
  createUpayPayment,
  verifyUpayPayment
} = require("./upay");

// ======================================
// PAYMENT PROVIDERS
// ======================================

const paymentProviders = {
  bkash: {
    create: createBkashPayment,
    verify: verifyBkashPayment
  },

  nagad: {
    create: createNagadPayment,
    verify: verifyNagadPayment
  },

  rocket: {
    create: createRocketPayment,
    verify: verifyRocketPayment
  },

  upay: {
    create: createUpayPayment,
    verify: verifyUpayPayment
  }
};

// ======================================
// NORMALIZE METHOD
// ======================================

function normalizeMethod(method) {
  return String(method || "").trim().toLowerCase();
}

// ======================================
// CREATE PAYMENT
// ======================================

async function createPayment(method, amount) {
  const normalizedMethod = normalizeMethod(method);

  const provider = paymentProviders[normalizedMethod];

  if (!provider) {
    throw new Error("Unsupported payment method.");
  }

  const paymentAmount = Number(amount);

  if (
    !Number.isFinite(paymentAmount) ||
    paymentAmount <= 0
  ) {
    throw new Error("Invalid payment amount.");
  }

  return await provider.create(paymentAmount);
}

// ======================================
// VERIFY PAYMENT
// ======================================

async function verifyPayment(method, transactionId) {
  const normalizedMethod = normalizeMethod(method);

  const provider = paymentProviders[normalizedMethod];

  if (!provider) {
    throw new Error("Unsupported payment method.");
  }

  const trxId = String(transactionId || "").trim();

  if (!trxId) {
    throw new Error("Transaction ID is required.");
  }

  return await provider.verify(trxId);
}

// ======================================
// GET AVAILABLE PAYMENT METHODS
// ======================================

function getPaymentMethods() {
  return Object.keys(paymentProviders);
}

// ======================================
// EXPORT
// ======================================

module.exports = {
  createPayment,
  verifyPayment,
  getPaymentMethods
};
