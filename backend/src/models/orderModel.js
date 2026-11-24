
const db = require("../config/database");
const adminNotificationModel = require("./adminNotificationModel");

const MAX_TICKETS_PER_CONCERT = 10;

// Generate Order Code
const generateOrderCode = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");

  return `ORD${year}${month}${day}${hour}${minute}${second}`;
};

// ============================
// HELPER: update status seats berdasarkan order_id
// ============================
const updateSeatsStatusByOrder = async (order_id, status) => {
  await db.query(
    `
    UPDATE seats
    JOIN order_item_seats ON order_item_seats.seat_id = seats.id
    JOIN order_items ON order_items.id = order_item_seats.order_item_id
    SET seats.status = ?
    WHERE order_items.order_id = ?
    `,
    [status, order_id]
  );
};

// ============================
// HELPER: ambil ringkasan order buat notif admin
// ============================
const getOrderNotifSummary = async (order_id) => {
  const [rows] = await db.query(
    `
    SELECT
      orders.order_code,
      orders.total_price,
      users.full_name AS customer_name,
      concerts.title AS concert_title
    FROM orders
    JOIN users ON users.id = orders.user_id
    JOIN order_items ON order_items.order_id = orders.id
    JOIN ticket_categories ON ticket_categories.id = order_items.ticket_category_id
    JOIN concerts ON concerts.id = ticket_categories.concert_id
    WHERE orders.id = ?
    LIMIT 1
    `,
    [order_id]
  );

  return rows[0] || null;
};

// ============================
// CREATE ORDER
// ============================
const createOrder = async (user_id, items) => {
  let totalPrice = 0;
  const orderItems = [];
  let concertId = null;

  for (const item of items) {
    const quantity = Number(item.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Jumlah tiket tidak valid");
    }

    const [ticket] = await db.query(
      `
      SELECT *
      FROM ticket_categories
      WHERE id = ?
      `,
      [item.ticket_category_id]
    );

    if (ticket.length === 0) {
      throw new Error("Kategori tiket tidak ditemukan");
    }

    const ticketData = ticket[0];

    if (Number(ticketData.remaining_quota) < quantity) {
      throw new Error(
        `Kuota tiket ${ticketData.name} tidak mencukupi`
      );
    }

    concertId = ticketData.concert_id;

    const subtotal = Number(ticketData.price) * quantity;

    totalPrice += subtotal;

    orderItems.push({
      ticket_category_id: ticketData.id,
      quantity,
      price: Number(ticketData.price),
      subtotal,
    });
  }

  const newQtyInThisCheckout = orderItems.reduce(
    (sum, item) => sum + Number(item.quantity),
    0
  );

  const [existing] = await db.query(
    `
    SELECT COALESCE(SUM(oi.quantity), 0) AS total_qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN ticket_categories tc ON tc.id = oi.ticket_category_id
    WHERE o.user_id = ?
      AND tc.concert_id = ?
      AND o.status IN ('pending', 'paid')
    `,
    [user_id, concertId]
  );

  // PENTING:
  // Hasil SUM dari MySQL bisa berupa string.
  // Harus dikonversi ke Number sebelum dijumlahkan.
  const existingQty = Number(existing[0].total_qty) || 0;

  console.log("CHECK TICKET LIMIT:", {
    user_id,
    concertId,
    existingQty,
    newQtyInThisCheckout,
    totalAfterCheckout: existingQty + newQtyInThisCheckout,
  });

  if (existingQty + newQtyInThisCheckout > MAX_TICKETS_PER_CONCERT) {
    const sisa = MAX_TICKETS_PER_CONCERT - existingQty;

    throw new Error(
      sisa > 0
        ? `Maksimal ${MAX_TICKETS_PER_CONCERT} tiket per akun untuk concert ini. Sisa kuota kamu: ${sisa} tiket`
        : `Kamu sudah mencapai batas maksimal ${MAX_TICKETS_PER_CONCERT} tiket untuk concert ini`
    );
  }

  const orderCode = generateOrderCode();

  const [order] = await db.query(
    `
    INSERT INTO orders
    (
      user_id,
      order_code,
      total_price,
      status
    )
    VALUES
    (?, ?, ?, 'pending')
    `,
    [user_id, orderCode, totalPrice]
  );

  const orderId = order.insertId;

  for (const item of orderItems) {
    await db.query(
      `
      INSERT INTO order_items
      (
        order_id,
        ticket_category_id,
        quantity,
        price,
        subtotal
      )
      VALUES
      (?, ?, ?, ?, ?)
      `,
      [
        orderId,
        item.ticket_category_id,
        item.quantity,
        item.price,
        item.subtotal,
      ]
    );
  }

  // Notif admin: ada order baru
  try {
    const summary = await getOrderNotifSummary(orderId);

    if (summary) {
      await adminNotificationModel.create({
        order_id: orderId,
        type: "order_created",
        title: "Pesanan Baru",
        message: `${summary.customer_name} membuat pesanan ${summary.order_code} untuk konser "${summary.concert_title}" senilai Rp${Number(summary.total_price).toLocaleString("id-ID")}`,
      });
    }
  } catch (err) {
    console.log("Gagal kirim notif admin (order_created)", err);
  }

  return {
    id: orderId,
    order_code: orderCode,
    total_price: totalPrice,
    status: "pending",
  };
};

// ============================
// GET MY ORDERS
// ============================
const getMyOrders = async (user_id, status = null) => {
  let sql = `
    SELECT *
    FROM orders
    WHERE user_id = ?
  `;

  const params = [user_id];

  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY created_at DESC`;

  const [rows] = await db.query(sql, params);

  return rows;
};

// ============================
// GET ORDER DETAIL
// ============================
const getOrderById = async (id) => {
  const [orders] = await db.query(
    `
    SELECT *
    FROM orders
    WHERE id = ?
    `,
    [id]
  );

  if (orders.length === 0) {
    return null;
  }

  const order = orders[0];

  const [items] = await db.query(
    `
    SELECT
      order_items.*,
      ticket_categories.name AS ticket_category,
      ticket_categories.seat_type AS seat_type,
      concerts.id AS concert_id,
      concerts.title AS concert_title,
      concerts.banner AS concert_banner,
      concerts.location AS concert_location,
      concerts.concert_date AS concert_date,
      concerts.concert_time AS concert_time
    FROM order_items
    JOIN ticket_categories
      ON order_items.ticket_category_id = ticket_categories.id
    JOIN concerts
      ON ticket_categories.concert_id = concerts.id
    WHERE order_items.order_id = ?
    `,
    [id]
  );

  // Ambil data payment
  const [payments] = await db.query(
    `
    SELECT
      payment_method,
      transaction_id,
      payment_status,
      paid_at,
      midtrans_order_id
    FROM payments
    WHERE order_id = ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [id]
  );

  const payment = payments[0] || {};

  return {
    ...order,
    payment_method: payment.payment_method || null,
    payment_status: payment.payment_status || null,
    paid_at: payment.paid_at || null,
    transaction_id: payment.transaction_id || null,
    items,
  };
};

// ============================
// GET ALL ORDERS
// ============================
const getAllOrders = async () => {
  const [rows] = await db.query(
    `
    SELECT
      orders.*,
      users.full_name,
      users.avatar
    FROM orders
    JOIN users
      ON orders.user_id = users.id
    ORDER BY orders.created_at DESC
    `
  );

  return rows;
};

// ============================
// UPDATE STATUS
// ============================
const updateStatus = async (id, status) => {
  await db.query(
    `
    UPDATE orders
    SET status = ?
    WHERE id = ?
    `,
    [status, id]
  );
};

// ============================
// CANCEL ORDER
// ============================
const cancelOrder = async (order_id, user_id) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM orders
    WHERE id = ?
    AND user_id = ?
    `,
    [order_id, user_id]
  );

  if (rows.length === 0) {
    throw new Error("Order tidak ditemukan");
  }

  const order = rows[0];

  if (order.status !== "pending") {
    throw new Error("Order tidak dapat dibatalkan");
  }

  // Lepas kursi yang tadinya locked balik jadi available
  await updateSeatsStatusByOrder(order_id, "available");

  await db.query(
    `
    UPDATE orders
    SET status = 'cancelled'
    WHERE id = ?
    `,
    [order_id]
  );

  // Notif admin: order dibatalin customer
  try {
    const summary = await getOrderNotifSummary(order_id);

    if (summary) {
      await adminNotificationModel.create({
        order_id,
        type: "order_cancelled",
        title: "Pesanan Dibatalkan",
        message: `${summary.customer_name} membatalkan pesanan ${summary.order_code} untuk konser "${summary.concert_title}"`,
      });
    }
  } catch (err) {
    console.log("Gagal kirim notif admin (order_cancelled)", err);
  }

  return true;
};

// ============================
// MARK ORDER AS PAID
// ============================
const markAsPaid = async (midtransOrderId, paymentMethod, transactionId) => {
  const [payments] = await db.query(
    `
    SELECT *
    FROM payments
    WHERE midtrans_order_id = ?
    LIMIT 1
    `,
    [midtransOrderId]
  );

  if (payments.length === 0) {
    throw new Error("Order tidak ditemukan");
  }

  const payment = payments[0];

  const [orders] = await db.query(
    `
    SELECT *
    FROM orders
    WHERE id = ?
    LIMIT 1
    `,
    [payment.order_id]
  );

  if (orders.length === 0) {
    throw new Error("Order tidak ditemukan");
  }

  const order = orders[0];

  // Hindari callback dobel
  if (order.status === "paid") {
    return;
  }

  const [items] = await db.query(
    `
    SELECT *
    FROM order_items
    WHERE order_id = ?
    `,
    [order.id]
  );

  for (const item of items) {
    await db.query(
      `
      UPDATE ticket_categories
      SET
        remaining_quota = remaining_quota - ?,
        tickets_sold = tickets_sold + ?
      WHERE id = ?
      `,
      [item.quantity, item.quantity, item.ticket_category_id]
    );
  }

  // Kursi yang tadinya locked jadi booked karena udah dibayar
  await updateSeatsStatusByOrder(order.id, "booked");

  await db.query(
    `
    UPDATE orders
    SET status = 'paid'
    WHERE id = ?
    `,
    [order.id]
  );

  await db.query(
    `
    UPDATE payments
    SET
      payment_method = ?,
      transaction_id = ?,
      payment_status = 'paid',
      paid_at = NOW()
    WHERE id = ?
    `,
    [paymentMethod, transactionId, payment.id]
  );

  // Notif admin: pembayaran diterima
  try {
    const summary = await getOrderNotifSummary(order.id);

    if (summary) {
      await adminNotificationModel.create({
        order_id: order.id,
        type: "payment_success",
        title: "Pembayaran Diterima",
        message: `${summary.customer_name} berhasil membayar pesanan ${summary.order_code} untuk konser "${summary.concert_title}" (Rp${Number(summary.total_price).toLocaleString("id-ID")})`,
      });
    }
  } catch (err) {
    console.log("Gagal kirim notif admin (payment_success)", err);
  }
};

// ============================
// MARK ORDER AS EXPIRED
// ============================
const markAsExpired = async (midtransOrderId) => {
  const [payments] = await db.query(
    `
    SELECT *
    FROM payments
    WHERE midtrans_order_id = ?
    LIMIT 1
    `,
    [midtransOrderId]
  );

  if (payments.length === 0) {
    throw new Error("Order tidak ditemukan");
  }

  // Lepas kursi yang tadinya locked balik jadi available
  await updateSeatsStatusByOrder(payments[0].order_id, "available");

  await db.query(
    `
    UPDATE orders
    SET status = 'expired'
    WHERE id = ?
    `,
    [payments[0].order_id]
  );

  await db.query(
    `
    UPDATE payments
    SET payment_status = 'expired'
    WHERE id = ?
    `,
    [payments[0].id]
  );
};

// ============================
// MARK ORDER AS CANCELLED
// ============================
const markAsCancelled = async (midtransOrderId) => {
  const [payments] = await db.query(
    `
    SELECT *
    FROM payments
    WHERE midtrans_order_id = ?
    LIMIT 1
    `,
    [midtransOrderId]
  );

  if (payments.length === 0) {
    throw new Error("Order tidak ditemukan");
  }

  // Lepas kursi yang tadinya locked balik jadi available
  await updateSeatsStatusByOrder(payments[0].order_id, "available");

  await db.query(
    `
    UPDATE orders
    SET status = 'cancelled'
    WHERE id = ?
    `,
    [payments[0].order_id]
  );

  await db.query(
    `
    UPDATE payments
    SET payment_status = 'failed'
    WHERE id = ?
    `,
    [payments[0].id]
  );

  // Notif admin: order dibatalin/ditolak
  try {
    const summary = await getOrderNotifSummary(payments[0].order_id);

    if (summary) {
      await adminNotificationModel.create({
        order_id: payments[0].order_id,
        type: "order_cancelled",
        title: "Pesanan Dibatalkan",
        message: `Pembayaran pesanan ${summary.order_code} untuk konser "${summary.concert_title}" dibatalkan/ditolak`,
      });
    }
  } catch (err) {
    console.log("Gagal kirim notif admin (order_cancelled dari midtrans)", err);
  }
};

// ============================
// DELETE ORDER
// ============================
const deleteOrder = async (id) => {
  await db.query(
    `
    DELETE FROM order_items
    WHERE order_id = ?
    `,
    [id]
  );

  await db.query(
    `
    DELETE FROM orders
    WHERE id = ?
    `,
    [id]
  );

  return true;
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateStatus,
  cancelOrder,
  markAsPaid,
  markAsExpired,
  markAsCancelled,
  deleteOrder,
  updateSeatsStatusByOrder,
  getOrderNotifSummary,
};
