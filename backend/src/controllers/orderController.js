const orderModel = require("../models/orderModel");

// ============================
// CHECKOUT
// ============================
const checkout = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items tidak boleh kosong",
      });
    }

    const order = await orderModel.createOrder(
      req.user.id,
      items
    );

    res.status(201).json({
      success: true,
      message: "Order berhasil dibuat",
      data: order,
    });
  } catch (error) {
    console.error("CHECKOUT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================
// GET MY ORDERS
// ============================
const getMyOrders = async (req, res) => {
  try {
    const { status } = req.query;

    const orders = await orderModel.getMyOrders(
      req.user.id,
      status
    );

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================
// GET ORDER DETAIL
// ============================
const getOrderDetail = async (req, res) => {
  try {
    const order = await orderModel.getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan",
      });
    }

    // Customer hanya boleh melihat order miliknya
    if (
      req.user.role === "customer" &&
      order.user_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================
// GET ALL ORDERS (ADMIN)
// ============================
const getAllOrders = async (req, res) => {
  try {
    const orders = await orderModel.getAllOrders();

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================
// UPDATE STATUS (ADMIN)
// ============================
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatus = [
      "pending",
      "paid",
      "cancelled",
      "expired",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status tidak valid",
      });
    }

    await orderModel.updateStatus(
      req.params.id,
      status
    );

    res.json({
      success: true,
      message: "Status order berhasil diupdate",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================
// CANCEL ORDER
// ============================
const cancelOrder = async (req, res) => {
  try {
    await orderModel.cancelOrder(
      req.params.id,
      req.user.id
    );

    res.json({
      success: true,
      message: "Order berhasil dibatalkan",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteOrder = async (req, res) => {
  try {
    await orderModel.deleteOrder(req.params.id);

    res.json({
      success: true,
      message: "Order berhasil dihapus",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  checkout,
  getMyOrders,
  getOrderDetail,
  getAllOrders,
  updateStatus,
  cancelOrder,
  deleteOrder,
};