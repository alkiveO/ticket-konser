const db = require("../config/database");

const getAll = async () => {
  const [rows] = await db.query(`
    SELECT
      concerts.*,
      users.full_name AS created_by_name,

      GROUP_CONCAT(
        DISTINCT artists.name
        ORDER BY artists.name
        SEPARATOR ', '
      ) AS artists,

      COUNT(DISTINCT artists.id) AS total_artists,

      ticket_summary.lowest_price,
      ticket_summary.total_quota,
      ticket_summary.tickets_sold

    FROM concerts

    LEFT JOIN users
      ON concerts.created_by = users.id

    LEFT JOIN concert_artists
      ON concerts.id = concert_artists.concert_id

    LEFT JOIN artists
      ON concert_artists.artist_id = artists.id

    LEFT JOIN (
      SELECT
        concert_id,
        MIN(price) AS lowest_price,
        SUM(quota) AS total_quota,
        SUM(quota - remaining_quota) AS tickets_sold
      FROM ticket_categories
      GROUP BY concert_id
    ) AS ticket_summary
      ON concerts.id = ticket_summary.concert_id

    GROUP BY concerts.id, ticket_summary.lowest_price, ticket_summary.total_quota, ticket_summary.tickets_sold

    ORDER BY concerts.concert_date ASC
  `);

  return rows;
};

const getById = async (id) => {
  // Data Concert
  const [concertRows] = await db.query(
    `
    SELECT
      concerts.*,
      users.full_name AS created_by_name
    FROM concerts
    LEFT JOIN users
      ON concerts.created_by = users.id
    WHERE concerts.id = ?
    `,
    [id]
  );

  if (concertRows.length === 0) {
    return null;
  }

  const concert = concertRows[0];

  // Artist yang tampil di konser
  const [artists] = await db.query(
    `
    SELECT
      artists.id,
      artists.name,
      artists.photo,
      artists.description,
      genres.name AS genre
    FROM concert_artists
    JOIN artists
      ON concert_artists.artist_id = artists.id
    LEFT JOIN genres
      ON artists.genre_id = genres.id
    WHERE concert_artists.concert_id = ?
    `,
    [id]
  );

  // Ticket Categories
const [ticketCategories] = await db.query(
  `
  SELECT
    id,
    name,
    seat_type,
    price,
    quota,
    remaining_quota,
    tickets_sold
  FROM ticket_categories
  WHERE concert_id = ?
  ORDER BY price ASC
  `,
  [id]
);

  return {
    ...concert,
    artists,
    ticket_categories: ticketCategories,
  };
};

const create = async ({
  title,
  description,
  banner,
  seat_map,
  location,
  concert_date,
  concert_time,
  concert_type,
  status,
  created_by,
}) => {
  const [result] = await db.query(
    `
    INSERT INTO concerts
    (
      title,
      description,
      banner,
      seat_map,
      location,
      concert_date,
      concert_time,
      concert_type,
      status,
      created_by
    )
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      title,
      description,
      banner,
      seat_map,
      location,
      concert_date,
      concert_time,
      concert_type,
      status,
      created_by,
    ]
  );

  return result.insertId;
};

const update = async (
  id,
  {
    title,
    description,
    banner,
    seat_map,
    location,
    concert_date,
    concert_time,
    concert_type,
    status,
  }
) => {
  await db.query(
    `
    UPDATE concerts
    SET
      title = ?,
      description = ?,
      banner = ?,
      seat_map = ?,
      location = ?,
      concert_date = ?,
      concert_time = ?,
      concert_type = ?,
      status = ?
    WHERE id = ?
    `,
    [
      title,
      description,
      banner,
      seat_map,
      location,
      concert_date,
      concert_time,
      concert_type,
      status,
      id,
    ]
  );
};

const remove = async (id) => {
  await db.query(
    `
    DELETE FROM concerts
    WHERE id = ?
    `,
    [id]
  );
};

const updateSeatMap = async (id, seat_map) => {
  await db.query(`UPDATE concerts SET seat_map = ? WHERE id = ?`, [seat_map, id]);
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  updateSeatMap,
};