"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/services/api";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

import {
  FaHome,
  FaMusic,
  FaUsers,
  FaTags,
  FaTicketAlt,
  FaShoppingCart,
  FaEye,
  FaTrash,
  FaSearch,
  FaSignOutAlt,
  FaTimes,
  FaUserShield,
  FaFileDownload,
  FaCheckCircle,
  FaFilter,
  FaSyncAlt,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaChevronDown,
} from "react-icons/fa";

const STATUS_OPTIONS = ["pending", "paid", "cancelled", "expired"];

const STATUS_STYLE = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  paid: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  cancelled: "bg-white/10 text-gray-400 border border-white/10",
  expired: "bg-red-500/15 text-red-400 border border-red-500/20",
};

const STATUS_LABEL = {
  pending: "MENUNGGU",
  paid: "DIBAYAR",
  cancelled: "DIBATALKAN",
  expired: "KEDALUWARSA",
};

const AVATAR_STYLES = [
  "from-violet-600 to-fuchsia-600",
  "from-sky-500 to-blue-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
];

// Base URL backend (bukan yang ada /api-nya), buat gabungin path file statis
// seperti poster konser (misal "uploads/posters/xxx.jpg") jadi URL lengkap.
const API_BASE = "http://localhost:3000";

// Gabungin path relatif dari backend (mis. "uploads/posters/xxx.jpg")
// menjadi URL absolut. Kalau sudah URL lengkap (http...), dipakai apa adanya.
const resolveFileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE}/${path.replace(/^\/+/, "")}`;
};

// Avatar user sudah tersimpan dengan path diawali "/", jadi tinggal
// digabung langsung tanpa nambah "/" lagi (beda dari resolveFileUrl di atas).
const getAvatarUrl = (avatar) => {
  if (!avatar) return null;
  if (avatar.startsWith("http")) return avatar;
  return `${API_BASE}${avatar}`;
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
};

const formatRupiah = (value) => {
  const num = Number(value) || 0;
  return num.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

// Ambil info konser dari item pertama di order.
// Field ini datang dari JOIN concerts di orderModel.getOrderById():
// concert_title, concert_location, concert_date, concert_banner
const getConcertInfo = (detail) => {
  if (!detail?.items?.length) return null;

  const item = detail.items[0];

  if (!item.concert_title) return null;

  return {
    name: item.concert_title,
    venue: item.concert_location,
    date: item.concert_date,
    poster: item.concert_banner,
  };
};

const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

// ==== Swal styling, disamakan persis dengan halaman Artist ====
const SWAL_BASE_STYLE = `
  .cx-popup { background:#141420 !important; border:1px solid rgba(255,255,255,0.08) !important; border-radius:24px !important; padding-bottom:1.75rem !important; }
  .cx-title { color:#fff !important; font-weight:800 !important; }
  .cx-text { color:#9ca3af !important; font-size:0.875rem !important; }
  .cx-actions { gap:12px !important; }
  .cx-btn { border-radius:12px !important; font-size:0.875rem !important; font-weight:600 !important; padding:11px 22px !important; box-shadow:none !important; transition:filter .15s !important; }
  .cx-btn:hover { filter:brightness(1.1); }
  .cx-btn-cancel { background:rgba(255,255,255,0.06) !important; color:#e5e7eb !important; }
  .cx-btn-confirm-violet { background:linear-gradient(90deg,#7c3aed,#d946ef) !important; color:#fff !important; box-shadow:0 10px 25px -8px rgba(124,58,237,0.5) !important; }
  .cx-btn-confirm-danger { background:linear-gradient(90deg,#dc2626,#e11d48) !important; color:#fff !important; box-shadow:0 10px 25px -8px rgba(220,38,38,0.5) !important; }
`;

const deleteIconHtml = `
  <div style="width:64px;height:64px;border-radius:9999px;background:rgba(239,68,68,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/>
    </svg>
  </div>
`;

const successIconHtml = `
  <div style="width:64px;height:64px;border-radius:9999px;background:rgba(16,185,129,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  </div>
`;

const errorIconHtml = `
  <div style="width:64px;height:64px;border-radius:9999px;background:rgba(239,68,68,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  </div>
`;

const infoIconHtml = `
  <div style="width:64px;height:64px;border-radius:9999px;background:rgba(56,189,248,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"/>
    </svg>
  </div>
`;

function injectSwalStyle() {
  if (document.getElementById("cx-swal-style")) return;
  const style = document.createElement("style");
  style.id = "cx-swal-style";
  style.innerHTML = SWAL_BASE_STYLE;
  document.head.appendChild(style);
}

export default function OrderPage() {
  const router = useRouter();

  // ----- data & UI state -----
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ----- detail modal state -----
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [refreshingDetail, setRefreshingDetail] = useState(false);

  // Semua hook di atas, sebelum early return apapun.
  useEffect(() => {
    getOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getOrders = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/");
        return;
      }

      const res = await api.get("/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOrders(res.data.data || []);
    } catch (err) {
      Swal.fire({
        html: `${errorIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Gagal memuat data</p><p class="cx-text">Data order tidak berhasil diambil dari server.</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Mengerti",
        didOpen: injectSwalStyle,
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return orders.filter((item) => {
      const orderCode = item.order_code?.toLowerCase() ?? "";
      const customer = item.full_name?.toLowerCase() ?? "";

      const matchKeyword =
        !keyword ||
        orderCode.includes(keyword) ||
        customer.includes(keyword);

      const matchStatus = !statusFilter || item.status === statusFilter;

      return matchKeyword && matchStatus;
    });
  }, [orders, search, statusFilter]);

  // Ekspor CSV murni client-side dari data yang sedang tampil (hasil search/filter).
  const exportCSV = () => {
    if (filtered.length === 0) {
      Swal.fire({
        html: `${infoIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Tidak ada data</p><p class="cx-text">Tidak ada order untuk diekspor.</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Oke",
        didOpen: injectSwalStyle,
      });
      return;
    }

    const headers = ["Order Code", "Customer", "Total", "Status", "Created At"];
    const rows = filtered.map((item) => [
      item.order_code,
      item.full_name,
      item.total_price,
      item.status,
      item.created_at,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // Placeholder: belum ada endpoint validasi tiket (scan/check-in) di backend.
  const openValidasiTiket = () => {
    Swal.fire({
      html: `${infoIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Validasi Tiket</p><p class="cx-text">Fitur scan / validasi tiket belum tersambung ke backend. Perlu endpoint check-in dulu sebelum ini bisa aktif.</p>`,
      background: "#141420",
      buttonsStyling: false,
      customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
      confirmButtonText: "Mengerti",
      didOpen: injectSwalStyle,
    });
  };

  const openDetail = async (id) => {
    setShowDetail(true);
    setDetailLoading(true);
    setDetail(null);

    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDetail(res.data.data);
    } catch (err) {
      Swal.fire({
        html: `${errorIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Gagal memuat detail</p><p class="cx-text">${
          err.response?.data?.message || "Gagal mengambil detail order."
        }</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Mengerti",
        didOpen: injectSwalStyle,
      });
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Status cuma berubah otomatis lewat webhook Midtrans (lihat paymentController.handleNotification).
  // Tombol ini cuma re-fetch detail order dari DB, bukan ngubah status manual.
  const refreshDetailStatus = async () => {
    if (!detail) return;
    setRefreshingDetail(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/orders/${detail.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDetail(res.data.data);
      await getOrders();
    } catch (err) {
      Swal.fire({
        html: `${errorIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Gagal refresh</p><p class="cx-text">Gagal refresh status order.</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Mengerti",
        didOpen: injectSwalStyle,
      });
    } finally {
      setRefreshingDetail(false);
    }
  };

  const closeDetail = () => {
    setShowDetail(false);
    setDetail(null);
  };

  const deleteOrder = async (id) => {
    const result = await Swal.fire({
      html: `
        ${deleteIconHtml}
        <p class="cx-title" style="font-size:1.25rem;margin-bottom:6px;">Hapus order ini?</p>
        <p class="cx-text">Data order beserta item-nya akan dihapus permanen.</p>
      `,
      showCancelButton: true,
      buttonsStyling: false,
      reverseButtons: true,
      background: "#141420",
      customClass: {
        popup: "cx-popup",
        actions: "cx-actions",
        confirmButton: "cx-btn cx-btn-confirm-danger",
        cancelButton: "cx-btn cx-btn-cancel",
      },
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      didOpen: injectSwalStyle,
    });

    if (!result.isConfirmed) return;

    setDeletingId(id);
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Swal.fire({
        html: `${successIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Order dihapus</p><p class="cx-text">Data berhasil dihapus dari sistem.</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Oke",
        timer: 1800,
        didOpen: injectSwalStyle,
      });
      await getOrders();
    } catch (err) {
      Swal.fire({
        html: `${errorIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Gagal menghapus</p><p class="cx-text">${
          err.response?.data?.message || "Terjadi kesalahan pada server."
        }</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Mengerti",
        didOpen: injectSwalStyle,
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col justify-center items-center gap-5 bg-[#0b0b13] text-white">
        <div className="relative">
          <div className="w-12 h-12 border-[3px] border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
          <div className="absolute inset-0 w-12 h-12 border-[3px] border-transparent border-b-fuchsia-500/40 rounded-full animate-spin [animation-direction:reverse] [animation-duration:1.2s]" />
        </div>
        <p className="text-sm text-gray-500 tracking-wide">Memuat data order...</p>
      </div>
    );
  }

  const navItems = [
    { href: "/dashboard", icon: FaHome, label: "Dashboard" },
    { href: "/concert", icon: FaMusic, label: "Jadwal Konser" },
    { href: "/artist", icon: FaUsers, label: "Artis" },
    { href: "/genre", icon: FaTags, label: "Genre Musik" },
    { href: "/ticket", icon: FaTicketAlt, label: "Tiket" },
    { href: "/orders", icon: FaShoppingCart, label: "Orders" },
    { href: "/manage-admin", icon: FaUserShield, label: "Manage Admin" },
  ];

  const concertInfo = getConcertInfo(detail);

  return (
    <div className="flex min-h-screen bg-[#0b0b13] text-white">
      {/* SIDEBAR */}
      <aside className="relative w-72 shrink-0 bg-[#0e0e16] border-r border-white/[0.06] flex flex-col">
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 rounded-full bg-violet-600/15 blur-[80px]" />
        <div className="pointer-events-none absolute bottom-20 -left-20 w-60 h-60 rounded-full bg-fuchsia-600/10 blur-[60px]" />

        <div className="p-7 border-b border-white/[0.06] relative">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-600/40 rotate-3">
              <FaTicketAlt size={16} className="text-white" />
            </span>
            Concert<span className="text-violet-400">X</span>
          </h1>
        </div>

        <nav className="p-4 space-y-1 relative flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/orders";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative group w-full rounded-xl py-3 flex items-center gap-3.5 px-4 text-[13.5px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/30"
                    : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {active && (
                  <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white" />
                )}
                <Icon size={15} className={active ? "opacity-100" : "opacity-70 group-hover:opacity-100"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 relative">
          <div className="border-t border-dashed border-white/10 mb-4" />
          <button
            onClick={logout}
            className="w-full py-3 rounded-xl flex justify-center items-center gap-2.5 text-sm font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition-all duration-200"
          >
            <FaSignOutAlt size={13} />
            Keluar
          </button>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="px-8 lg:px-10 py-6 flex flex-wrap justify-between items-center gap-4 border-b border-white/[0.06] bg-[#0b0b13]/80 backdrop-blur-xl sticky top-0 z-30">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Manajemen Tiket</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Pantau transaksi dan kelola order tiket customer.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              className="bg-white/[0.04] hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition"
            >
              <FaFileDownload size={13} />
              Ekspor CSV
            </button>

            <button
              onClick={openValidasiTiket}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-violet-600/25 active:scale-[0.97]"
            >
              <FaCheckCircle size={13} />
              Validasi Tiket
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-10 space-y-6 flex-1">
          {/* SEARCH & FILTER BAR */}
          <div className="bg-[#141420] rounded-2xl border border-white/[0.06] p-4 flex flex-wrap justify-between items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
              <input
                type="text"
                placeholder="Cari ID transaksi atau nama..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/[0.04] border border-white/10 rounded-xl pl-11 pr-4 py-2.5 w-full text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 placeholder:text-gray-500 transition"
              />
            </div>

            <div className="relative">
              <FaFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-sm w-full sm:w-44 outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 text-gray-300 transition cursor-pointer"
              >
                <option value="">Semua Status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-[#141420] rounded-2xl border border-white/[0.06] overflow-hidden shadow-xl shadow-black/20">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-gray-500 text-[11px] uppercase tracking-wider">
                    <th className="text-left py-4 px-6 font-semibold">Transaksi</th>
                    <th className="text-left font-semibold">Pelanggan</th>
                    <th className="text-right font-semibold">Total</th>
                    <th className="text-center font-semibold">Status</th>
                    <th className="text-center pr-6 font-semibold">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20">
                        <div className="flex flex-col items-center text-center px-4">
                          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
                            <FaShoppingCart className="text-gray-600" size={28} />
                          </div>
                          <p className="text-base font-semibold text-gray-300">
                            {search || statusFilter
                              ? "Tidak ada order yang cocok"
                              : "Belum ada data order"}
                          </p>
                          <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
                            {search || statusFilter
                              ? "Coba ubah kata kunci atau filter status."
                              : "Order akan muncul di sini setelah customer melakukan transaksi."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item, idx) => {
                      const avatarStyle = AVATAR_STYLES[idx % AVATAR_STYLES.length];

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group"
                        >
                          <td className="py-4 px-6">
                            <p className="font-mono font-semibold text-[13.5px]">
                              #{item.order_code}
                            </p>
                            <p className="text-gray-500 text-xs mt-0.5">
                              {formatDate(item.created_at)}
                            </p>
                          </td>

                          <td>
                            <div className="flex items-center gap-3">
                              {item.avatar ? (
                                <img
                                  src={getAvatarUrl(item.avatar)}
                                  alt={item.full_name}
                                  className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white/10"
                                />
                              ) : (
                                <div
                                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarStyle} shrink-0 flex items-center justify-center text-[11px] font-bold ring-2 ring-white/10`}
                                >
                                  {getInitials(item.full_name)}
                                </div>
                              )}
                              <p className="font-medium text-[13.5px]">{item.full_name}</p>
                            </div>
                          </td>

                          <td className="text-right font-semibold text-[13px]">
                            {formatRupiah(item.total_price)}
                          </td>

                          <td className="text-center">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide ${
                                STATUS_STYLE[item.status] || "bg-white/10 text-gray-400 border border-white/10"
                              }`}
                            >
                              {STATUS_LABEL[item.status] || item.status?.toUpperCase()}
                            </span>
                          </td>

                          <td className="pr-6">
                            <div className="flex justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openDetail(item.id)}
                                title="Lihat Detail"
                                className="w-8.5 h-8.5 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 hover:text-white transition"
                              >
                                <FaEye size={13} />
                              </button>

                              <button
                                onClick={() => deleteOrder(item.id)}
                                disabled={deletingId === item.id}
                                title="Hapus"
                                className="w-8.5 h-8.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 flex items-center justify-center text-red-400 transition"
                              >
                                <FaTrash size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail Order Modal — status READ-ONLY, cuma berubah otomatis via webhook Midtrans */}
        {showDetail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeDetail();
            }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            <div className="relative w-full max-w-[620px] bg-[#141420] border border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600" />

              <div className="flex items-center justify-between px-7 pt-6 pb-2 shrink-0">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Detail Order</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Rincian transaksi dan item tiket
                  </p>
                </div>
                <button
                  onClick={closeDetail}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
                >
                  <FaTimes size={14} />
                </button>
              </div>

              <div className="px-7 py-5 overflow-y-auto">
                {detailLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 border-[3px] border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                    </div>
                    <p className="text-sm text-gray-500">Memuat detail...</p>
                  </div>
                ) : detail ? (
                  <div className="space-y-5">
                    {/* Info Konser — nunjukkin ini order buat konser yang mana */}
                    {concertInfo && (
                      <div className="flex gap-4 bg-gradient-to-br from-violet-600/15 to-fuchsia-600/10 border border-violet-500/20 rounded-2xl p-4">
                        {concertInfo.poster ? (
                          <img
                            src={resolveFileUrl(concertInfo.poster)}
                            alt={concertInfo.name || "Poster konser"}
                            className="w-16 h-16 rounded-xl object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
                            <FaMusic className="text-violet-400" size={20} />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-violet-400 text-[11px] font-semibold uppercase tracking-wide mb-1">
                            Konser
                          </p>
                          <p className="font-bold text-white truncate">
                            {concertInfo.name || "-"}
                          </p>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                            {concertInfo.date && (
                              <span className="flex items-center gap-1.5">
                                <FaCalendarAlt size={11} />
                                {formatDate(concertInfo.date)}
                              </span>
                            )}
                            {concertInfo.venue && (
                              <span className="flex items-center gap-1.5">
                                <FaMapMarkerAlt size={11} />
                                {concertInfo.venue}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status di atas, jelas ini bukan input */}
                    <div className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl p-4">
                      <div>
                        <p className="text-gray-500 text-xs mb-1.5">Status Order</p>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide ${
                            STATUS_STYLE[detail.status] || "bg-white/10 text-gray-400 border border-white/10"
                          }`}
                        >
                          {STATUS_LABEL[detail.status] || detail.status?.toUpperCase()}
                        </span>
                        <p className="text-gray-600 text-[11px] mt-2 max-w-[380px]">
                          Status berubah otomatis dari sistem pembayaran Midtrans, tidak bisa
                          diubah manual.
                        </p>
                      </div>

                      <button
                        onClick={refreshDetailStatus}
                        disabled={refreshingDetail}
                        title="Cek status terbaru dari server"
                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 flex items-center justify-center text-violet-400 transition shrink-0"
                      >
                        <FaSyncAlt size={14} className={refreshingDetail ? "animate-spin" : ""} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Order Code</p>
                        <p className="font-mono font-semibold">{detail.order_code}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Total Price</p>
                        <p className="font-semibold">{formatRupiah(detail.total_price)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Payment Method</p>
                        <p className="font-semibold">{detail.payment_method || "-"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Paid At</p>
                        <p className="font-semibold">{formatDate(detail.paid_at)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-500 text-xs mb-1">Created At</p>
                        <p className="font-semibold">{formatDate(detail.created_at)}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-400 font-semibold mb-3 text-sm">Items</p>
                      <div className="border border-white/10 rounded-2xl divide-y divide-white/[0.06] overflow-hidden">
                        {detail.items?.map((item) => (
                          <div key={item.id} className="p-4 flex justify-between text-sm bg-white/[0.01]">
                            <div>
                              <p className="font-medium">{item.ticket_category}</p>
                              <p className="text-gray-500 text-xs mt-0.5">
                                {item.quantity} x {formatRupiah(item.price)}
                              </p>
                            </div>
                            <p className="font-semibold">{formatRupiah(item.subtotal)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="px-7 py-5 border-t border-white/[0.06] bg-white/[0.02] flex justify-end shrink-0">
                <button
                  onClick={closeDetail}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 text-gray-300 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}