
const GATEWAY_NAME = "bkash";

// ======================================
// CREATE BKASH PAYMENT
// ======================================

async function createBkashPayment(amount) {
  const paymentAmount = Number(amount);

  if (
    !Number.isFinite(paymentAmount) ||
    paymentAmount <= 0
  ) {
    throw new Error("Invalid bKash payment amount.");
  }

  // Official bKash checkout API is not connected yet.
  // This function must not pretend that money was received.

  return {
    gateway: GATEWAY_NAME,
    amount: paymentAmount,
    status: "Pending",
    configured: false,
    paymentCreated: false,
    message:
      "bKash merchant credentials and official server-side checkout API are not configured. Live payment is unavailable."
  };
}

// ======================================
// VERIFY BKASH PAYMENT
// ======================================

async function verifyBkashPayment(transactionId) {
  const trxId = String(transactionId || "").trim();

  if (!trxId) {
    throw new Error("bKash transaction ID is required.");
  }

  // Official server-side transaction verification
  // must be implemented before confirming payment.

  return {
    gateway: GATEWAY_NAME,
    transactionId: trxId,
    status: "Pending",
    verified: false,
    configured: false,
    message:
      "Official bKash transaction verification is not configured. Payment cannot be marked as paid."
  };
}

// ======================================
// EXPORT FUNCTIONS
// ======================================

module.exports = {
  createBkashPayment,
  verifyBkashPayment
};
