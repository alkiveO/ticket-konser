const db = require("../config/database");

const getAll = async () => {
  const [rows] = await db.query(`
    SELECT
      tc.*,
      c.title AS concert_title
    FROM ticket_categories tc
    JOIN concerts c
      ON tc.concert_id = c.id
    ORDER BY tc.id DESC
  `);

  return rows;
};

const getById = async (id) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM ticket_categories
    WHERE id = ?
    `,
    [id]
  );

  return rows[0];
};

const create = async ({
  concert_id,
  name,
  seat_type,
  price,
  quota,
  remaining_quota,
}) => {
  const [result] = await db.query(
    `
    INSERT INTO ticket_categories
    (
      concert_id,
      name,
      seat_type,
      price,
      quota,
      remaining_quota,
      tickets_sold
    )
    VALUES
    (?, ?, ?, ?, ?, ?, 0)
    `,
    [
      concert_id,
      name,
      seat_type,
      price,
      quota,
      remaining_quota,
    ]
  );

  return result.insertId;
};

const update = async (
  id,
  {
    concert_id,
    name,
    seat_type,
    price,
    quota,
    remaining_quota,
  }
) => {
  await db.query(
    `
    UPDATE ticket_categories
    SET
      concert_id = ?,
      name = ?,
      seat_type = ?,
      price = ?,
      quota = ?,
      remaining_quota = ?
    WHERE id = ?
    `,
    [
      concert_id,
      name,
      seat_type,
      price,
      quota,
      remaining_quota,
      id,
    ]
  );
};

const remove = async (id) => {
  await db.query(
    `
    DELETE FROM ticket_categories
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