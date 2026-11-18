const db = require("../config/database");

const getPrefixesByTicketCategory = async (ticket_category_id) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM seat_prefixes
    WHERE ticket_category_id = ?
    ORDER BY prefix ASC
    `,
    [ticket_category_id]
  );

  return rows;
};

const createPrefix = async ({ ticket_category_id, prefix, max_number }) => {
  const [result] = await db.query(
    `
    INSERT INTO seat_prefixes
    (ticket_category_id, prefix, max_number)
    VALUES (?, ?, ?)
    `,
    [ticket_category_id, prefix, max_number]
  );

  return result.insertId;
};

const removePrefix = async (id) => {
  await db.query(
    `
    DELETE FROM seat_prefixes
    WHERE id = ?
    `,
    [id]
  );
};

const bulkCreateSeats = async (seatRows) => {
  // seatRows = [[ticket_category_id, seat_prefix_id, code, 'available'], ...]
  const [result] = await db.query(
    `
    INSERT INTO seats
    (ticket_category_id, seat_prefix_id, code, status)
    VALUES ?
    `,
    [seatRows]
  );

  return result.affectedRows;
};

const getSeatsByTicketCategory = async (ticket_category_id) => {
  const [rows] = await db.query(
    `
    SELECT
      seats.id,
      seats.code,
      seats.status,
      seat_prefixes.id AS seat_prefix_id,
      seat_prefixes.prefix,
      seat_prefixes.max_number
    FROM seats
    JOIN seat_prefixes
      ON seats.seat_prefix_id = seat_prefixes.id
    WHERE seats.ticket_category_id = ?
    ORDER BY seat_prefixes.prefix ASC, seats.id ASC
    `,
    [ticket_category_id]
  );

  return rows;
};

const getSeatsByConcert = async (concert_id) => {
  const [rows] = await db.query(
    `
    SELECT
      ticket_categories.id AS ticket_category_id,
      ticket_categories.name AS category_name,
      ticket_categories.price,
      seats.id AS seat_id,
      seats.code,
      seats.status,
      seat_prefixes.prefix
    FROM ticket_categories
    JOIN seats
      ON seats.ticket_category_id = ticket_categories.id
    JOIN seat_prefixes
      ON seat_prefixes.id = seats.seat_prefix_id
    WHERE ticket_categories.concert_id = ?
    ORDER BY ticket_categories.id ASC, seat_prefixes.prefix ASC, seats.id ASC
    `,
    [concert_id]
  );

  return rows;
};

const getSeatsByIds = async (ids) => {
  const placeholders = ids.map(() => "?").join(",");

  const [rows] = await db.query(
    `
    SELECT id, status
    FROM seats
    WHERE id IN (${placeholders})
    FOR UPDATE
    `,
    ids
  );

  return rows;
};

const updateSeatsStatus = async (ids, status) => {
  const placeholders = ids.map(() => "?").join(",");

  await db.query(
    `
    UPDATE seats
    SET status = ?
    WHERE id IN (${placeholders})
    `,
    [status, ...ids]
  );
};

const getPrefixById = async (id) => {
  const [rows] = await db.query(
    `SELECT * FROM seat_prefixes WHERE id = ?`,
    [id]
  );
  return rows[0];
};

const getSeatsByPrefixId = async (seat_prefix_id) => {
  const [rows] = await db.query(
    `SELECT id, code, status FROM seats WHERE seat_prefix_id = ? ORDER BY id ASC`,
    [seat_prefix_id]
  );
  return rows;
};

const updatePrefixPosition = async (id, { pos_x, pos_y }) => {
  await db.query(
    `UPDATE seat_prefixes SET pos_x = ?, pos_y = ? WHERE id = ?`,
    [pos_x, pos_y, id]
  );
};

const getPrefixesWithPosition = async (concert_id) => {
  const [rows] = await db.query(
    `
    SELECT
      seat_prefixes.id,
      seat_prefixes.prefix,
      seat_prefixes.max_number,
      seat_prefixes.pos_x,
      seat_prefixes.pos_y,
      ticket_categories.id AS ticket_category_id,
      ticket_categories.name AS category_name
    FROM seat_prefixes
    JOIN ticket_categories ON ticket_categories.id = seat_prefixes.ticket_category_id
    WHERE ticket_categories.concert_id = ?
    `,
    [concert_id]
  );
  return rows;
};

module.exports = {
  getPrefixesByTicketCategory,
  createPrefix,
  removePrefix,
  bulkCreateSeats,
  getSeatsByTicketCategory,
  getSeatsByConcert,
  getSeatsByIds,
  updateSeatsStatus,
  getPrefixById,
  getSeatsByPrefixId,
  updatePrefixPosition,
  getPrefixesWithPosition,
};