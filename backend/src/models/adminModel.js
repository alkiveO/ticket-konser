const db = require("../config/database");

// ============================
// GET ALL USERS (admin + customer)
// ============================
const getAllAdmins = async () => {
  const [rows] = await db.query(
    "SELECT id, full_name, email, avatar, role, created_at FROM users ORDER BY role ASC, created_at DESC"
  );

  return rows;
};

// ============================
// GET ADMIN BY ID
// ============================
const getAdminById = async (id) => {
  const [rows] = await db.query(
    "SELECT id, full_name, email, role FROM users WHERE id=?",
    [id]
  );

  return rows[0];
};

// ============================
// CREATE ADMIN
// ============================
const createAdmin = async (data) => {
  const sql = `
    INSERT INTO users
    (full_name,email,password,role)
    VALUES (?,?,?,?)
  `;

  const [result] = await db.query(sql, [
    data.full_name,
    data.email,
    data.password,
    "admin",
  ]);

  return result;
};

// ============================
// UPDATE ADMIN
// ============================
const updateAdmin = async (id, data) => {
  const sql = `
    UPDATE users
    SET full_name=?, email=?, password=?
    WHERE id=?
  `;

  const [result] = await db.query(sql, [
    data.full_name,
    data.email,
    data.password,
    id,
  ]);

  return result;
};

// ============================
// DELETE USER (admin/customer, satu tabel sama)
// ============================
const deleteAdmin = async (id) => {
  const [result] = await db.query(
    "DELETE FROM users WHERE id=?",
    [id]
  );

  return result;
};

// ============================
// DASHBOARD
// ============================
const dashboard = async () => {
  const [[concert]] = await db.query(
    "SELECT COUNT(*) AS total FROM concerts"
  );

  const [[artist]] = await db.query(
    "SELECT COUNT(*) AS total FROM artists"
  );

  const [[genre]] = await db.query(
    "SELECT COUNT(*) AS total FROM genres"
  );

  const [[ticketsSold]] = await db.query(`
    SELECT IFNULL(SUM(order_items.quantity),0) AS total
    FROM order_items
    JOIN orders ON orders.id = order_items.order_id
    WHERE orders.status = 'paid'
  `);

  const [[revenue]] = await db.query(`
    SELECT IFNULL(SUM(total_price),0) AS total
    FROM orders
    WHERE status='paid'
  `);

  const [recentOrders] = await db.query(`
  SELECT
    orders.id,
    orders.order_code,
    users.full_name,
    users.avatar,
    orders.total_price,
    orders.status,
    orders.created_at,
    MIN(concerts.title) AS concert_title
  FROM orders
  JOIN users
    ON users.id = orders.user_id
  LEFT JOIN order_items
    ON order_items.order_id = orders.id
  LEFT JOIN ticket_categories
    ON ticket_categories.id = order_items.ticket_category_id
  LEFT JOIN concerts
    ON concerts.id = ticket_categories.concert_id
  GROUP BY orders.id
  ORDER BY orders.created_at DESC
  LIMIT 5
`);

  const [monthlyStatsRaw] = await db.query(`
    SELECT
      DATE_FORMAT(orders.created_at, '%Y-%m-%d') AS ymd,
      DATE_FORMAT(orders.created_at, '%d %b') AS label,
      IFNULL(SUM(order_items.quantity),0) AS tickets,
      IFNULL(SUM(CASE WHEN orders.status='paid' THEN orders.total_price ELSE 0 END),0) AS revenue
    FROM orders
    LEFT JOIN order_items
      ON order_items.order_id = orders.id
    WHERE orders.created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
    GROUP BY ymd, label
    ORDER BY ymd ASC
  `);

  const monthly_stats = monthlyStatsRaw.map((row) => ({
    month: row.label,
    tickets: Number(row.tickets),
    revenue: Number(row.revenue) / 1000000,
  }));

  const [upcomingConcerts] = await db.query(`
    SELECT id, title, location AS venue, concert_date AS date, banner
    FROM concerts
    WHERE concert_date >= CURDATE()
    ORDER BY concert_date ASC
    LIMIT 5
  `);

  return {
    total_concert: concert.total,
    total_artist: artist.total,
    total_genre: genre.total,
    total_order: ticketsSold.total,
    total_revenue: revenue.total,
    recent_orders: recentOrders,
    monthly_stats,
    upcoming_concerts: upcomingConcerts,
  };
};

module.exports = {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  dashboard,
};