
const GATEWAY_NAME = "nagad";

// ======================================
// CREATE NAGAD PAYMENT
// ======================================

async function createNagadPayment(amount) {
  const paymentAmount = Number(amount);

  if (
    !Number.isFinite(paymentAmount) ||
    paymentAmount <= 0
  ) {
    throw new Error("Invalid Nagad payment amount.");
  }

  // Official Nagad checkout API is not connected yet.
  // Do not pretend that payment has been received.

  return {
    gateway: GATEWAY_NAME,
    amount: paymentAmount,
    status: "Pending",
    configured: false,
    paymentCreated: false,
    message:
      "Nagad merchant credentials and official server-side checkout API are not configured. Live payment is unavailable."
  };
}

// ======================================
// VERIFY NAGAD PAYMENT
// ======================================

async function verifyNagadPayment(transactionId) {
  const trxId = String(transactionId || "").trim();

  if (!trxId) {
    throw new Error("Nagad transaction ID is required.");
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
      "Official Nagad transaction verification is not configured. Payment cannot be marked as paid."
  };
}

// ======================================
// EXPORT FUNCTIONS
// ======================================

module.exports = {
  createNagadPayment,
  verifyNagadPayment
};
