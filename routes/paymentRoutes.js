
const router = require("express").Router();

const repo = require("../database/repository");
const auth = require("../middleware/roleAuth");

const {
  createPayment,
  verifyPayment
} = require("../payment/paymentService");

// ======================================
// PAYMENT CONFIGURATION
// ======================================

const SUPPORTED_METHODS = [
  "bkash",
  "nagad",
  "rocket",
  "upay"
];

function normalizeMethod(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function sameAmount(a, b) {
  return (
    Number.isFinite(Number(a)) &&
    Number.isFinite(Number(b)) &&
    Math.round(Number(a) * 100) ===
    Math.round(Number(b) * 100)
  );
}

// ======================================
// CREATE PAYMENT
// POST /api/payment/create
// ======================================

router.post(
  "/create",
  auth("customer", "admin"),
  async (req, res) => {
    try {
      const body = req.body || {};

      const orderId = String(body.orderId || "").trim();

      const method = normalizeMethod(body.method);

      if (!orderId || !method) {
        return res.status(400).json({
          success: false,
          message: "Order ID and payment method are required."
        });
      }

      if (!SUPPORTED_METHODS.includes(method)) {
        return res.status(400).json({
          success: false,
          message: "Unsupported payment method."
        });
      }

      // Customer ID must come from authenticated account.
      const customerId =
        req.user.role === "admin"
          ? String(body.customerId || "").trim()
          : String(req.user.id);

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: "Customer ID is required."
        });
      }

      // Reject attempts to use another customer's ID.
      if (
        req.user.role !== "admin" &&
        body.customerId &&
        String(body.customerId) !== String(req.user.id)
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only pay for your own order."
        });
      }

      // Get actual order from database.
      const order = await repo.getOrder(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found."
        });
      }

      // Verify order ownership.
      if (String(order.customerId) !== customerId) {
        return res.status(403).json({
          success: false,
          message: "Order ownership verification failed."
        });
      }

      // Prevent payment for an already paid order.
      if (order.paymentStatus === "Paid") {
        return res.status(409).json({
          success: false,
          message: "This order has already been paid."
        });
      }

      // Prevent payment for cancelled orders.
      if (
        ["cancelled", "canceled"].includes(
          normalizeStatus(order.status)
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Cannot pay for a cancelled order."
        });
      }

      // Always calculate amount from database order.
      const actualAmount = Number(order.total);

      if (
        !Number.isFinite(actualAmount) ||
        actualAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid order amount."
        });
      }

      // Client amount is optional.
      // If supplied, it must match the actual order total.
      if (
        body.amount !== undefined &&
        !sameAmount(body.amount, actualAmount)
      ) {
        return res.status(400).json({
          success: false,
          message: "Payment amount does not match order total."
        });
      }

      // Check existing pending payment before calling gateway.
      const previousPayments = await repo.listPayments();

      const existingPending = previousPayments.find((payment) =>
        String(payment.orderId) === orderId &&
        normalizeMethod(payment.method) === method &&
        normalizeStatus(payment.status) === "pending"
      );

      if (existingPending) {
        return res.status(409).json({
          success: false,
          message: "A pending payment already exists for this order.",
          payment: existingPending
        });
      }

      // Request actual gateway checkout.
      const gatewayResponse = await createPayment(
        method,
        actualAmount
      );

      // Do not create a database payment when gateway is unavailable.
      if (
        !gatewayResponse ||
        gatewayResponse.configured !== true ||
        gatewayResponse.paymentCreated !== true
      ) {
        return res.status(503).json({
          success: false,
          message: "Payment gateway is not configured for live payments.",
          gateway: method,
          gatewayResponse
        });
      }

      // Save payment in Turso only after gateway checkout succeeds.
      const payment = await repo.createPayment({
        orderId,
        customerId,
        method,
        amount: actualAmount,
        transactionId: "",
        gatewayResponse,
        status: "Pending"
      });

      return res.status(201).json({
        success: true,
        message: "Payment initiated successfully.",
        payment,
        gatewayResponse
      });

    } catch (error) {
      console.error("CREATE PAYMENT ERROR:", error);

      if (
        String(error.message || "").includes("pending payment already exists")
      ) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: "Could not create payment."
      });
    }
  }
);

// ======================================
// VERIFY PAYMENT
// POST /api/payment/verify
// ======================================

router.post(
  "/verify",
  auth("customer", "admin"),
  async (req, res) => {
    try {
      const body = req.body || {};

      const paymentId = String(body.paymentId || "").trim();

      const method = normalizeMethod(body.method);

      const transactionId = String(
        body.transactionId || ""
      ).trim();

      if (!paymentId || !method || !transactionId) {
        return res.status(400).json({
          success: false,
          message: "Payment ID, method and transaction ID are required."
        });
      }

      if (!SUPPORTED_METHODS.includes(method)) {
        return res.status(400).json({
          success: false,
          message: "Unsupported payment method."
        });
      }

      // Get payment from database.
      const existing = await repo.getPayment(paymentId);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Payment not found."
        });
      }

      // Verify customer ownership.
      if (
        req.user.role !== "admin" &&
        String(req.user.id) !== String(existing.customerId)
      ) {
        return res.status(403).json({
          success: false,
          message: "You cannot verify this payment."
        });
      }

      // Payment method must match.
      if (method !== normalizeMethod(existing.method)) {
        return res.status(400).json({
          success: false,
          message: "Payment method does not match."
        });
      }

      // Return existing successful payment.
      if (existing.status === "Success") {
        return res.status(200).json({
          success: true,
          message: "Payment already verified.",
          payment: existing
        });
      }

      // Check associated order.
      const order = await repo.getOrder(existing.orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Associated order not found."
        });
      }

      if (
        String(order.customerId) !==
        String(existing.customerId)
      ) {
        return res.status(403).json({
          success: false,
          message: "Payment and order ownership mismatch."
        });
      }

      // Verify payment amount against order.
      if (!sameAmount(existing.amount, order.total)) {
        return res.status(409).json({
          success: false,
          message: "Payment amount and order amount do not match."
        });
      }

      // Prevent transaction ID reuse.
      const allPayments = await repo.listPayments();

      const duplicateTransaction = allPayments.find((payment) =>
        String(payment.id || payment._id) !== paymentId &&
        normalizeMethod(payment.method) === method &&
        String(payment.transactionId || "").trim() === transactionId
      );

      if (duplicateTransaction) {
        return res.status(409).json({
          success: false,
          message: "This transaction ID has already been used."
        });
      }

      // Ask the official gateway to verify the transaction.
      const result = await verifyPayment(
        existing.method,
        transactionId
      );

      // Gateway must be configured.
      if (!result || result.configured === false) {
        return res.status(503).json({
          success: false,
          message: "Official gateway verification is not configured.",
          verification: result || null
        });
      }

      const rawStatus = normalizeStatus(result.status);

      // A client-supplied transaction ID is never proof of payment.
      // The gateway must explicitly confirm verification.
      const verified = result.verified === true;

      let status = "Pending";

      if (verified && rawStatus === "success") {
        status = "Success";
      } else if (verified && rawStatus === "failed") {
        status = "Failed";
      }

      // If gateway returns amount, it must match.
      if (
        status === "Success" &&
        result.amount !== undefined &&
        !sameAmount(result.amount, existing.amount)
      ) {
        return res.status(409).json({
          success: false,
          message: "Gateway verified amount does not match payment amount.",
          paymentStatus: "Pending"
        });
      }

      // If gateway returns transaction ID, it must match.
      const verifiedTransactionId =
        result.transactionId ||
        result.trxID ||
        result.trxId;

      if (
        status === "Success" &&
        verifiedTransactionId &&
        String(verifiedTransactionId).trim() !== transactionId
      ) {
        return res.status(409).json({
          success: false,
          message: "Gateway transaction ID mismatch.",
          paymentStatus: "Pending"
        });
      }

      // Save gateway response and verification result.
      const payment = await repo.updatePayment(
        paymentId,
        {
          transactionId,
          status,
          gatewayResponse: result
        }
      );

      // Update order only after verified gateway response.
      if (status === "Success") {
        const updates = {
          paymentStatus: "Paid",
          transactionId
        };

        // Do not reopen cancelled orders.
        if (
          !["cancelled", "canceled"].includes(
            normalizeStatus(order.status)
          )
        ) {
          updates.status = "Confirmed";
        }

        await repo.updateOrder(existing.orderId, updates);

      } else if (status === "Failed") {
        await repo.updateOrder(existing.orderId, {
          paymentStatus: "Failed",
          transactionId
        });
      }

      return res.status(200).json({
        success: true,
        message:
          status === "Success"
            ? "Payment successfully verified."
            : status === "Failed"
              ? "Payment verification failed."
              : "Payment is still pending verification.",
        payment,
        verification: result
      });

    } catch (error) {
      console.error("VERIFY PAYMENT ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Could not verify payment."
      });
    }
  }
);

// ======================================
// PAYMENT HISTORY
// GET /api/payment/history
// ADMIN ONLY
// ======================================

router.get(
  "/history",
  auth("admin"),
  async (req, res) => {
    try {
      const payments = await repo.listPayments();

      return res.status(200).json({
        success: true,
        count: payments.length,
        payments
      });

    } catch (error) {
      console.error("PAYMENT HISTORY ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Could not load payments."
      });
    }
  }
);

// ======================================
// EXPORT ROUTER
// ======================================

module.exports = router;
