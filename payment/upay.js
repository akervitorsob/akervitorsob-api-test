
const GATEWAY_NAME = "upay";

// ======================================
// CREATE UPAY PAYMENT
// ======================================

async function createUpayPayment(amount) {
  const paymentAmount = Number(amount);

  if (
    !Number.isFinite(paymentAmount) ||
    paymentAmount <= 0
  ) {
    throw new Error("Invalid Upay payment amount.");
  }

  // Official Upay checkout API is not connected yet.

  return {
    gateway: GATEWAY_NAME,
    amount: paymentAmount,
    status: "Pending",
    configured: false,
    paymentCreated: false,
    message:
      "Upay merchant credentials and official server-side checkout API are not configured. Live payment is unavailable."
  };
}

// ======================================
// VERIFY UPAY PAYMENT
// ======================================

async function verifyUpayPayment(transactionId) {
  const trxId = String(transactionId || "").trim();

  if (!trxId) {
    throw new Error("Upay transaction ID is required.");
  }

  // Official Upay transaction verification
  // must be implemented before confirming payment.

  return {
    gateway: GATEWAY_NAME,
    transactionId: trxId,
    status: "Pending",
    verified: false,
    configured: false,
    message:
      "Official Upay verification is not configured. Payment cannot be marked as paid."
  };
}

// ======================================
// EXPORT
// ======================================

module.exports = {
  createUpayPayment,
  verifyUpayPayment
};
