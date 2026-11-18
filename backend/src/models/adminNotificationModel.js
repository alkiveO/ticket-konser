const db = require("../config/database");

const create = async ({ order_id, type, title, message }) => {
  await db.query(
    `
    INSERT INTO admin_notifications (order_id, type, title, message)
    VALUES (?, ?, ?, ?)
    `,
    [order_id, type, title, message]
  );
};

const getAll = async () => {
  const [rows] = await db.query(
    `
    SELECT
      an.id,
      an.order_id,
      an.type,
      an.title,
      an.message,
      an.is_read,
      an.created_at,
      orders.order_code,
      orders.total_price,
      users.full_name AS customer_name
    FROM admin_notifications an
    JOIN orders ON orders.id = an.order_id
    JOIN users ON users.id = orders.user_id
    ORDER BY an.created_at DESC
    LIMIT 100
    `
  );
  return rows;
};

const markAllAsRead = async () => {
  await db.query(`UPDATE admin_notifications SET is_read = 1 WHERE is_read = 0`);
};

module.exports = { create, getAll, markAllAsRead };