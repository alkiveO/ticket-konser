"use client";
import Link from "next/link";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import api from "@/services/api";
import {
  AreaChart,
  Area,
  Bar,
  Line,
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
  FaMoneyBillWave,
  FaSignOutAlt,
  FaUserShield,
  FaSearch,
  FaBell,
  FaPlus,
  FaBolt,
  FaChartBar,
  FaClipboardCheck,
  FaClock,
  FaImage,
  FaTimes,
  FaShoppingBag,
  FaCheckCircle,
  FaBan,
} from "react-icons/fa";

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

const AVATAR_STYLES = [
  "from-violet-600 to-fuchsia-600",
  "from-sky-500 to-blue-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
];

// Konfigurasi tampilan tiap tipe notif admin
const notifTypeConfig = {
  order_created: {
    icon: FaShoppingBag,
    color: "text-blue-400",
    bg: "bg-blue-500/15",
    label: "Pesanan Baru",
  },
  payment_success: {
    icon: FaCheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    label: "Pembayaran",
  },
  order_cancelled: {
    icon: FaBan,
    color: "text-red-400",
    bg: "bg-red-500/15",
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

  useEffect(() => {
    checkLogin();
    fetchUnreadCount();
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
        title: "Session Habis",
        text: "Silahkan login kembali.",
      });

      localStorage.removeItem("token");
      router.push("/");
    } finally {
      setLoading(false);
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
      title: "Logout ?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Logout",
      background: "#141420",
      color: "#e5e7eb",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#374151",
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

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSearchOpen(value.trim().length > 0);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchOpen(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col justify-center items-center gap-4 bg-[#0b0b13] text-white">
        <div className="w-10 h-10 border-[3px] border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 tracking-wide">Memuat dashboard...</p>
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

  const statCards = [
    {
      label: "TOTAL KONSER",
      value: dashboard.total_concert,
      icon: FaMusic,
      accent: "text-indigo-400",
      ring: "bg-indigo-500/15",
      bar: "bg-indigo-500",
    },
    {
      label: "TOTAL ARTIS",
      value: dashboard.total_artist,
      icon: FaUsers,
      accent: "text-emerald-400",
      ring: "bg-emerald-500/15",
      bar: "bg-emerald-500",
    },
    {
      label: "TIKET TERJUAL",
      value: dashboard.total_order,
      icon: FaTicketAlt,
      accent: "text-orange-400",
      ring: "bg-orange-500/15",
      bar: "bg-orange-500",
    },
    {
      label: "PENDAPATAN",
      value: `Rp${Number(dashboard.total_revenue).toLocaleString("id-ID")}`,
      icon: FaMoneyBillWave,
      accent: "text-pink-400",
      ring: "bg-pink-500/15",
      bar: "bg-pink-500",
    },
    {
      label: "GENRE",
      value: dashboard.total_genre,
      icon: FaClock,
      accent: "text-sky-400",
      ring: "bg-sky-500/15",
      bar: "bg-sky-500",
    },
  ];

  const quickActions = [
    {
      title: "Tambah Konser",
      desc: "Daftarkan event baru ke database",
      icon: FaPlus,
      color: "bg-violet-500/20 text-violet-400",
      href: "/concert",
    },
    {
      title: "Tambah Artist",
      desc: "Daftarkan musisi ke database",
      icon: FaUsers,
      color: "bg-emerald-500/20 text-emerald-400",
      href: "/artist",
    },
    {
      title: "Kelola Tiket",
      desc: "Atur kategori & kuota tiket",
      icon: FaTicketAlt,
      color: "bg-amber-500/20 text-amber-400",
      href: "/ticket",
    },
    {
      title: "Lihat Orders",
      desc: "Pantau transaksi pelanggan",
      icon: FaClipboardCheck,
      color: "bg-blue-500/20 text-blue-400",
      href: "/orders",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#0b0b13] text-white">
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#101018] border-r border-white/5 relative flex flex-col">
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-violet-600/10 blur-3xl" />

        <div className="p-8 border-b border-white/5 relative">
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-600/30 rotate-3">
              <FaTicketAlt size={15} className="text-white" />
            </span>
            Concert<span className="text-violet-400">X</span>
          </h1>
        </div>

        <div className="p-5 space-y-1 relative flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/dashboard";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative w-full rounded-xl py-3 flex items-center gap-4 px-5 text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/25"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {active && (
                  <span className="absolute -left-5 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white" />
                )}
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="p-5 relative">
          <div className="border-t border-dashed border-white/10 mb-5" />
          <button
            onClick={logout}
            className="bg-red-600/90 hover:bg-red-600 w-full py-3 rounded-xl flex justify-center items-center gap-3 text-sm font-semibold transition-colors shadow-lg shadow-red-600/10"
          >
            <FaSignOutAlt size={13} />
            Keluar
          </button>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 min-w-0">
        {/* NAVBAR */}
        <div className="px-10 py-7 flex justify-between items-center border-b border-white/5 bg-[#0b0b13]/80 backdrop-blur sticky top-0 z-30">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ringkasan Dashboard</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Selamat datang kembali. Berikut update hari ini.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block" ref={searchRef}>
              <FaSearch className="absolute left-4 top-3.5 text-gray-500 text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) setSearchOpen(true);
                }}
                placeholder="Cari data, tiket, atau konser..."
                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-9 py-3 w-72 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40 placeholder:text-gray-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-3.5 text-gray-500 hover:text-white transition"
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
                  <div className="absolute left-0 mt-3 w-[26rem] bg-[#141420] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/5">
                      <p className="text-xs text-gray-500">
                        Hasil untuk{" "}
                        <span className="text-gray-300 font-semibold">
                          "{searchQuery}"
                        </span>
                      </p>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                      {!hasSearchResults ? (
                        <div className="py-10 px-6 flex flex-col items-center text-center">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <FaSearch className="text-gray-600" />
                          </div>
                          <p className="text-sm font-semibold">
                            Tidak ada hasil
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Coba kata kunci lain, misal nama konser atau ID
                            transaksi.
                          </p>
                        </div>
                      ) : (
                        <>
                          {searchResults.concerts.length > 0 && (
                            <div>
                              <p className="px-5 pt-3 pb-1 text-[11px] uppercase tracking-wide text-gray-500">
                                Konser
                              </p>
                              {searchResults.concerts.map((item) => {
                                const imageUrl = getImageUrl(item.banner);
                                return (
                                  <Link
                                    key={`concert-${item.id}`}
                                    href="/concert"
                                    onClick={() => setSearchOpen(false)}
                                    className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition"
                                  >
                                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0">
                                      {imageUrl ? (
                                        <img
                                          src={imageUrl}
                                          alt={item.title}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.target.style.display = "none";
                                          }}
                                        />
                                      ) : (
                                        <FaMusic
                                          size={12}
                                          className="text-white/80"
                                        />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold truncate">
                                        {item.title}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate">
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
                              <p className="px-5 pt-3 pb-1 text-[11px] uppercase tracking-wide text-gray-500">
                                Transaksi
                              </p>
                              {searchResults.orders.map((item) => (
                                <Link
                                  key={`order-${item.id}`}
                                  href={`/orders?highlight=${item.id}`}
                                  onClick={() => setSearchOpen(false)}
                                  className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition"
                                >
                                  <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                                    <FaShoppingBag
                                      size={12}
                                      className="text-blue-400"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">
                                      #{item.order_code} — {item.full_name}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {item.concert_title || "-"} · Rp{" "}
                                      {Number(
                                        item.total_price
                                      ).toLocaleString("id-ID")}
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

            <div className="relative">
              <button
                onClick={openNotifPopup}
                className="relative w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-violet-500/40 transition"
              >
                <FaBell />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border-2 border-[#0b0b13] flex items-center justify-center text-[10px] font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* DROPDOWN NOTIF */}
              {notifOpen && (
                <>
                  {/* backdrop buat nutup pas klik luar */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-96 bg-[#141420] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                      <div>
                        <h3 className="font-bold text-sm">Notifikasi</h3>
                        {markingRead && (
                          <p className="text-[11px] text-violet-400 mt-0.5">
                            Menandai dibaca...
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setNotifOpen(false)}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                      {notifLoading ? (
                        <div className="py-14 flex justify-center">
                          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : notifList.length === 0 ? (
                        <div className="py-12 px-6 flex flex-col items-center text-center">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <FaBell className="text-gray-600" />
                          </div>
                          <p className="text-sm font-semibold">
                            Belum ada notifikasi
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Aktivitas order & pembayaran akan muncul di sini.
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
                              className={`flex gap-3 px-5 py-4 border-b border-white/5 hover:bg-white/5 transition ${
                                !item.is_read ? "bg-violet-500/[0.06]" : ""
                              }`}
                            >
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}
                              >
                                <Icon size={14} className={config.color} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {!item.is_read && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                                  )}
                                  <p className="text-sm font-semibold truncate">
                                    {item.title}
                                  </p>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                  {item.message}
                                </p>
                                <p className="text-[11px] text-gray-600 mt-1.5">
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
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98]"
            >
              <FaPlus size={12} />
              Buat Event
            </Link>
          </div>
        </div>

        <div className="p-10 space-y-8">
          {/* STAT CARDS */}
          <div className="grid grid-cols-5 gap-5">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="relative bg-[#141420] rounded-2xl p-6 border border-white/5 overflow-hidden hover:border-white/10 hover:-translate-y-0.5 transition-all"
                >
                  <span
                    className={`absolute top-0 left-0 right-0 h-[3px] ${card.bar}`}
                  />
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="text-gray-500 text-[11px] font-semibold tracking-wide">
                        {card.label}
                      </p>
                      <h1 className="text-2xl font-bold mt-3 truncate">
                        {card.value}
                      </h1>
                    </div>
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.ring}`}
                    >
                      <Icon size={18} className={card.accent} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CHART + QUICK ACTIONS */}
          <div className="grid grid-cols-3 gap-6">
            {/* CHART */}
            <div className="col-span-2 bg-[#141420] rounded-2xl border border-white/5 p-8">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                      <FaChartBar className="text-violet-400" size={14} />
                    </span>
                    Analisis Penjualan & Pendapatan
                  </h2>
                  <p className="text-gray-500 text-sm mt-1 ml-10">
                     Statistik performa platform 14 hari terakhir
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-violet-500" />
                    <span className="text-gray-400">Tiket Terjual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-fuchsia-400" />
                    <span className="text-gray-400">Pendapatan</span>
                  </div>
                </div>
              </div>

              {/* MINI SUMMARY */}
              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                  <p className="text-gray-500 text-xs">Total Tiket (6 bulan)</p>
                  <p className="text-2xl font-bold mt-1 text-violet-400">
                    {dashboard.monthly_stats
                      .reduce((sum, m) => sum + Number(m.tickets || 0), 0)
                      .toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                  <p className="text-gray-500 text-xs">
                    Total Pendapatan (6 bulan)
                  </p>
                  <p className="text-2xl font-bold mt-1 text-fuchsia-400">
                    Rp{" "}
                    {(
                      dashboard.monthly_stats.reduce(
                        (sum, m) => sum + Number(m.revenue || 0),
                        0
                      ) * 1000000
                    ).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              <div className="h-72">
                {dashboard.monthly_stats.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 text-sm gap-2">
                    <FaChartBar size={22} className="text-gray-700" />
                    Belum ada data statistik.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dashboard.monthly_stats}>
                      <defs>
                        <linearGradient
                          id="revenueGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#e879f9"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="95%"
                            stopColor="#e879f9"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="ticketGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#a78bfa"
                            stopOpacity={1}
                          />
                          <stop
                            offset="100%"
                            stopColor="#7c3aed"
                            stopOpacity={0.6}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        stroke="#6b7280"
                        fontSize={12}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="#6b7280"
                        fontSize={12}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#6b7280"
                        fontSize={12}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}jt`}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                        contentStyle={{
                          background: "#1c1c28",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 12,
                          color: "#fff",
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
                        fill="url(#ticketGradient)"
                        radius={[8, 8, 0, 0]}
                        barSize={28}
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="revenue"
                        name="Pendapatan (Juta Rp)"
                        stroke="#e879f9"
                        strokeWidth={3}
                        fill="url(#revenueGradient)"
                        dot={{ r: 4, fill: "#e879f9", strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="bg-[#141420] rounded-2xl border border-white/5 p-8">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <FaBolt className="text-amber-400" size={14} />
                </span>
                Cepat Kelola
              </h2>
              <p className="text-gray-500 text-sm mt-1 mb-6 ml-10">
                Aksi cepat untuk tugas administratif harian
              </p>

              <div className="space-y-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.title}
                      href={action.href}
                      className="flex items-center gap-4 p-4 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/5 transition-all group"
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${action.color}`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">
                          {action.title}
                        </p>
                        <p className="text-gray-500 text-xs">{action.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RECENT ORDERS + UPCOMING CONCERTS */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-[#141420] rounded-2xl border border-white/5 p-8">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-lg font-bold">Penjualan Tiket Terbaru</h1>
                <Link
                  href="/orders"
                  className="text-violet-400 text-sm font-semibold hover:text-violet-300 transition"
                >
                  Lihat Semua 
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500 text-[11px] uppercase tracking-wide">
                      <th className="text-left py-3 font-semibold">ID Transaksi</th>
                      <th className="text-left font-semibold">Pelanggan</th>
                      <th className="text-left font-semibold">Konser</th>
                      <th className="text-left font-semibold">Total</th>
                      <th className="text-left font-semibold">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {dashboard.recent_orders.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="text-center py-10 text-gray-500"
                        >
                          Belum ada transaksi.
                        </td>
                      </tr>
                    ) : (
                      dashboard.recent_orders.map((item, idx) => {
                        const avatarStyle =
                          AVATAR_STYLES[idx % AVATAR_STYLES.length];

                        return (
                          <tr
                            key={item.id}
                            className="border-b border-white/5 hover:bg-white/[0.04] transition-colors"
                          >
                            <td className="py-4 font-semibold text-violet-300">
                              #{item.order_code}
                            </td>
                            <td>
                              <div className="flex items-center gap-2.5">
                                {item.avatar ? (
                                  <img
                                    src={getAvatarUrl(item.avatar)}
                                    alt={item.full_name}
                                    className="w-7 h-7 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <span
                                    className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarStyle} flex items-center justify-center text-[10px] font-bold shrink-0`}
                                  >
                                    {getInitials(item.full_name)}
                                  </span>
                                )}
                                {item.full_name}
                              </div>
                            </td>
                            <td className="text-gray-400">
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
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  item.status === "paid"
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : item.status === "pending"
                                    ? "bg-amber-500/15 text-amber-400"
                                    : "bg-red-500/15 text-red-400"
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* UPCOMING CONCERTS */}
            <div className="bg-[#141420] rounded-2xl border border-white/5 p-8">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-lg font-bold">Konser Mendatang</h1>
                <Link
                  href="/concert"
                  className="text-violet-400 text-sm font-semibold hover:text-violet-300 transition"
                >
                  Lihat Semua 
                </Link>
              </div>

              <div className="space-y-4">
                {dashboard.upcoming_concerts.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-6">
                    Belum ada konser mendatang.
                  </p>
                ) : (
                  dashboard.upcoming_concerts.map((item) => {
                    const imageUrl = getImageUrl(item.banner);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/5 transition-all"
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <FaMusic className="text-white/80" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {item.title}
                          </p>
                          <p className="text-gray-500 text-xs truncate">
                            {item.venue}
                          </p>
                          <p className="text-gray-600 text-xs mt-1">
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}