const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/paymentController");
const paymentNotificationController = require("../controllers/paymentNotificationController");

const {
  verifyToken,
} = require("../middleware/authMiddleware");

// ============================
// MIDTRANS CALLBACK
// ============================
// PENTING: route ini HARUS di atas "/:orderId".
// Kalau di bawah, "/notification" bakal ke-match sama pattern "/:orderId"
// (orderId = "notification"), jadi request Midtrans kena verifyToken -> 401.

// Notification dari Midtrans
router.post(
  "/notification",
  paymentNotificationController.handleNotification
);

// ============================
// CUSTOMER
// ============================

// Generate Snap Token
router.post(
  "/:orderId",
  verifyToken,
  paymentController.createPayment
);

module.exports = router;