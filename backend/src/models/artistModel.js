const db = require("../config/database");

const getAll = async () => {
  const [rows] = await db.query(`
    SELECT
      artists.id,
      artists.name,
      artists.description,
      artists.photo,
      genres.id AS genre_id,
      genres.name AS genre_name
    FROM artists
    JOIN genres ON artists.genre_id = genres.id
    ORDER BY artists.id DESC
  `);

  return rows;
};

const getById = async (id) => {
  const [rows] = await db.query(
    `
    SELECT
      artists.id,
      artists.name,
      artists.description,
      artists.photo,
      genres.id AS genre_id,
      genres.name AS genre_name
    FROM artists
    JOIN genres ON artists.genre_id = genres.id
    WHERE artists.id = ?
    `,
    [id]
  );

  return rows[0];
};

const create = async ({ genre_id, name, description, photo }) => {
  const [result] = await db.query(
    `
    INSERT INTO artists
    (genre_id, name, description, photo)
    VALUES (?, ?, ?, ?)
    `,
    [genre_id, name, description, photo]
  );

  return result.insertId;
};

const update = async (id, { genre_id, name, description, photo }) => {
  await db.query(
    `
    UPDATE artists
    SET
      genre_id = ?,
      name = ?,
      description = ?,
      photo = ?
    WHERE id = ?
    `,
    [genre_id, name, description, photo, id]
  );
};

const remove = async (id) => {
  await db.query(
    `
    DELETE FROM artists
    WHERE id = ?
    `,
    [id]
  );
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};