const db = require("../config/database");

// GET
const getByConcert = async (concert_id) => {
  const [rows] = await db.query(
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
    [concert_id]
  );

  return rows;
};

// POST
const assignArtists = async (concert_id, artist_ids) => {
  for (const artist_id of artist_ids) {
    await db.query(
      `
      INSERT INTO concert_artists
      (concert_id, artist_id)
      VALUES (?, ?)
      `,
      [concert_id, artist_id]
    );
  }
};

// PUT
const updateArtists = async (concert_id, artist_ids) => {
  await db.query(
    "DELETE FROM concert_artists WHERE concert_id = ?",
    [concert_id]
  );

  for (const artist_id of artist_ids) {
    await db.query(
      `
      INSERT INTO concert_artists
      (concert_id, artist_id)
      VALUES (?, ?)
      `,
      [concert_id, artist_id]
    );
  }
};

// DELETE
const deleteArtist = async (concert_id, artist_id) => {
  await db.query(
    `
    DELETE FROM concert_artists
    WHERE concert_id = ?
    AND artist_id = ?
    `,
    [concert_id, artist_id]
  );
};

module.exports = {
  getByConcert,
  assignArtists,
  updateArtists,
  deleteArtist,
};