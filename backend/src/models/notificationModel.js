const db = require("../config/database");

const create = async ({ concert_id, type, title, message, target, created_by }) => {
  const [result] = await db.query(
    `
    INSERT INTO notifications
    (concert_id, type, title, message, target, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [concert_id, type, title, message, target, created_by]
  );

  const notificationId = result.insertId;

  let recipients;

  if (target === "buyers") {
    // User yang udah bayar tiket concert ini
    const [rows] = await db.query(
      `
      SELECT DISTINCT o.user_id
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN ticket_categories tc ON tc.id = oi.ticket_category_id
      WHERE tc.concert_id = ? AND o.status = 'paid'
      `,
      [concert_id]
    );
    recipients = rows;
  } else {
    // Semua customer
    const [rows] = await db.query(
      `SELECT id AS user_id FROM users WHERE role = 'customer'`
    );
    recipients = rows;
  }

  if (recipients.length > 0) {
    const values = recipients.map((r) => [notificationId, r.user_id]);
    await db.query(
      `INSERT INTO notification_recipients (notification_id, user_id) VALUES ?`,
      [values]
    );
  }

  return { id: notificationId, total_recipients: recipients.length };
};

const getMyNotifications = async (user_id) => {
  const [rows] = await db.query(
    `
    SELECT
      n.id,
      n.type,
      n.title,
      n.message,
      n.created_at,
      nr.is_read,
      concerts.id AS concert_id,
      concerts.title AS concert_title,
      concerts.banner AS concert_banner,
      users.full_name AS admin_name
    FROM notification_recipients nr
    JOIN notifications n ON n.id = nr.notification_id
    JOIN concerts ON concerts.id = n.concert_id
    JOIN users ON users.id = n.created_by
    WHERE nr.user_id = ?
    ORDER BY n.created_at DESC
    `,
    [user_id]
  );

  return rows;
};

const getUnreadCount = async (user_id) => {
  const [rows] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM notification_recipients
    WHERE user_id = ? AND is_read = 0
    `,
    [user_id]
  );
  return rows[0].total;
};

const markAsRead = async (notification_id, user_id) => {
  await db.query(
    `
    UPDATE notification_recipients
    SET is_read = 1
    WHERE notification_id = ? AND user_id = ?
    `,
    [notification_id, user_id]
  );
};

const getByConcert = async (concert_id) => {
  const [rows] = await db.query(
    `SELECT * FROM notifications WHERE concert_id = ? ORDER BY created_at DESC`,
    [concert_id]
  );
  return rows;
};

const markAllAsRead = async (user_id) => {
  await db.query(
    `
    UPDATE notification_recipients
    SET is_read = 1
    WHERE user_id = ? AND is_read = 0
    `,
    [user_id]
  );
};

module.exports = {
  create,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  getByConcert,
  markAllAsRead,
};