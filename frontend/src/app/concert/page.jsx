"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  FaSignOutAlt,
  FaUserShield,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaImage,
  FaCamera,
  FaFilter,
  FaSortAmountDown,
  FaChevronLeft,
  FaChevronRight,
  FaMicrophoneAlt,
  FaMapMarkerAlt,
  FaBell,
} from "react-icons/fa";
import ConcertLineupModal from "@/app/concert-line/page.jsx";
import ConcertDetailModal from "./ConcertDetailModal";
import LocationPickerModal from "./LocationPickerModal";
import SeatMapEditor from "./SeatMapEditor";
import SendNotificationModal from "./SendNotificationModal";

const EMPTY_FORM = {
  title: "",
  venue: "",
  date: "",
  time: "",
  concert_type: "single",
  status: "draft",
  description: "",
};

const PAGE_SIZE = 3;

// Ambil base URL backend (tanpa akhiran /api) untuk membentuk URL gambar.
const getImageUrl = (bannerPath) => {
  if (!bannerPath) return null;
  const base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return `${base}${bannerPath}`;
};

const STATUS_STYLE = {
  open: "bg-emerald-500/15 text-emerald-400",
  closed: "bg-red-500/15 text-red-400",
  draft: "bg-white/10 text-gray-400",
};

const STATUS_LABEL = {
  open: "AKTIF",
  closed: "CLOSED",
  draft: "DRAFT",
};

// Kolom tabel didefinisikan sekali supaya header & body selalu konsisten
// lebar & paddingnya (dulu ini sumber utama layout yang berantakan).
const TABLE_COLUMNS = [
  { key: "concert", label: "Konser & Lokasi", className: "text-left w-[34%]" },
  { key: "datetime", label: "Tanggal & Waktu", className: "text-left w-[18%]" },
  { key: "capacity", label: "Kapasitas", className: "text-left w-[20%]" },
  { key: "status", label: "Status", className: "text-left w-[14%]" },
  { key: "actions", label: "Aksi", className: "text-center w-[14%]" },
];

const CELL_PADDING = "py-4 px-4 first:pl-6 last:pr-6";

export default function ConcertPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Concert yang lagi dibuka modal "Kelola Lineup"-nya. null = modal ketutup.
  const [lineupConcert, setLineupConcert] = useState(null);

  // Concert yang lagi dibuka modal "Detail & Kelola Tiket"-nya. null = modal ketutup.
  const [detailConcert, setDetailConcert] = useState(null);

  // Concert yang lagi dibuka modal "Setup Denah Kursi"-nya. null = modal ketutup.
  const [seatMapConcert, setSeatMapConcert] = useState(null);

  // Concert yang lagi dibuka modal "Kirim Notifikasi"-nya. null = modal ketutup.
  const [notifConcert, setNotifConcert] = useState(null);

  // Modal picker lokasi venue lewat peta.
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    getConcerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy]);

  const getConcerts = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/");
        return;
      }

      const res = await api.get("/concerts", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setConcerts(res.data.data || []);
    } catch (err) {
      Swal.fire("Error", "Gagal mengambil data concert", "error");
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

    let result = concerts.filter((item) => {
      const title = item.title?.toLowerCase() ?? "";
      const venue = item.location?.toLowerCase() ?? "";
      const matchKeyword = !keyword || title.includes(keyword) || venue.includes(keyword);
      const matchStatus = statusFilter === "all" || item.status === statusFilter;
      return matchKeyword && matchStatus;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "newest") return (b.id ?? 0) - (a.id ?? 0);
      if (sortBy === "oldest") return (a.id ?? 0) - (b.id ?? 0);
      if (sortBy === "date_asc")
        return new Date(a.concert_date ?? 0) - new Date(b.concert_date ?? 0);
      if (sortBy === "date_desc")
        return new Date(b.concert_date ?? 0) - new Date(a.concert_date ?? 0);
      return 0;
    });

    return result;
  }, [concerts, search, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire("Format salah", "Poster harus JPG, PNG, atau WEBP", "warning");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire("Terlalu besar", "Ukuran poster maksimal 2MB", "warning");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const openAddModal = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditId(item.id);
    setForm({
      title: item.title ?? "",
      venue: item.location ?? "",
      date: item.concert_date ? item.concert_date.slice(0, 10) : "",
      time: item.concert_time ? item.concert_time.slice(0, 5) : "",
      concert_type: item.concert_type ?? "single",
      status: item.status ?? "draft",
      description: item.description ?? "",
    });
    setPhotoFile(null);
    setPhotoPreview(getImageUrl(item.banner));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = () => {
    if (!form.title.trim() || !form.venue.trim() || !form.date || !form.time) {
      Swal.fire("Data belum lengkap", "Title, venue, date, dan jam wajib diisi", "warning");
      return false;
    }
    return true;
  };

  const saveConcert = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("venue", form.venue);
      formData.append("date", form.date);
      formData.append("time", form.time);
      formData.append("concert_type", form.concert_type);
      formData.append("status", form.status);
      formData.append("description", form.description);

      if (photoFile) {
        formData.append("poster", photoFile);
      }

      const headers = { Authorization: `Bearer ${token}` };

      if (editId) {
        await api.put(`/concerts/${editId}`, formData, { headers });
        Swal.fire("Success", "Concert berhasil diupdate", "success");
      } else {
        await api.post("/concerts", formData, { headers });
        Swal.fire("Success", "Concert berhasil ditambahkan", "success");
      }

      closeModal();
      await getConcerts();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteConcert = async (id) => {
    const result = await Swal.fire({
      title: "Hapus concert?",
      text: "Data yang dihapus tidak bisa dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya",
      cancelButtonText: "Batal",
      background: "#141420",
      color: "#e5e7eb",
      confirmButtonColor: "#7c3aed",
      cancelButtonColor: "#374151",
    });

    if (!result.isConfirmed) return;

    setDeletingId(id);
    try {
      const token = localStorage.getItem("token");

      await api.delete(`/concerts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Swal.fire("Berhasil", "Concert berhasil dihapus", "success");
      await getConcerts();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Gagal menghapus", "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col justify-center items-center gap-4 bg-[#0b0b13] text-white">
        <div className="w-10 h-10 border-[3px] border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 tracking-wide">Memuat jadwal konser...</p>
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

  return (
    <div className="flex min-h-screen bg-[#0b0b13] text-white">
      {/* SIDEBAR */}
      <aside className="flex flex-col w-72 shrink-0 bg-[#101018] border-r border-white/5 relative">
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-violet-600/10 blur-3xl" />

        <div className="p-8 border-b border-white/5 relative">
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-600/30 rotate-3">
              <FaTicketAlt size={15} className="text-white" />
            </span>
            Concert<span className="text-violet-400">X</span>
          </h1>
        </div>

        <nav className="flex-1 p-5 space-y-1 relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/concert";
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
                <Icon size={15} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

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
        <div className="px-10 py-7 flex flex-wrap justify-between items-center gap-4 border-b border-white/5 bg-[#0b0b13]/80 backdrop-blur sticky top-0 z-30">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Jadwal Konser</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Kelola semua jadwal konser dan ketersediaan panggung.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98] shrink-0"
          >
            <FaPlus size={12} />
            Tambah Konser
          </button>
        </div>

        <div className="p-10 space-y-6">
          {/* SEARCH & FILTER BAR */}
          <div className="bg-[#141420] rounded-2xl border border-white/5 p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
              <input
                type="text"
                placeholder="Cari nama konser atau lokasi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 w-full text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40 placeholder:text-gray-500 transition"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <div className="relative">
                <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-xl pl-10 pr-8 py-3 text-sm w-full sm:w-44 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40 text-gray-300 transition"
                >
                  <option value="all">Semua Status</option>
                  <option value="open">Aktif</option>
                  <option value="draft">Draft</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="relative">
                <FaSortAmountDown className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-xl pl-10 pr-8 py-3 text-sm w-full sm:w-44 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40 text-gray-300 transition"
                >
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  <option value="date_asc">Tanggal Terdekat</option>
                  <option value="date_desc">Tanggal Terjauh</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-[#141420] rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse table-fixed min-w-[900px]">
                <colgroup>
                  {TABLE_COLUMNS.map((col) => (
                    <col key={col.key} className={col.className.match(/w-\[[^\]]+\]/)?.[0]} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-wide">
                    {TABLE_COLUMNS.map((col) => (
                      <th key={col.key} className={`${CELL_PADDING} ${col.className} font-semibold`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={TABLE_COLUMNS.length} className="py-16">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <FaMusic className="text-gray-600" />
                          </div>
                          <p className="text-sm font-semibold text-gray-300">
                            {search || statusFilter !== "all"
                              ? "Tidak ada konser yang cocok"
                              : "Belum ada data konser"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {search || statusFilter !== "all"
                              ? "Coba ubah kata kunci atau filter status."
                              : "Klik \"Tambah Konser\" untuk mulai menjadwalkan event."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((item) => {
                      const imageUrl = getImageUrl(item.banner);

                      // Data kapasitas (sold/quota) belum tersedia dari backend.
                      // Fallback aman: tampilkan "-" kalau field belum dikirim.
                      const sold = item.tickets_sold ?? null;
                      const quota = item.total_quota ?? null;
                      const percentage =
                        quota && quota > 0 ? Math.round((sold / quota) * 100) : null;

                      return (
                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors align-middle">
                          <td className={CELL_PADDING}>
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-violet-600 to-fuchsia-600 shrink-0 flex items-center justify-center">
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
                                  <FaImage className="text-white/70" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold truncate">{item.title}</p>
                                <p className="text-gray-500 text-xs truncate">
                                  {item.location}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className={CELL_PADDING}>
                            <p className="whitespace-nowrap">
                              {item.concert_date
                                ? new Date(item.concert_date).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "-"}
                            </p>
                            <p className="text-gray-500 text-xs whitespace-nowrap mt-0.5">
                              {item.concert_time ? `${item.concert_time.slice(0, 5)} WIB` : ""}
                            </p>
                          </td>

                          <td className={CELL_PADDING}>
                            {percentage !== null ? (
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden shrink-0">
                                    <div
                                      className={`h-full rounded-full ${
                                        percentage >= 80
                                          ? "bg-emerald-500"
                                          : percentage >= 40
                                          ? "bg-amber-500"
                                          : "bg-gray-500"
                                      }`}
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-400 shrink-0">{percentage}%</span>
                                </div>
                                <p className="text-gray-600 text-xs mt-1 whitespace-nowrap">
                                  {sold.toLocaleString("id-ID")} / {quota.toLocaleString("id-ID")}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-600 text-xs">-</span>
                            )}
                          </td>

                          <td className={CELL_PADDING}>
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                                STATUS_STYLE[item.status] || STATUS_STYLE.draft
                              }`}
                            >
                              {STATUS_LABEL[item.status] || item.status}
                            </span>
                          </td>

                          <td className={CELL_PADDING}>
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => setDetailConcert(item)}
                                title="Lihat Detail & Kelola Tiket"
                                className="w-9 h-9 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400 transition"
                              >
                                <FaTicketAlt size={14} />
                              </button>

                              <button
                                onClick={() => setSeatMapConcert(item)}
                                title="Setup Denah Kursi"
                                className="w-9 h-9 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 flex items-center justify-center text-sky-400 transition"
                              >
                                <FaMapMarkerAlt size={14} />
                              </button>

                              <button
                                onClick={() => setLineupConcert(item)}
                                title="Kelola Lineup Artist"
                                className="w-9 h-9 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 flex items-center justify-center text-violet-400 transition"
                              >
                                <FaMicrophoneAlt size={14} />
                              </button>

                              <button
                                onClick={() => setNotifConcert(item)}
                                title="Kirim Notifikasi"
                                className="w-9 h-9 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center text-amber-400 transition"
                              >
                                <FaBell size={14} />
                              </button>

                              <button
                                onClick={() => openEditModal(item)}
                                title="Edit Concert"
                                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 transition"
                              >
                                <FaEdit size={14} />
                              </button>

                              <button
                                onClick={() => deleteConcert(item.id)}
                                disabled={deletingId === item.id}
                                title="Hapus Concert"
                                className="w-9 h-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 flex items-center justify-center text-red-400 transition"
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

            {/* PAGINATION */}
            <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-t border-white/5 text-sm text-gray-500">
              <p>
                Menampilkan {paginated.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} -{" "}
                {Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} konser
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center transition"
                >
                  <FaChevronLeft size={12} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 5)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                        p === page
                          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/25"
                          : "bg-white/5 hover:bg-white/10 text-gray-400"
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                {totalPages > 5 && <span className="text-gray-600 px-1">...</span>}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center transition"
                >
                  <FaChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL: Add / Edit Concert */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#141420] border border-white/10 w-full max-w-[550px] rounded-2xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/60">
              <h1 className="text-2xl font-bold mb-6">
                {editId ? "Edit Concert" : "Tambah Concert"}
              </h1>

              <div className="space-y-5">
                <div className="flex flex-col items-center gap-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 rounded-xl border-2 border-dashed border-white/15 flex items-center justify-center overflow-hidden cursor-pointer hover:border-violet-500 transition relative group bg-white/5"
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FaImage size={40} className="text-gray-600" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <FaCamera className="text-white" size={20} />
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-violet-400 font-semibold hover:text-violet-300 transition"
                  >
                    {photoPreview ? "Ganti poster" : "Upload poster"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                    Judul Konser
                  </label>
                  <input
                    type="text"
                    name="title"
                    placeholder="Concert Title"
                    value={form.title}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40 placeholder:text-gray-500 transition"
                  />
                </div>

                {/* Venue + tombol pilih lokasi lewat peta */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                    Venue
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="venue"
                      placeholder="Venue (atau pilih lewat peta)"
                      value={form.venue}
                      onChange={handleChange}
                      className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40 placeholder:text-gray-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(true)}
                      title="Pilih lokasi di peta"
                      className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-sm text-violet-400 shrink-0 transition"
                    >
                      <FaMapMarkerAlt size={14} />
                    </button>
                  </div>
                </div>

                {/* Deskripsi Konser */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                    Deskripsi
                  </label>
                  <textarea
                    name="description"
                    placeholder="Deskripsi konser..."
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40 placeholder:text-gray-500 resize-none transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40 [color-scheme:dark] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                      Jam
                    </label>
                    <input
                      type="time"
                      name="time"
                      value={form.time}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40 [color-scheme:dark] transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                      Tipe Konser
                    </label>
                    <select
                      name="concert_type"
                      value={form.concert_type}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40 transition"
                    >
                      <option value="single">Single</option>
                      <option value="festival">Festival</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                      Status
                    </label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40 transition"
                    >
                      <option value="draft">Draft</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition disabled:opacity-50 text-sm"
                >
                  Cancel
                </button>

                <button
                  onClick={saveConcert}
                  disabled={saving}
                  className="px-5 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl transition-all disabled:opacity-50 text-sm font-semibold shadow-lg shadow-violet-600/20 flex items-center gap-2"
                >
                  {saving && (
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  {saving ? "Menyimpan..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Kelola Lineup Artist */}
        <ConcertLineupModal
          concert={lineupConcert}
          onClose={() => setLineupConcert(null)}
          onSaved={() => getConcerts()}
        />

        {/* MODAL: Detail Concert & Kelola Tiket */}
        <ConcertDetailModal
          concert={detailConcert}
          onClose={() => setDetailConcert(null)}
          onChanged={() => getConcerts()}
        />

        {/* MODAL: Setup Denah Kursi */}
        <SeatMapEditor
          concert={seatMapConcert}
          onClose={() => setSeatMapConcert(null)}
          onChanged={() => getConcerts()}
        />

        {/* MODAL: Kirim Notifikasi */}
        <SendNotificationModal
          concert={notifConcert}
          onClose={() => setNotifConcert(null)}
        />

        {/* MODAL: Pilih Lokasi Venue lewat Peta */}
        <LocationPickerModal
          open={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSelect={({ address }) => setForm((prev) => ({ ...prev, venue: address }))}
        />
      </main>
    </div>
  );
}