const db = require("../config/database");

// LOGIN
const login = async (email, password) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM users
    WHERE email = ?
    AND password = ?
    LIMIT 1
    `,
    [email, password]
  );

  return rows[0];
};

// REGISTER
const register = async (full_name, email, password) => {
  const [check] = await db.query(
    `
    SELECT id
    FROM users
    WHERE email = ?
    LIMIT 1
    `,
    [email]
  );

  if (check.length > 0) {
    throw new Error("Email sudah digunakan");
  }

  const [result] = await db.query(
    `
    INSERT INTO users
    (
      full_name,
      email,
      password,
      role
    )
    VALUES
    (?, ?, ?, 'customer')
    `,
    [full_name, email, password]
  );

  return result.insertId;
};

// GET USER BY ID (buat profile, gak include password)
const getById = async (id) => {
  const [rows] = await db.query(
    `
    SELECT id, full_name, email, avatar, role, created_at
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0];
};

// UPDATE NAMA & EMAIL
const updateProfile = async (id, full_name, email) => {
  const [check] = await db.query(
    `
    SELECT id
    FROM users
    WHERE email = ?
    AND id != ?
    LIMIT 1
    `,
    [email, id]
  );

  if (check.length > 0) {
    throw new Error("Email sudah digunakan oleh akun lain");
  }

  await db.query(
    `
    UPDATE users
    SET full_name = ?, email = ?
    WHERE id = ?
    `,
    [full_name, email, id]
  );

  return true;
};

// UPDATE PASSWORD
const updatePassword = async (id, current_password, new_password) => {
  const [rows] = await db.query(
    `
    SELECT password
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  if (rows.length === 0) {
    throw new Error("User tidak ditemukan");
  }

  if (rows[0].password !== current_password) {
    throw new Error("Password saat ini salah");
  }

  await db.query(
    `
    UPDATE users
    SET password = ?
    WHERE id = ?
    `,
    [new_password, id]
  );

  return true;
};

// UPDATE AVATAR (return avatar lama buat dihapus filenya)
const updateAvatar = async (id, avatarPath) => {
  const [rows] = await db.query(
    `
    SELECT avatar
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  await db.query(
    `
    UPDATE users
    SET avatar = ?
    WHERE id = ?
    `,
    [avatarPath, id]
  );

  return rows[0]?.avatar || null;
};

module.exports = {
  login,
  register,
  getById,
  updateProfile,
  updatePassword,
  updateAvatar,
};