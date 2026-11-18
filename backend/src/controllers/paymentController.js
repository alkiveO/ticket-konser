const snap = require("../config/midtrans");
const db = require("../config/database");

// ============================
// CREATE SNAP TOKEN
// ============================
const createPayment = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    // Ambil order
    const [orders] = await db.query(
      `
      SELECT
        orders.*,
        users.full_name,
        users.email
      FROM orders
      JOIN users
        ON orders.user_id = users.id
      WHERE orders.id = ?
      `,
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan",
      });
    }

    const order = orders[0];

    // Customer hanya boleh bayar order miliknya
    if (
      req.user.role === "customer" &&
      order.user_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak",
      });
    }

    // Sudah dibayar?
    if (order.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Order sudah dibayar",
      });
    }

    // Order ID unik yang dikirim ke Midtrans (beda dari order_code asli)
    const midtransOrderId = `${order.order_code}-${Date.now()}`;

    const parameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: order.total_price,
      },
      customer_details: {
        first_name: order.full_name,
        email: order.email,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    // Simpan ke tabel payments (BUKAN update orders)
    await db.query(
      `
      INSERT INTO payments
      (
        order_id,
        midtrans_order_id,
        snap_token,
        payment_status
      )
      VALUES
      (?, ?, ?, 'pending')
      `,
      [order.id, midtransOrderId, transaction.token]
    );

    res.json({
      success: true,
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    });
  } catch (error) {
    console.error("MIDTRANS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createPayment,
};