
const GATEWAY_NAME = "rocket";

async function createRocketPayment(amount) {
  const paymentAmount = Number(amount);

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error("Invalid Rocket payment amount.");
  }

  return {
    gateway: GATEWAY_NAME,
    amount: paymentAmount,
    status: "Pending",
    configured: false,
    paymentCreated: false,
    message: "Official Rocket checkout API is not configured."
  };
}

async function verifyRocketPayment(transactionId) {
  const trxId = String(transactionId || "").trim();

  if (!trxId) {
    throw new Error("Rocket transaction ID is required.");
  }

  return {
    gateway: GATEWAY_NAME,
    transactionId: trxId,
    status: "Pending",
    verified: false,
    configured: false,
    message: "Official Rocket verification is not configured."
  };
}

module.exports = {
  createRocketPayment,
  verifyRocketPayment
};
