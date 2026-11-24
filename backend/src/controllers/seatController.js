
const seatModel = require("../models/seatModel");
const db = require("../config/database");

// ADMIN: generate kursi otomatis
const generateSeats = async (req, res) => {
  try {
    const { ticket_category_id } = req.params;
    const { prefix, max_number } = req.body;

    if (!prefix || !max_number) {
      return res.status(400).json({
        success: false,
        message: "prefix dan max_number wajib diisi",
      });
    }

    const seatPrefixId = await seatModel.createPrefix({
      ticket_category_id,
      prefix,
      max_number,
    });

    const seatRows = [];

    for (let i = 1; i <= max_number; i++) {
      seatRows.push([
        ticket_category_id,
        seatPrefixId,
        `${prefix}${i}`,
        "available",
      ]);
    }

    await seatModel.bulkCreateSeats(seatRows);

    res.status(201).json({
      success: true,
      message: `Berhasil generate ${max_number} kursi untuk prefix ${prefix}`,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Prefix ini sudah pernah dibuat untuk kategori tiket tersebut",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ADMIN: lihat semua kursi dalam satu kategori tiket
const getSeatsByTicketCategory = async (req, res) => {
  try {
    const data = await seatModel.getSeatsByTicketCategory(
      req.params.ticket_category_id
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ADMIN: hapus prefix beserta kursinya
const deletePrefix = async (req, res) => {
  try {
    await seatModel.removePrefix(req.params.id);

    res.json({
      success: true,
      message: "Prefix & kursi terkait berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// USER: ambil gambar denah, posisi prefix, dan data kursi satu concert
const getSeatMapByConcert = async (req, res) => {
  try {
    const { concert_id } = req.params;

    const [seatMapResult, layout, rows] = await Promise.all([
      seatModel.getConcertSeatMap(concert_id),
      seatModel.getPrefixesWithPosition(concert_id),
      seatModel.getSeatsByConcert(concert_id),
    ]);

    const grouped = {};

    for (const row of rows) {
      grouped[row.category_name] = grouped[row.category_name] || {};

      grouped[row.category_name][row.prefix] =
        grouped[row.category_name][row.prefix] || [];

      grouped[row.category_name][row.prefix].push({
        seat_id: row.seat_id,
        seat_prefix_id: row.seat_prefix_id,
        code: row.code,
        status: row.status,
        price: row.price,
      });
    }

    res.json({
      success: true,
      seat_map: seatMapResult?.seat_map || null,
      layout,
      data: grouped,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// USER: pilih kursi untuk satu order_item
const selectSeats = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { order_item_id } = req.params;
    const { seat_ids } = req.body;

    if (!Array.isArray(seat_ids) || seat_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "seat_ids wajib diisi (array)",
      });
    }

    await conn.beginTransaction();

    const [items] = await conn.query(
      "SELECT id, quantity FROM order_items WHERE id = ?",
      [order_item_id]
    );

    if (items.length === 0) {
      await conn.rollback();

      return res.status(404).json({
        success: false,
        message: "Order item tidak ditemukan",
      });
    }

    if (seat_ids.length !== items[0].quantity) {
      await conn.rollback();

      return res.status(400).json({
        success: false,
        message: `Jumlah kursi harus sesuai quantity (${items[0].quantity})`,
      });
    }

    const placeholders = seat_ids.map(() => "?").join(",");

    const [seats] = await conn.query(
      `SELECT id, status FROM seats WHERE id IN (${placeholders}) FOR UPDATE`,
      seat_ids
    );

    if (seats.length !== seat_ids.length) {
      await conn.rollback();

      return res.status(404).json({
        success: false,
        message: "Ada seat_id yang tidak valid",
      });
    }

    const notAvailable = seats.filter((s) => s.status !== "available");

    if (notAvailable.length > 0) {
      await conn.rollback();

      return res.status(409).json({
        success: false,
        message: "Ada kursi yang sudah tidak tersedia",
        seat_ids: notAvailable.map((s) => s.id),
      });
    }

    await conn.query(
      `UPDATE seats SET status = 'locked' WHERE id IN (${placeholders})`,
      seat_ids
    );

    const values = seat_ids.map((seatId) => [order_item_id, seatId]);

    await conn.query(
      "INSERT INTO order_item_seats (order_item_id, seat_id) VALUES ?",
      [values]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Kursi berhasil dipilih & dikunci",
      seat_ids,
    });
  } catch (error) {
    await conn.rollback();

    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    conn.release();
  }
};

// ADMIN: update prefix dan jumlah kursi
const updatePrefix = async (req, res) => {
  const { id } = req.params;
  const { prefix, max_number } = req.body;

  if (!prefix || !max_number) {
    return res.status(400).json({
      success: false,
      message: "prefix dan max_number wajib diisi",
    });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [prefixRows] = await conn.query(
      "SELECT * FROM seat_prefixes WHERE id = ? FOR UPDATE",
      [id]
    );

    if (prefixRows.length === 0) {
      await conn.rollback();

      return res.status(404).json({
        success: false,
        message: "Prefix tidak ditemukan",
      });
    }

    const oldPrefix = prefixRows[0];
    const newPrefix = prefix.toUpperCase();
    const newMax = Number(max_number);

    const [existingSeats] = await conn.query(
      "SELECT id, code, status FROM seats WHERE seat_prefix_id = ? ORDER BY id ASC",
      [id]
    );

    if (newMax < existingSeats.length) {
      const seatsToRemove = existingSeats.slice(newMax);
      const notAvailable = seatsToRemove.filter(
        (s) => s.status !== "available"
      );

      if (notAvailable.length > 0) {
        await conn.rollback();

        return res.status(409).json({
          success: false,
          message:
            "Tidak bisa mengurangi kursi karena ada kursi yang sudah dipilih/booked",
        });
      }

      const idsToRemove = seatsToRemove.map((s) => s.id);

      await conn.query(
        `DELETE FROM seats WHERE id IN (${idsToRemove
          .map(() => "?")
          .join(",")})`,
        idsToRemove
      );
    }

    await conn.query(
      "UPDATE seat_prefixes SET prefix = ?, max_number = ? WHERE id = ?",
      [newPrefix, newMax, id]
    );

    await conn.query(
      `UPDATE seats
       SET code = CONCAT(?, SUBSTRING(code, LENGTH(?) + 1))
       WHERE seat_prefix_id = ?`,
      [newPrefix, oldPrefix.prefix, id]
    );

    if (newMax > existingSeats.length) {
      const newSeats = [];

      for (
        let i = existingSeats.length + 1;
        i <= newMax;
        i++
      ) {
        newSeats.push([
          oldPrefix.ticket_category_id,
          id,
          `${newPrefix}${i}`,
          "available",
        ]);
      }

      await conn.query(
        "INSERT INTO seats (ticket_category_id, seat_prefix_id, code, status) VALUES ?",
        [newSeats]
      );
    }

    await conn.commit();

    res.json({
      success: true,
      message: "Kursi berhasil diupdate",
    });
  } catch (error) {
    await conn.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Huruf tersebut sudah dipakai di kategori ini",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    conn.release();
  }
};

// ADMIN: simpan posisi prefix di atas gambar denah
const updatePrefixPosition = async (req, res) => {
  try {
    const { pos_x, pos_y } = req.body;

    await seatModel.updatePrefixPosition(req.params.id, {
      pos_x,
      pos_y,
    });

    res.json({
      success: true,
      message: "Posisi kursi berhasil disimpan",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ADMIN: ambil semua prefix dan posisinya
const getSeatMapLayout = async (req, res) => {
  try {
    const data = await seatModel.getPrefixesWithPosition(
      req.params.concert_id
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  generateSeats,
  getSeatsByTicketCategory,
  deletePrefix,
  getSeatMapByConcert,
  selectSeats,
  updatePrefix,
  updatePrefixPosition,
  getSeatMapLayout,
};
