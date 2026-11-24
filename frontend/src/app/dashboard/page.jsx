"use client";
import Link from "next/link";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import api from "@/services/api";
import {
  Area,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import {
  FaHome,
  FaMusic,
  FaUsers,
  FaTags,
  FaTicketAlt,
  FaShoppingCart,
  FaSignOutAlt,
  FaUserShield,
  FaSearch,
  FaBell,
  FaPlus,
  FaChartBar,
  FaChartPie,
  FaTimes,
  FaShoppingBag,
  FaCheckCircle,
  FaBan,
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

// Base URL backend (bukan yang ada /api-nya), buat gabungin path avatar user.
const API_BASE = "http://localhost:3000";

// Ambil base URL backend (tanpa akhiran /api) untuk membentuk URL gambar banner/poster.
const getImageUrl = (bannerPath) => {
  if (!bannerPath) return null;
  const base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return `${base}${bannerPath}`;
};

// Avatar user sudah tersimpan dengan path diawali "/", tinggal digabung ke API_BASE.
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

// Avatar inisial: warna datar, bukan gradien
const AVATAR_STYLES = [
  "bg-[#2B3A5E] text-[#9DB7FF]",
  "bg-[#1F4D45] text-[#6EE7B7]",
  "bg-[#5A4320] text-[#F5B83D]",
  "bg-[#5A2A32] text-[#FCA5A5]",
  "bg-[#2D4A5E] text-[#7DD3FC]",
];

// Warna & label tiap status (sama dengan status di halaman Orders)
const STATUS_PIE = [
  { key: "paid", label: "Dibayar", color: "#34D399" },
  { key: "pending", label: "Menunggu", color: "#F5B83D" },
  { key: "cancelled", label: "Dibatalkan", color: "#6B7690" },
  { key: "expired", label: "Kedaluwarsa", color: "#F0675C" },
];

const STATUS_PILL = {
  paid: "bg-emerald-400/10 text-emerald-300",
  pending: "bg-amber-400/10 text-amber-300",
  cancelled: "bg-slate-400/10 text-slate-300",
  expired: "bg-red-400/10 text-red-300",
};

// Konfigurasi tampilan tiap tipe notif admin
const notifTypeConfig = {
  order_created: {
    icon: FaShoppingBag,
    color: "text-sky-300",
    bg: "bg-sky-400/15",
    label: "Pesanan Baru",
  },
  payment_success: {
    icon: FaCheckCircle,
    color: "text-emerald-300",
    bg: "bg-emerald-400/15",
    label: "Pembayaran",
  },
  order_cancelled: {
    icon: FaBan,
    color: "text-red-300",
    bg: "bg-red-400/15",
    label: "Dibatalkan",
  },
};

const formatNotifDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [dashboard, setDashboard] = useState({
    total_concert: 0,
    total_artist: 0,
    total_genre: 0,
    total_order: 0,
    total_revenue: 0,
    recent_orders: [],
    monthly_stats: [], // [{ month: "Jan", tickets: 120, revenue: 500 }, ...]
    upcoming_concerts: [], // [{ id, title, venue, date, banner }, ...]
  });

  // Semua order (bukan cuma recent_orders), dipakai untuk diagram status transaksi
  const [allOrders, setAllOrders] = useState([]);

  // State notifikasi admin
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifList, setNotifList] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingRead, setMarkingRead] = useState(false);

  // State search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // State hover potongan diagram bulat
  const [pieHover, setPieHover] = useState(null);

  useEffect(() => {
    checkLogin();
    fetchUnreadCount();
    fetchAllOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkLogin = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/");
      return;
    }

    try {
      const res = await api.get("/admins/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setDashboard((prev) => ({ ...prev, ...res.data.data }));
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Sesi habis",
        text: "Silakan login kembali.",
        background: "#151D2E",
        color: "#E8ECF4",
        confirmButtonColor: "#F5B83D",
        customClass: { confirmButton: "!text-[#1A1305] !font-semibold" },
      });

      localStorage.removeItem("token");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  // Ambil SEMUA order (endpoint yang sama dengan halaman Orders)
  const fetchAllOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await api.get("/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAllOrders(res.data.data || []);
    } catch (err) {
      // silent, diagram donat cukup tampil kosong kalau gagal
      console.log("Gagal fetch semua order", err);
    }
  };

  // Ambil jumlah notif belum dibaca (buat badge di bell, tanpa buka popup)
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await api.get("/admin-notifications/my", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = res.data.data || [];
      const unread = list.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      // silent, badge cukup gak muncul aja kalau gagal
    }
  };

  // Buka popup notif: fetch full list, lalu tandai semua dibaca
  const openNotifPopup = async () => {
    setSearchOpen(false);
    setNotifOpen(true);
    setNotifLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setNotifList([]);
        return;
      }

      const res = await api.get("/admin-notifications/my", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = res.data.data || [];
      setNotifList(list);

      const hasUnread = list.some((n) => !n.is_read);
      if (hasUnread) {
        await markAllAsRead(token);
      }
    } catch (err) {
      console.log("Gagal fetch notifikasi admin", err);
      setNotifList([]);
    } finally {
      setNotifLoading(false);
    }
  };

  const markAllAsRead = async (token) => {
    setMarkingRead(true);
    try {
      await api.put(
        "/admin-notifications/read-all",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifList((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.log("Gagal menandai notifikasi admin dibaca", err);
    } finally {
      setMarkingRead(false);
    }
  };

  const logout = () => {
    Swal.fire({
      title: "Keluar dari panel?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Keluar",
      cancelButtonText: "Batal",
      background: "#151D2E",
      color: "#E8ECF4",
      confirmButtonColor: "#DC2626",
      cancelButtonColor: "#2C3858",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("token");
        router.push("/");
      }
    });
  };

  // Hasil pencarian: filter recent_orders & upcoming_concerts yang sudah
  // ada di data dashboard (nggak perlu request baru ke backend).
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { orders: [], concerts: [] };

    const orders = (dashboard.recent_orders || []).filter((item) => {
      const orderCode = String(item.order_code || "").toLowerCase();
      const name = String(item.full_name || "").toLowerCase();
      const concertTitle = String(item.concert_title || "").toLowerCase();
      return (
        orderCode.includes(q) ||
        name.includes(q) ||
        concertTitle.includes(q)
      );
    });

    const concerts = (dashboard.upcoming_concerts || []).filter((item) => {
      const title = String(item.title || "").toLowerCase();
      const venue = String(item.venue || "").toLowerCase();
      return title.includes(q) || venue.includes(q);
    });

    return { orders, concerts };
  }, [searchQuery, dashboard.recent_orders, dashboard.upcoming_concerts]);

  const hasSearchResults =
    searchResults.orders.length > 0 || searchResults.concerts.length > 0;

  // Data diagram bulat: komposisi status dari SEMUA transaksi
  const pieData = useMemo(() => {
    return STATUS_PIE.map((s) => ({
      ...s,
      value: allOrders.filter((o) => o.status === s.key).length,
    }));
  }, [allOrders]);

  const pieTotal = pieData.reduce((sum, s) => sum + s.value, 0);
  const pieActive = pieHover !== null ? pieData[pieHover] : null;

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSearchOpen(value.trim().length > 0);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchOpen(false);
  };

  const rootClass = `${display.variable} ${body.variable} font-[family-name:var(--font-body)]`;

  if (loading) {
    return (
      <div
        className={`${rootClass} h-screen flex flex-col justify-center items-center gap-4 bg-[#0C1220] text-[#E8ECF4]`}
      >
        <div className="w-9 h-9 border-[3px] border-[#F5B83D]/25 border-t-[#F5B83D] rounded-full animate-spin motion-reduce:animate-none" />
        <p className="text-sm text-[#8B96AD]">Memuat dashboard...</p>
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

  const monthlyTickets = dashboard.monthly_stats.reduce(
    (sum, m) => sum + Number(m.tickets || 0),
    0
  );
  const monthlyRevenue =
    dashboard.monthly_stats.reduce((sum, m) => sum + Number(m.revenue || 0), 0) *
    1000000;

  const smallStats = [
    { label: "Tiket terjual", value: dashboard.total_order },
    { label: "Total konser", value: dashboard.total_concert },
    { label: "Total artis", value: dashboard.total_artist },
    { label: "Genre", value: dashboard.total_genre },
  ];

  return (
    <div
      className={`${rootClass} flex min-h-screen bg-[#0C1220] text-[#E8ECF4] selection:bg-[#F5B83D] selection:text-[#1A1305]`}
    >
      {/* ================= SIDEBAR ================= */}
      <aside className="w-64 shrink-0 sticky top-0 h-screen bg-[#101727] border-r border-white/[0.06] flex flex-col">
        <div className="px-7 py-7 flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-[#F5B83D] text-[#1A1305] flex items-center justify-center">
            <FaTicketAlt size={15} />
          </span>
          <span className={`${HD} text-xl font-bold tracking-tight`}>
            Lokatix
          </span>
        </div>

        <nav className="px-4 space-y-0.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/dashboard";
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
                  <span className="absolute -left-4 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#F5B83D]" />
                )}
                <Icon
                  size={14}
                  className={active ? "text-[#F5B83D]" : ""}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-red-400/25 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <FaSignOutAlt size={12} />
            Keluar
          </button>
        </div>
      </aside>

      {/* ================= CONTENT ================= */}
      <main className="flex-1 min-w-0">
        {/* NAVBAR */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-6 border-b border-white/[0.06] bg-[#0C1220]/85 px-10 py-6 backdrop-blur">
          <div>
            <h1 className={`${HD} text-3xl font-bold tracking-tight`}>
              Ringkasan
            </h1>
            <p className="mt-1 text-sm text-[#8B96AD]">
              Selamat datang kembali. Berikut update hari ini.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* SEARCH */}
            <div className="relative hidden md:block" ref={searchRef}>
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#5E6A87]" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) setSearchOpen(true);
                }}
                placeholder="Cari transaksi atau konser"
                aria-label="Cari transaksi atau konser"
                className="h-11 w-72 rounded-lg border border-[#2C3858] bg-[#151D2E] pl-9 pr-9 text-sm text-[#E8ECF4] outline-none transition placeholder:text-[#5E6A87] focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  aria-label="Hapus pencarian"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5E6A87] transition hover:text-white"
                >
                  <FaTimes size={12} />
                </button>
              )}

              {/* DROPDOWN HASIL SEARCH */}
              {searchOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setSearchOpen(false)}
                  />
                  <div className="absolute left-0 z-50 mt-2 w-[26rem] overflow-hidden rounded-xl border border-[#2C3858] bg-[#151D2E] shadow-2xl shadow-black/60">
                    <div className="border-b border-white/[0.06] px-5 py-3">
                      <p className="text-xs text-[#8B96AD]">
                        Hasil untuk{" "}
                        <span className="font-semibold text-[#E8ECF4]">
                          "{searchQuery}"
                        </span>
                      </p>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                      {!hasSearchResults ? (
                        <div className="flex flex-col items-center px-6 py-10 text-center">
                          <p className="text-sm font-semibold">
                            Tidak ada hasil
                          </p>
                          <p className="mt-1 text-xs text-[#8B96AD]">
                            Coba nama konser, nama pelanggan, atau kode
                            transaksi.
                          </p>
                        </div>
                      ) : (
                        <>
                          {searchResults.concerts.length > 0 && (
                            <div>
                              <p className="px-5 pb-1 pt-3 text-xs font-medium text-[#8B96AD]">
                                Konser
                              </p>
                              {searchResults.concerts.map((item) => {
                                const imageUrl = getImageUrl(item.banner);
                                return (
                                  <Link
                                    key={`concert-${item.id}`}
                                    href="/concert"
                                    onClick={() => setSearchOpen(false)}
                                    className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.04]"
                                  >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#1B2539]">
                                      {imageUrl ? (
                                        <img
                                          src={imageUrl}
                                          alt={item.title}
                                          className="h-full w-full object-cover"
                                          onError={(e) => {
                                            e.target.style.display = "none";
                                          }}
                                        />
                                      ) : (
                                        <FaMusic
                                          size={12}
                                          className="text-[#8B96AD]"
                                        />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-semibold">
                                        {item.title}
                                      </p>
                                      <p className="truncate text-xs text-[#8B96AD]">
                                        {item.venue}
                                      </p>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          )}

                          {searchResults.orders.length > 0 && (
                            <div>
                              <p className="px-5 pb-1 pt-3 text-xs font-medium text-[#8B96AD]">
                                Transaksi
                              </p>
                              {searchResults.orders.map((item) => (
                                <Link
                                  key={`order-${item.id}`}
                                  href={`/orders?highlight=${item.id}`}
                                  onClick={() => setSearchOpen(false)}
                                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.04]"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-400/15">
                                    <FaShoppingBag
                                      size={12}
                                      className="text-sky-300"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">
                                      #{item.order_code} — {item.full_name}
                                    </p>
                                    <p className="truncate text-xs text-[#8B96AD]">
                                      {item.concert_title || "-"} · Rp{" "}
                                      {Number(item.total_price).toLocaleString(
                                        "id-ID"
                                      )}
                                    </p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* NOTIF */}
            <div className="relative">
              <button
                onClick={openNotifPopup}
                aria-label="Notifikasi"
                className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-[#2C3858] bg-[#151D2E] text-[#8B96AD] transition hover:border-[#F5B83D]/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B83D]"
              >
                <FaBell />
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#0C1220] bg-[#F5B83D] px-1 text-[10px] font-bold text-[#1A1305]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* DROPDOWN NOTIF */}
              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="absolute right-0 z-50 mt-2 w-96 overflow-hidden rounded-xl border border-[#2C3858] bg-[#151D2E] shadow-2xl shadow-black/60">
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                      <div>
                        <h3 className="text-sm font-bold">Notifikasi</h3>
                        {markingRead && (
                          <p className="mt-0.5 text-[11px] text-[#F5B83D]">
                            Menandai dibaca...
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setNotifOpen(false)}
                        aria-label="Tutup notifikasi"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[#8B96AD] transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                      {notifLoading ? (
                        <div className="flex justify-center py-14">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#F5B83D] border-t-transparent motion-reduce:animate-none" />
                        </div>
                      ) : notifList.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-12 text-center">
                          <p className="text-sm font-semibold">
                            Belum ada notifikasi
                          </p>
                          <p className="mt-1 text-xs text-[#8B96AD]">
                            Aktivitas order dan pembayaran akan muncul di sini.
                          </p>
                        </div>
                      ) : (
                        notifList.map((item) => {
                          const config =
                            notifTypeConfig[item.type] ||
                            notifTypeConfig.order_created;
                          const Icon = config.icon;
                          return (
                            <Link
                              key={item.id}
                              href={`/orders?highlight=${item.order_id}`}
                              onClick={() => setNotifOpen(false)}
                              className={`flex gap-3 border-b border-white/[0.06] px-5 py-4 transition hover:bg-white/[0.04] ${
                                !item.is_read ? "bg-[#F5B83D]/[0.05]" : ""
                              }`}
                            >
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${config.bg}`}
                              >
                                <Icon size={14} className={config.color} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {!item.is_read && (
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F5B83D]" />
                                  )}
                                  <p className="truncate text-sm font-semibold">
                                    {item.title}
                                  </p>
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs text-[#8B96AD]">
                                  {item.message}
                                </p>
                                <p className="mt-1.5 text-[11px] text-[#5E6A87]">
                                  {formatNotifDate(item.created_at)}
                                </p>
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link
              href="/concert"
              className="flex h-11 items-center gap-2 rounded-lg bg-[#F5B83D] px-5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30"
            >
              <FaPlus size={11} />
              Buat event
            </Link>
          </div>
        </header>

        <div className="space-y-6 p-10">
          {/* ===== RINGKASAN ANGKA: satu strip, pendapatan jadi fokus ===== */}
          <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.06] lg:grid-cols-6">
            <div className="col-span-2 bg-[#151D2E] p-7">
              <p className="text-sm text-[#8B96AD]">Total pendapatan</p>
              <p
                className={`${HD} mt-3 truncate text-4xl font-bold tracking-tight text-[#F5B83D]`}
              >
                Rp{Number(dashboard.total_revenue).toLocaleString("id-ID")}
              </p>
            </div>
            {smallStats.map((s) => (
              <div key={s.label} className="bg-[#151D2E] p-7">
                <p className="text-sm text-[#8B96AD]">{s.label}</p>
                <p
                  className={`${HD} mt-3 truncate text-3xl font-bold tracking-tight`}
                >
                  {Number(s.value).toLocaleString("id-ID")}
                </p>
              </div>
            ))}
          </section>

          {/* ===== CHART PENJUALAN + DIAGRAM BULAT ===== */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* CHART */}
            <section className="rounded-2xl bg-[#151D2E] p-8 ring-1 ring-white/[0.06] xl:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className={`${HD} text-xl font-bold tracking-tight`}>
                    Penjualan dan pendapatan
                  </h2>
                  <p className="mt-1 text-sm text-[#8B96AD]">
                    Per bulan, 6 bulan terakhir
                  </p>
                </div>

                <div className="flex items-center gap-5 text-xs text-[#8B96AD]">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-[#F5B83D]" />
                    Tiket terjual
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-0.5 w-4 rounded-full bg-[#8FB4FF]" />
                    Pendapatan
                  </div>
                </div>
              </div>

              {/* ringkasan, tanpa kotak di dalam kotak */}
              <div className="my-7 flex flex-wrap gap-x-12 gap-y-4">
                <div>
                  <p className="text-sm text-[#8B96AD]">Total tiket</p>
                  <p
                    className={`${HD} mt-1 text-2xl font-bold text-[#F5B83D]`}
                  >
                    {monthlyTickets.toLocaleString("id-ID")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#8B96AD]">Total pendapatan</p>
                  <p
                    className={`${HD} mt-1 text-2xl font-bold text-[#8FB4FF]`}
                  >
                    Rp {monthlyRevenue.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              <div className="h-72">
                {dashboard.monthly_stats.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-[#5E6A87]">
                    <FaChartBar size={22} />
                    Belum ada data statistik.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dashboard.monthly_stats}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        stroke="#5E6A87"
                        fontSize={12}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="#5E6A87"
                        fontSize={12}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#5E6A87"
                        fontSize={12}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}jt`}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                        contentStyle={{
                          background: "#1B2539",
                          border: "1px solid #2C3858",
                          borderRadius: 10,
                          color: "#E8ECF4",
                          fontSize: 13,
                        }}
                        formatter={(value, name) => {
                          if (name === "Pendapatan (Juta Rp)") {
                            return [`Rp ${Number(value).toFixed(2)} jt`, name];
                          }
                          return [value, name];
                        }}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="tickets"
                        name="Tiket Terjual"
                        fill="#F5B83D"
                        fillOpacity={0.9}
                        radius={[6, 6, 0, 0]}
                        barSize={28}
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="revenue"
                        name="Pendapatan (Juta Rp)"
                        stroke="#8FB4FF"
                        strokeWidth={2.5}
                        fill="#8FB4FF"
                        fillOpacity={0.08}
                        dot={{ r: 3.5, fill: "#8FB4FF", strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* DIAGRAM BULAT */}
            <section className="flex flex-col rounded-2xl bg-[#151D2E] p-8 ring-1 ring-white/[0.06]">
              <div className="mb-6">
                <h2 className={`${HD} text-xl font-bold tracking-tight`}>
                  Status transaksi
                </h2>
                <p className="mt-1 text-sm text-[#8B96AD]">
                  Dari semua transaksi
                </p>
              </div>

              {pieTotal === 0 ? (
                <div className="flex min-h-60 flex-1 flex-col items-center justify-center gap-2 text-sm text-[#5E6A87]">
                  <FaChartPie size={22} />
                  Belum ada transaksi.
                </div>
              ) : (
                <div className="flex flex-1 flex-col justify-center">
                  <div className="relative h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData.filter((s) => s.value > 0)}
                          dataKey="value"
                          nameKey="label"
                          innerRadius={58}
                          outerRadius={82}
                          paddingAngle={3}
                          stroke="none"
                          onMouseEnter={(_, index) => {
                            const visible = pieData.filter((s) => s.value > 0);
                            const key = visible[index]?.key;
                            setPieHover(
                              pieData.findIndex((s) => s.key === key)
                            );
                          }}
                          onMouseLeave={() => setPieHover(null)}
                        >
                          {pieData
                            .filter((s) => s.value > 0)
                            .map((s) => (
                              <Cell key={s.key} fill={s.color} />
                            ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        className={`${HD} text-3xl font-bold leading-none`}
                      >
                        {pieActive ? pieActive.value : pieTotal}
                      </span>
                      <span className="mt-1 text-xs text-[#8B96AD]">
                        {pieActive ? pieActive.label : "Total transaksi"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2.5">
                    {pieData.map((seg) => {
                      const pct = Math.round((seg.value / pieTotal) * 100);
                      return (
                        <div
                          key={seg.key}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: seg.color }}
                            />
                            <span className="text-[#C9D1E3]">{seg.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{seg.value}</span>
                            <span className="w-9 text-right text-xs text-[#8B96AD]">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* ===== TRANSAKSI TERBARU + KONSER MENDATANG ===== */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="rounded-2xl bg-[#151D2E] p-8 ring-1 ring-white/[0.06] xl:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <h2 className={`${HD} text-xl font-bold tracking-tight`}>
                  Penjualan tiket terbaru
                </h2>
                <Link
                  href="/orders"
                  className="text-sm font-semibold text-[#F5B83D] transition hover:text-[#FFC857]"
                >
                  Lihat semua
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-xs text-[#5E6A87]">
                      <th className="py-3 text-left font-medium">
                        ID transaksi
                      </th>
                      <th className="text-left font-medium">Pelanggan</th>
                      <th className="text-left font-medium">Konser</th>
                      <th className="text-left font-medium">Total</th>
                      <th className="text-left font-medium">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {dashboard.recent_orders.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="py-10 text-center text-[#8B96AD]"
                        >
                          Belum ada transaksi.
                        </td>
                      </tr>
                    ) : (
                      dashboard.recent_orders.map((item, idx) => {
                        const avatarStyle =
                          AVATAR_STYLES[idx % AVATAR_STYLES.length];
                        const statusLabel =
                          STATUS_PIE.find((s) => s.key === item.status)
                            ?.label || item.status;

                        return (
                          <tr
                            key={item.id}
                            className="border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.03]"
                          >
                            <td className="py-4 font-semibold text-[#F5B83D]">
                              #{item.order_code}
                            </td>
                            <td>
                              <div className="flex items-center gap-2.5">
                                {item.avatar ? (
                                  <img
                                    src={getAvatarUrl(item.avatar)}
                                    alt={item.full_name}
                                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                                  />
                                ) : (
                                  <span
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarStyle}`}
                                  >
                                    {getInitials(item.full_name)}
                                  </span>
                                )}
                                {item.full_name}
                              </div>
                            </td>
                            <td className="text-[#8B96AD]">
                              {item.concert_title || "-"}
                            </td>
                            <td className="font-medium">
                              Rp{" "}
                              {Number(item.total_price).toLocaleString(
                                "id-ID"
                              )}
                            </td>
                            <td>
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                  STATUS_PILL[item.status] ||
                                  "bg-red-400/10 text-red-300"
                                }`}
                              >
                                {statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* UPCOMING CONCERTS */}
            <section className="rounded-2xl bg-[#151D2E] p-8 ring-1 ring-white/[0.06]">
              <div className="mb-6 flex items-center justify-between">
                <h2 className={`${HD} text-xl font-bold tracking-tight`}>
                  Konser mendatang
                </h2>
                <Link
                  href="/concert"
                  className="text-sm font-semibold text-[#F5B83D] transition hover:text-[#FFC857]"
                >
                  Lihat semua
                </Link>
              </div>

              <div className="space-y-1">
                {dashboard.upcoming_concerts.length === 0 ? (
                  <p className="py-6 text-center text-sm text-[#8B96AD]">
                    Belum ada konser mendatang.
                  </p>
                ) : (
                  dashboard.upcoming_concerts.map((item) => {
                    const imageUrl = getImageUrl(item.banner);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-white/[0.04]"
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#1B2539]">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.title}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <FaMusic className="text-[#5E6A87]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {item.title}
                          </p>
                          <p className="truncate text-xs text-[#8B96AD]">
                            {item.venue}
                          </p>
                          <p className="mt-1 text-xs text-[#5E6A87]">
                            {item.date
                              ? new Date(item.date).toLocaleDateString("id-ID")
                              : "-"}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}