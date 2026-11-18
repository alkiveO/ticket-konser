const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const genreRoutes = require("./routes/genreRoutes");
const artistRoutes = require("./routes/artistRoutes");
const ticketCategoryRoutes = require("./routes/ticketCategoryRoutes");
const concertRoutes = require("./routes/concertRoutes");
const concertArtistRoutes = require("./routes/concertArtistRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const seatRoutes = require("./routes/seatRoutes");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Serve folder public/uploads sebagai static file
// Supaya foto artist bisa diakses lewat: http://localhost:<port>/uploads/artists/nama-file.jpg
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// Default Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Concert Ticket API is Running ",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/genres", genreRoutes);
app.use("/api/artists", artistRoutes);
app.use("/api/ticket-categories", ticketCategoryRoutes);
app.use("/api/concerts", concertRoutes);
app.use("/api/concert-artists", concertArtistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api", seatRoutes);
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/admin-notifications", require("./routes/adminNotificationRoutes"));


module.exports = app;