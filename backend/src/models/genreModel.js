const db = require("../config/database");

// GET semua genre
const getAllGenres = async () => {
  const [rows] = await db.query("SELECT * FROM genres ORDER BY id ASC");
  return rows;
};

// GET genre berdasarkan ID
const getGenreById = async (id) => {
  const [rows] = await db.query("SELECT * FROM genres WHERE id = ?", [id]);
  return rows[0];
};

// Tambah genre
const createGenre = async (name) => {
  const [result] = await db.query(
    "INSERT INTO genres (name) VALUES (?)",
    [name]
  );
  return result.insertId;
};

// Update genre
const updateGenre = async (id, name) => {
  await db.query("UPDATE genres SET name = ? WHERE id = ?", [name, id]);
};

// Hapus genre
const deleteGenre = async (id) => {
  await db.query("DELETE FROM genres WHERE id = ?", [id]);
};

module.exports = {
  getAllGenres,
  getGenreById,
  createGenre,
  updateGenre,
  deleteGenre,
};