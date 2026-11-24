"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/services/api";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque, Figtree } from "next/font/google";

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
  FaSyncAlt,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaChevronDown,
} from "react-icons/fa";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});

const HD = "font-[family-name:var(--font-display)]";

const STATUS_OPTIONS = ["pending", "paid", "cancelled", "expired"];

const STATUS_STYLE = {
  pending: "bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20",
  paid: "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20",
  cancelled: "bg-white/[0.06] text-[#C9D1E3] ring-1 ring-white/10",
  expired: "bg-red-400/10 text-red-300 ring-1 ring-red-400/20",
};

const STATUS_LABEL = {
  pending: "Menunggu",
  paid: "Dibayar",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

const AVATAR_STYLES = [
  "bg-[#F5B83D]/15 text-[#F5B83D]",
  "bg-sky-400/15 text-sky-300",
  "bg-emerald-400/15 text-emerald-300",
  "bg-rose-400/15 text-rose-300",
  "bg-violet-400/15 text-violet-300",
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

// Tema SweetAlert, disamakan dengan halaman Tiket
const swalTheme = {
  background: "#151D2E",
  color: "#E8ECF4",
  confirmButtonColor: "#F5B83D",
  cancelButtonColor: "#2C3858",
  customClass: { confirmButton: "!text-[#1A1305] !font-semibold" },
};

const notify = (icon, title, text, extra = {}) =>
  Swal.fire({ ...swalTheme, icon, title, text, ...extra });

const ACTION_BTN =
  "flex h-9 w-9 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-white/[0.08] hover:text-[#F5B83D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B83D]";

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
      notify(
        "error",
        "Gagal memuat data",
        "Data order tidak berhasil diambil dari server."
      );
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
        !keyword || orderCode.includes(keyword) || customer.includes(keyword);

      const matchStatus = !statusFilter || item.status === statusFilter;

      return matchKeyword && matchStatus;
    });
  }, [orders, search, statusFilter]);

  // Ekspor CSV murni client-side dari data yang sedang tampil (hasil search/filter).
  const exportCSV = () => {
    if (filtered.length === 0) {
      notify("info", "Tidak ada data", "Tidak ada order untuk diekspor.");
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
    notify(
      "info",
      "Validasi tiket",
      "Fitur scan / validasi tiket belum tersambung ke backend. Perlu endpoint check-in dulu sebelum ini bisa aktif."
    );
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
      notify(
        "error",
        "Gagal memuat detail",
        err.response?.data?.message || "Gagal mengambil detail order."
      );
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
      notify("error", "Gagal refresh", "Gagal refresh status order.");
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
      ...swalTheme,
      icon: "warning",
      title: "Hapus order ini?",
      text: "Data order beserta item-nya akan dihapus permanen.",
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#DC2626",
      customClass: {},
    });

    if (!result.isConfirmed) return;

    setDeletingId(id);
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      notify("success", "Order dihapus", "Data berhasil dihapus dari sistem.", {
        timer: 1800,
        showConfirmButton: false,
      });
      await getOrders();
    } catch (err) {
      notify(
        "error",
        "Gagal menghapus",
        err.response?.data?.message || "Terjadi kesalahan pada server."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const rootClass = `${display.variable} ${body.variable} font-[family-name:var(--font-body)]`;

  if (loading) {
    return (
      <div
        className={`${rootClass} flex h-screen flex-col items-center justify-center gap-4 bg-[#0C1220] text-[#E8ECF4]`}
      >
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#F5B83D]/25 border-t-[#F5B83D] motion-reduce:animate-none" />
        <p className="text-sm text-[#8B96AD]">Memuat data order...</p>
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
    <div
      className={`${rootClass} flex min-h-screen bg-[#0C1220] text-[#E8ECF4] selection:bg-[#F5B83D] selection:text-[#1A1305]`}
    >
      {/* ================= SIDEBAR ================= */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#101727]">
        <div className="flex items-center gap-2.5 px-7 py-7">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5B83D] text-[#1A1305]">
            <FaTicketAlt size={15} />
          </span>
          <span className={`${HD} text-xl font-bold tracking-tight`}>Lokatix</span>
        </div>

        <nav className="flex-1 space-y-0.5 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/orders";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B83D] ${
                  active
                    ? "bg-white/[0.07] text-white"
                    : "text-[#8B96AD] hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {active && (
                  <span className="absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[#F5B83D]" />
                )}
                <Icon size={14} className={`shrink-0 ${active ? "text-[#F5B83D]" : ""}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-red-400/25 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <FaSignOutAlt size={12} />
            Keluar
          </button>
        </div>
      </aside>

      {/* ================= CONTENT ================= */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] bg-[#0C1220]/85 px-10 py-6 backdrop-blur">
          <div>
            <h1 className={`${HD} text-3xl font-bold tracking-tight`}>Manajemen order</h1>
            <p className="mt-1 text-sm text-[#8B96AD]">
              Pantau transaksi dan kelola order tiket customer.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              className="flex h-11 items-center gap-2 rounded-lg border border-[#2C3858] px-5 text-sm font-medium text-[#C9D1E3] transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/15"
            >
              <FaFileDownload size={12} />
              Ekspor CSV
            </button>

            <button
              onClick={openValidasiTiket}
              className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-[#F5B83D] px-5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30"
            >
              <FaCheckCircle size={12} />
              Validasi tiket
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-6 p-10">
          {/* ===== SEARCH & FILTER ===== */}
          <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#151D2E] p-5 ring-1 ring-white/[0.06]">
            <div className="relative min-w-[240px] max-w-md flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#5E6A87]" />
              <input
                type="text"
                placeholder="Cari ID transaksi atau nama"
                aria-label="Cari ID transaksi atau nama"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#2C3858] bg-[#0F1626] pl-9 pr-4 text-sm outline-none transition placeholder:text-[#5E6A87] focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter status"
                className="h-11 w-full min-w-[180px] cursor-pointer appearance-none rounded-lg border border-[#2C3858] bg-[#0F1626] pl-4 pr-10 text-sm text-[#E8ECF4] outline-none transition focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15 [color-scheme:dark]"
              >
                <option value="">Semua status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
              <FaChevronDown
                size={11}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#5E6A87]"
              />
            </div>
          </section>

          {/* ===== TABEL ===== */}
          <section className="overflow-hidden rounded-2xl bg-[#151D2E] ring-1 ring-white/[0.06]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs text-[#5E6A87]">
                    <th className="px-6 py-4 text-left font-medium">Transaksi</th>
                    <th className="px-3 text-left font-medium">Pelanggan</th>
                    <th className="px-3 text-right font-medium">Total</th>
                    <th className="px-3 text-center font-medium">Status</th>
                    <th className="pr-6 text-center font-medium">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20">
                        <div className="flex flex-col items-center px-4 text-center">
                          <FaShoppingCart className="mb-3 text-[#5E6A87]" size={28} />
                          <p className="text-sm font-semibold">
                            {search || statusFilter
                              ? "Tidak ada order yang cocok"
                              : "Belum ada data order"}
                          </p>
                          <p className="mt-1 max-w-xs text-xs text-[#8B96AD]">
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
                          className="border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.03]"
                        >
                          <td className="px-6 py-4">
                            <p className="font-mono text-[13.5px] font-semibold">
                              #{item.order_code}
                            </p>
                            <p className="mt-0.5 text-xs text-[#8B96AD]">
                              {formatDate(item.created_at)}
                            </p>
                          </td>

                          <td className="px-3">
                            <div className="flex items-center gap-3">
                              {item.avatar ? (
                                <img
                                  src={getAvatarUrl(item.avatar)}
                                  alt={item.full_name}
                                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                                />
                              ) : (
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarStyle}`}
                                >
                                  {getInitials(item.full_name)}
                                </div>
                              )}
                              <p className="text-[13.5px] font-medium">{item.full_name}</p>
                            </div>
                          </td>

                          <td className="px-3 text-right font-medium tabular-nums">
                            {formatRupiah(item.total_price)}
                          </td>

                          <td className="px-3 text-center">
                            <span
                              className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${
                                STATUS_STYLE[item.status] ||
                                "bg-white/[0.06] text-[#C9D1E3] ring-1 ring-white/10"
                              }`}
                            >
                              {STATUS_LABEL[item.status] || item.status}
                            </span>
                          </td>

                          <td className="pr-6">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => openDetail(item.id)}
                                className={ACTION_BTN}
                                title="Lihat detail"
                                aria-label={`Lihat detail order ${item.order_code}`}
                              >
                                <FaEye size={14} />
                              </button>

                              <button
                                onClick={() => deleteOrder(item.id)}
                                disabled={deletingId === item.id}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-40"
                                title="Hapus"
                                aria-label={`Hapus order ${item.order_code}`}
                              >
                                <FaTrash size={14} />
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
          </section>
        </div>

        {/* ===== MODAL DETAIL ORDER (status read-only, berubah otomatis via webhook Midtrans) ===== */}
        {showDetail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeDetail();
            }}
          >
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

            <div className="relative flex max-h-[90vh] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl border border-[#2C3858] bg-[#151D2E] shadow-2xl shadow-black/60">
              <div className="flex shrink-0 items-start justify-between px-7 pb-2 pt-7">
                <div>
                  <h2 className={`${HD} text-2xl font-bold tracking-tight`}>Detail order</h2>
                  <p className="mt-1 text-sm text-[#8B96AD]">
                    Rincian transaksi dan item tiket.
                  </p>
                </div>
                <button
                  onClick={closeDetail}
                  aria-label="Tutup"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-white/[0.06] hover:text-white"
                >
                  <FaTimes size={14} />
                </button>
              </div>

              <div className="overflow-y-auto px-7 py-5">
                {detailLoading ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-16">
                    <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#F5B83D]/25 border-t-[#F5B83D] motion-reduce:animate-none" />
                    <p className="text-sm text-[#8B96AD]">Memuat detail...</p>
                  </div>
                ) : detail ? (
                  <div className="space-y-5">
                    {/* Info konser */}
                    {concertInfo && (
                      <div className="flex gap-4 rounded-xl bg-[#0F1626] p-4 ring-1 ring-white/[0.06]">
                        {concertInfo.poster ? (
                          <img
                            src={resolveFileUrl(concertInfo.poster)}
                            alt={concertInfo.name || "Poster konser"}
                            className="h-16 w-16 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#F5B83D]/10">
                            <FaMusic className="text-[#F5B83D]" size={20} />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="mb-1 text-xs font-medium text-[#F5B83D]">Konser</p>
                          <p className="truncate font-semibold text-white">
                            {concertInfo.name || "-"}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#8B96AD]">
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

                    {/* Status (read-only) */}
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-[#0F1626] p-4 ring-1 ring-white/[0.06]">
                      <div>
                        <p className="mb-1.5 text-xs text-[#5E6A87]">Status order</p>
                        <span
                          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${
                            STATUS_STYLE[detail.status] ||
                            "bg-white/[0.06] text-[#C9D1E3] ring-1 ring-white/10"
                          }`}
                        >
                          {STATUS_LABEL[detail.status] || detail.status}
                        </span>
                        <p className="mt-2 max-w-[380px] text-xs text-[#8B96AD]">
                          Status berubah otomatis dari sistem pembayaran Midtrans, tidak bisa
                          diubah manual.
                        </p>
                      </div>

                      <button
                        onClick={refreshDetailStatus}
                        disabled={refreshingDetail}
                        title="Cek status terbaru dari server"
                        aria-label="Cek status terbaru"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#2C3858] text-[#F5B83D] transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/15 disabled:opacity-50"
                      >
                        <FaSyncAlt
                          size={13}
                          className={refreshingDetail ? "animate-spin motion-reduce:animate-none" : ""}
                        />
                      </button>
                    </div>

                    {/* Info transaksi */}
                    <div className="grid grid-cols-2 gap-4 rounded-xl bg-[#0F1626] p-4 text-sm ring-1 ring-white/[0.06]">
                      <div>
                        <p className="mb-1 text-xs text-[#5E6A87]">Kode order</p>
                        <p className="font-mono font-semibold">{detail.order_code}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-[#5E6A87]">Total harga</p>
                        <p className="font-semibold tabular-nums text-[#F5B83D]">
                          {formatRupiah(detail.total_price)}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-[#5E6A87]">Metode pembayaran</p>
                        <p className="font-semibold">{detail.payment_method || "-"}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-[#5E6A87]">Dibayar pada</p>
                        <p className="font-semibold">{formatDate(detail.paid_at)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="mb-1 text-xs text-[#5E6A87]">Dibuat pada</p>
                        <p className="font-semibold">{formatDate(detail.created_at)}</p>
                      </div>
                    </div>

                    {/* Items */}
                    <div>
                      <p className="mb-3 text-sm font-medium text-[#C9D1E3]">Item tiket</p>
                      <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl ring-1 ring-white/[0.06]">
                        {detail.items?.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between bg-[#0F1626] p-4 text-sm"
                          >
                            <div>
                              <p className="font-medium">{item.ticket_category}</p>
                              <p className="mt-0.5 text-xs tabular-nums text-[#8B96AD]">
                                {item.quantity} x {formatRupiah(item.price)}
                              </p>
                            </div>
                            <p className="font-semibold tabular-nums">
                              {formatRupiah(item.subtotal)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-white/[0.06] px-7 py-5">
                <button
                  onClick={closeDetail}
                  className="rounded-lg border border-[#2C3858] px-5 py-2.5 text-sm font-medium text-[#C9D1E3] transition hover:bg-white/[0.05]"
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