const snap = require("../config/midtrans");
const orderModel = require("../models/orderModel");

const handleNotification = async (req, res) => {
  try {
    // Verifikasi notification dari Midtrans
    const statusResponse = await snap.transaction.notification(req.body);

    const orderId = statusResponse.order_id;
    const transactionId = statusResponse.transaction_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;
    const paymentType = statusResponse.payment_type;

    console.log("===== MIDTRANS CALLBACK =====");
    console.log(statusResponse);

    // ============================
    // PAYMENT SUCCESS
    // ============================
    if (
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && fraudStatus === "accept")
    ) {
      await orderModel.markAsPaid(orderId, paymentType, transactionId);
    }

    // ============================
    // PAYMENT EXPIRED
    // ============================
    else if (transactionStatus === "expire") {
      await orderModel.markAsExpired(orderId);
    }

    // ============================
    // PAYMENT CANCELLED / DENY
    // ============================
    else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny"
    ) {
      await orderModel.markAsCancelled(orderId);
    }

    // ============================
    // PAYMENT PENDING
    // ============================
    else if (transactionStatus === "pending") {
      console.log("Payment masih pending...");
    }

    return res.status(200).json({
      success: true,
      message: "Notification processed",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  handleNotification,
};