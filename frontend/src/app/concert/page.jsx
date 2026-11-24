"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  FaChartLine,
  FaChartPie,
} from "react-icons/fa";
import ConcertLineupModal from "@/app/concert-line/page.jsx";
import ConcertDetailModal from "./ConcertDetailModal";
import LocationPickerModal from "./LocationPickerModal";
import SeatMapEditor from "./SeatMapEditor";
import SendNotificationModal from "./SendNotificationModal";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});

const HD = "font-[family-name:var(--font-display)]";

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

// Tema SweetAlert supaya cocok dengan tampilan gelap
const swalTheme = {
  background: "#151D2E",
  color: "#E8ECF4",
  confirmButtonColor: "#F5B83D",
  cancelButtonColor: "#2C3858",
  customClass: { confirmButton: "!text-[#1A1305] !font-semibold" },
};

const notify = (title, text, icon) =>
  Swal.fire({ ...swalTheme, title, text, icon });

// Ambil base URL backend (tanpa akhiran /api) untuk membentuk URL gambar.
const getImageUrl = (bannerPath) => {
  if (!bannerPath) return null;
  const base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return `${base}${bannerPath}`;
};

const STATUS_STYLE = {
  open: "bg-emerald-400/10 text-emerald-300",
  closed: "bg-red-400/10 text-red-300",
  draft: "bg-slate-400/10 text-slate-300",
};

const STATUS_LABEL = {
  open: "Aktif",
  closed: "Ditutup",
  draft: "Draft",
};

// Warna tiap status di diagram bulat
const STATUS_CHART = [
  { key: "open", label: "Aktif", color: "#34D399" },
  { key: "draft", label: "Draft", color: "#6B7690" },
  { key: "closed", label: "Ditutup", color: "#F0675C" },
];

// Kolom tabel didefinisikan sekali supaya header & body selalu konsisten
const TABLE_COLUMNS = [
  { key: "concert", label: "Konser dan lokasi", className: "text-left w-[34%]" },
  { key: "datetime", label: "Tanggal dan waktu", className: "text-left w-[18%]" },
  { key: "capacity", label: "Kapasitas", className: "text-left w-[20%]" },
  { key: "status", label: "Status", className: "text-left w-[14%]" },
  { key: "actions", label: "Aksi", className: "text-center w-[14%]" },
];

const CELL_PADDING = "py-4 px-4 first:pl-6 last:pr-6";

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const INPUT_CLASS =
  "w-full rounded-lg border border-[#2C3858] bg-[#0F1626] px-3.5 py-2.5 text-sm text-[#E8ECF4] outline-none transition placeholder:text-[#5E6A87] focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15 [color-scheme:dark]";

const LABEL_CLASS = "mb-1.5 block text-sm font-medium";

const ACTION_BTN =
  "flex h-9 w-9 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-white/[0.08] hover:text-[#F5B83D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B83D]";

/* ========================================= */
/* DIAGRAM GARIS                             */
/* ========================================= */

function LineChart({ data }) {
  const [hover, setHover] = useState(null);

  const W = 640;
  const H = 260;
  const padL = 46;
  const padR = 24;
  const padT = 28;
  const padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const rawMax = Math.max(0, ...data.map((d) => d.value));
  const niceMax = rawMax <= 4 ? 4 : Math.ceil(rawMax / 4) * 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => (niceMax * i) / 4);

  const x = (i) =>
    data.length === 1 ? padL + innerW / 2 : padL + (innerW * i) / (data.length - 1);
  const y = (v) => padT + innerH - (v / niceMax) * innerH;

  const points = data.map((d, i) => ({ x: x(i), y: y(d.value) }));

  // garis melengkung halus
  let linePath = "";
  points.forEach((p, i) => {
    if (i === 0) {
      linePath += `M ${p.x} ${p.y}`;
    } else {
      const prev = points[i - 1];
      const midX = (prev.x + p.x) / 2;
      linePath += ` C ${midX} ${prev.y}, ${midX} ${p.y}, ${p.x} ${p.y}`;
    }
  });

  const baseY = padT + innerH;
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`
      : "";

  const hovered = hover !== null ? data[hover] : null;
  const hoveredPoint = hover !== null ? points[hover] : null;

  const tipW = 140;
  const tipH = 44;
  const tipX = hoveredPoint
    ? Math.min(Math.max(hoveredPoint.x - tipW / 2, padL), W - padR - tipW)
    : 0;
  const tipY = hoveredPoint ? Math.max(hoveredPoint.y - tipH - 14, 4) : 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none">
      {/* grid horizontal + label sumbu Y */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(t)}
            y2={y(t)}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 4"
          />
          <text
            x={padL - 10}
            y={y(t) + 4}
            textAnchor="end"
            fontSize="11"
            fill="#5E6A87"
          >
            {Math.round(t).toLocaleString("id-ID")}
          </text>
        </g>
      ))}

      {/* area di bawah garis */}
      {areaPath && <path d={areaPath} fill="#F5B83D" fillOpacity="0.08" />}

      {/* garis */}
      {points.length > 1 && (
        <path
          d={linePath}
          fill="none"
          stroke="#F5B83D"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}

      {/* garis vertikal saat hover */}
      {hoveredPoint && (
        <line
          x1={hoveredPoint.x}
          x2={hoveredPoint.x}
          y1={padT}
          y2={baseY}
          stroke="rgba(245,184,61,0.35)"
          strokeDasharray="4 4"
        />
      )}

      {/* titik + label sumbu X */}
      {data.map((d, i) => (
        <g key={d.label + i}>
          <circle
            cx={points[i].x}
            cy={points[i].y}
            r={hover === i ? 6.5 : 4.5}
            fill="#151D2E"
            stroke="#F5B83D"
            strokeWidth="2.5"
          />
          <text
            x={points[i].x}
            y={H - 14}
            textAnchor="middle"
            fontSize="11"
            fill={hover === i ? "#E8ECF4" : "#5E6A87"}
          >
            {d.label}
          </text>
        </g>
      ))}

      {/* area hover tak terlihat */}
      {data.map((d, i) => {
        const slot = data.length === 1 ? innerW : innerW / (data.length - 1);
        return (
          <rect
            key={`hit-${i}`}
            x={points[i].x - slot / 2}
            y={padT}
            width={slot}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        );
      })}

      {/* tooltip */}
      {hovered && hoveredPoint && (
        <g pointerEvents="none">
          <rect
            x={tipX}
            y={tipY}
            width={tipW}
            height={tipH}
            rx="8"
            fill="#1B2539"
            stroke="#2C3858"
          />
          <text x={tipX + 12} y={tipY + 18} fontSize="11" fill="#8B96AD">
            {hovered.fullLabel}
          </text>
          <text
            x={tipX + 12}
            y={tipY + 35}
            fontSize="13"
            fontWeight="700"
            fill="#E8ECF4"
          >
            {hovered.value.toLocaleString("id-ID")} tiket, {hovered.count} konser
          </text>
        </g>
      )}
    </svg>
  );
}

/* ========================================= */
/* DIAGRAM BULAT (DONUT)                     */
/* ========================================= */

function DonutChart({ segments, total }) {
  const [hover, setHover] = useState(null);

  // lingkaran dengan keliling 100 supaya dasharray = persen
  const r = 15.9155;
  let offset = 0;

  const active = hover !== null ? segments[hover] : null;

  return (
    <div className="relative mx-auto h-44 w-44">
      <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
        <circle
          cx="21"
          cy="21"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="5"
        />

        {segments.map((seg, i) => {
          if (seg.value === 0) return null;
          const pct = (seg.value / total) * 100;
          const gap = segments.filter((s) => s.value > 0).length > 1 ? 1 : 0;
          const dash = Math.max(pct - gap, 0);
          const el = (
            <circle
              key={seg.key}
              cx="21"
              cy="21"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={hover === i ? 6 : 5}
              strokeDasharray={`${dash} ${100 - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              style={{ transition: "stroke-width 0.15s", cursor: "pointer" }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          );
          offset += pct;
          return el;
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${HD} text-3xl font-bold leading-none`}>
          {active ? active.value : total}
        </span>
        <span className="mt-1 text-xs text-[#8B96AD]">
          {active ? active.label : "Total konser"}
        </span>
      </div>
    </div>
  );
}

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
      notify("Error", "Gagal mengambil data concert", "error");
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

  // Data diagram garis: tiket terjual per bulan (berdasarkan tanggal konser)
  const lineData = useMemo(() => {
    const map = {};

    concerts.forEach((item) => {
      if (!item.concert_date) return;
      const ym = String(item.concert_date).slice(0, 7); // "YYYY-MM"
      if (!/^\d{4}-\d{2}$/.test(ym)) return;

      if (!map[ym]) map[ym] = { value: 0, count: 0 };
      map[ym].value += Number(item.tickets_sold || 0);
      map[ym].count += 1;
    });

    return Object.keys(map)
      .sort()
      .slice(-6) // maksimal 6 bulan terakhir yang ada datanya
      .map((ym) => {
        const [yy, mm] = ym.split("-");
        const monthName = MONTH_SHORT[Number(mm) - 1];
        return {
          label: `${monthName} ${yy.slice(2)}`,
          fullLabel: `${monthName} ${yy}`,
          value: map[ym].value,
          count: map[ym].count,
        };
      });
  }, [concerts]);

  const totalSold = useMemo(
    () => concerts.reduce((sum, item) => sum + Number(item.tickets_sold || 0), 0),
    [concerts]
  );

  // Data diagram bulat: komposisi status konser
  const donutSegments = useMemo(
    () =>
      STATUS_CHART.map((s) => ({
        ...s,
        value: concerts.filter((c) => c.status === s.key).length,
      })),
    [concerts]
  );

  const donutTotal = donutSegments.reduce((sum, s) => sum + s.value, 0);

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
      notify("Format salah", "Poster harus JPG, PNG, atau WEBP", "warning");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      notify("Terlalu besar", "Ukuran poster maksimal 2MB", "warning");
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
      notify("Data belum lengkap", "Judul, venue, tanggal, dan jam wajib diisi", "warning");
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
        notify("Berhasil", "Concert berhasil diupdate", "success");
      } else {
        await api.post("/concerts", formData, { headers });
        notify("Berhasil", "Concert berhasil ditambahkan", "success");
      }

      closeModal();
      await getConcerts();
    } catch (err) {
      notify("Error", err.response?.data?.message || "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteConcert = async (id) => {
    const result = await Swal.fire({
      ...swalTheme,
      title: "Hapus concert?",
      text: "Data yang dihapus tidak bisa dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#DC2626",
      customClass: {},
    });

    if (!result.isConfirmed) return;

    setDeletingId(id);
    try {
      const token = localStorage.getItem("token");

      await api.delete(`/concerts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      notify("Berhasil", "Concert berhasil dihapus", "success");
      await getConcerts();
    } catch (err) {
      notify("Error", err.response?.data?.message || "Gagal menghapus", "error");
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
        <p className="text-sm text-[#8B96AD]">Memuat jadwal konser...</p>
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

  const hasFilter = search || statusFilter !== "all";

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
            const active = item.href === "/concert";
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
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] bg-[#0C1220]/85 px-10 py-6 backdrop-blur">
          <div>
            <h1 className={`${HD} text-3xl font-bold tracking-tight`}>Jadwal konser</h1>
            <p className="mt-1 text-sm text-[#8B96AD]">
              Kelola semua jadwal konser dan ketersediaan panggung.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-[#F5B83D] px-5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30"
          >
            <FaPlus size={11} />
            Tambah konser
          </button>
        </header>

        <div className="space-y-6 p-10">
          {/* ===== DIAGRAM ===== */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Diagram garis */}
            <section className="rounded-2xl bg-[#151D2E] p-7 ring-1 ring-white/[0.06] xl:col-span-2">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className={`${HD} text-xl font-bold tracking-tight`}>
                    Tiket terjual per bulan
                  </h2>
                  <p className="mt-1 text-sm text-[#8B96AD]">
                    Berdasarkan tanggal konser
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className={`${HD} text-3xl font-bold leading-none text-[#F5B83D]`}>
                    {totalSold.toLocaleString("id-ID")}
                  </p>
                  <p className="mt-1 text-xs text-[#8B96AD]">Total tiket terjual</p>
                </div>
              </div>

              {lineData.length === 0 ? (
                <div className="flex h-[220px] flex-col items-center justify-center gap-1 text-center">
                  <FaChartLine className="mb-2 text-[#5E6A87]" size={22} />
                  <p className="text-sm font-semibold">Belum ada data</p>
                  <p className="text-xs text-[#8B96AD]">
                    Grafik muncul setelah ada konser dengan tanggal.
                  </p>
                </div>
              ) : (
                <LineChart data={lineData} />
              )}
            </section>

            {/* Diagram bulat */}
            <section className="rounded-2xl bg-[#151D2E] p-7 ring-1 ring-white/[0.06]">
              <div className="mb-5">
                <h2 className={`${HD} text-xl font-bold tracking-tight`}>Status konser</h2>
                <p className="mt-1 text-sm text-[#8B96AD]">Komposisi semua konser</p>
              </div>

              {donutTotal === 0 ? (
                <div className="flex h-[220px] flex-col items-center justify-center gap-1 text-center">
                  <FaChartPie className="mb-2 text-[#5E6A87]" size={22} />
                  <p className="text-sm font-semibold">Belum ada data</p>
                </div>
              ) : (
                <>
                  <DonutChart segments={donutSegments} total={donutTotal} />

                  <div className="mt-6 space-y-2.5">
                    {donutSegments.map((seg) => {
                      const pct = Math.round((seg.value / donutTotal) * 100);
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
                </>
              )}
            </section>
          </div>

          {/* ===== SEARCH & FILTER ===== */}
          <section className="flex flex-col gap-4 rounded-2xl bg-[#151D2E] p-5 ring-1 ring-white/[0.06] md:flex-row md:items-center">
            <div className="relative min-w-[240px] flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#5E6A87]" />
              <input
                type="text"
                placeholder="Cari nama konser atau lokasi"
                aria-label="Cari nama konser atau lokasi"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#2C3858] bg-[#0F1626] pl-9 pr-4 text-sm outline-none transition placeholder:text-[#5E6A87] focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15"
              />
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <div className="relative">
                <FaFilter className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#5E6A87]" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter status"
                  className="h-11 w-full appearance-none rounded-lg border border-[#2C3858] bg-[#0F1626] pl-9 pr-8 text-sm text-[#C9D1E3] outline-none transition focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15 [color-scheme:dark] sm:w-44"
                >
                  <option value="all">Semua status</option>
                  <option value="open">Aktif</option>
                  <option value="draft">Draft</option>
                  <option value="closed">Ditutup</option>
                </select>
              </div>

              <div className="relative">
                <FaSortAmountDown className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#5E6A87]" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Urutkan"
                  className="h-11 w-full appearance-none rounded-lg border border-[#2C3858] bg-[#0F1626] pl-9 pr-8 text-sm text-[#C9D1E3] outline-none transition focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15 [color-scheme:dark] sm:w-48"
                >
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  <option value="date_asc">Tanggal terdekat</option>
                  <option value="date_desc">Tanggal terjauh</option>
                </select>
              </div>
            </div>
          </section>

          {/* ===== TABEL ===== */}
          <section className="overflow-hidden rounded-2xl bg-[#151D2E] ring-1 ring-white/[0.06]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] table-fixed border-collapse text-sm">
                <colgroup>
                  {TABLE_COLUMNS.map((col) => (
                    <col key={col.key} className={col.className.match(/w-\[[^\]]+\]/)?.[0]} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs text-[#5E6A87]">
                    {TABLE_COLUMNS.map((col) => (
                      <th key={col.key} className={`${CELL_PADDING} ${col.className} font-medium`}>
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
                          <FaMusic className="mb-3 text-[#5E6A87]" size={22} />
                          <p className="text-sm font-semibold">
                            {hasFilter
                              ? "Tidak ada konser yang cocok"
                              : "Belum ada data konser"}
                          </p>
                          <p className="mt-1 text-xs text-[#8B96AD]">
                            {hasFilter
                              ? "Coba ubah kata kunci atau filter status."
                              : "Klik \"Tambah konser\" untuk mulai menjadwalkan event."}
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
                        <tr
                          key={item.id}
                          className="border-b border-white/[0.06] align-middle transition-colors last:border-0 hover:bg-white/[0.03]"
                        >
                          <td className={CELL_PADDING}>
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#1B2539]">
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
                                  <FaImage className="text-[#5E6A87]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{item.title}</p>
                                <p className="truncate text-xs text-[#8B96AD]">
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
                            <p className="mt-0.5 whitespace-nowrap text-xs text-[#8B96AD]">
                              {item.concert_time ? `${item.concert_time.slice(0, 5)} WIB` : ""}
                            </p>
                          </td>

                          <td className={CELL_PADDING}>
                            {percentage !== null ? (
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-white/10">
                                    <div
                                      className={`h-full rounded-full ${
                                        percentage >= 80
                                          ? "bg-emerald-400"
                                          : percentage >= 40
                                          ? "bg-[#F5B83D]"
                                          : "bg-slate-500"
                                      }`}
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                  </div>
                                  <span className="shrink-0 text-xs text-[#C9D1E3]">
                                    {percentage}%
                                  </span>
                                </div>
                                <p className="mt-1 whitespace-nowrap text-xs text-[#5E6A87]">
                                  {sold.toLocaleString("id-ID")} / {quota.toLocaleString("id-ID")}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-[#5E6A87]">-</span>
                            )}
                          </td>

                          <td className={CELL_PADDING}>
                            <span
                              className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                                STATUS_STYLE[item.status] || STATUS_STYLE.draft
                              }`}
                            >
                              {STATUS_LABEL[item.status] || item.status}
                            </span>
                          </td>

                          <td className={CELL_PADDING}>
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => setDetailConcert(item)}
                                title="Lihat detail dan kelola tiket"
                                aria-label="Lihat detail dan kelola tiket"
                                className={ACTION_BTN}
                              >
                                <FaTicketAlt size={14} />
                              </button>

                              <button
                                onClick={() => setSeatMapConcert(item)}
                                title="Setup denah kursi"
                                aria-label="Setup denah kursi"
                                className={ACTION_BTN}
                              >
                                <FaMapMarkerAlt size={14} />
                              </button>

                              <button
                                onClick={() => setLineupConcert(item)}
                                title="Kelola lineup artis"
                                aria-label="Kelola lineup artis"
                                className={ACTION_BTN}
                              >
                                <FaMicrophoneAlt size={14} />
                              </button>

                              <button
                                onClick={() => setNotifConcert(item)}
                                title="Kirim notifikasi"
                                aria-label="Kirim notifikasi"
                                className={ACTION_BTN}
                              >
                                <FaBell size={14} />
                              </button>

                              <button
                                onClick={() => openEditModal(item)}
                                title="Edit konser"
                                aria-label="Edit konser"
                                className={ACTION_BTN}
                              >
                                <FaEdit size={14} />
                              </button>

                              <button
                                onClick={() => deleteConcert(item.id)}
                                disabled={deletingId === item.id}
                                title="Hapus konser"
                                aria-label="Hapus konser"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50"
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-4 text-sm text-[#8B96AD]">
              <p>
                Menampilkan {paginated.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} -{" "}
                {Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} konser
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Halaman sebelumnya"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] transition hover:bg-white/[0.1] disabled:opacity-30"
                >
                  <FaChevronLeft size={11} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 5)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${
                        p === page
                          ? "bg-[#F5B83D] text-[#1A1305]"
                          : "bg-white/[0.05] text-[#C9D1E3] hover:bg-white/[0.1]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                {totalPages > 5 && <span className="px-1 text-[#5E6A87]">...</span>}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Halaman berikutnya"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] transition hover:bg-white/[0.1] disabled:opacity-30"
                >
                  <FaChevronRight size={11} />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* MODAL: Tambah / Edit Concert */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="max-h-[90vh] w-full max-w-[550px] overflow-y-auto rounded-2xl border border-[#2C3858] bg-[#151D2E] p-8 shadow-2xl shadow-black/60">
              <h2 className={`${HD} mb-6 text-2xl font-bold tracking-tight`}>
                {editId ? "Edit konser" : "Tambah konser"}
              </h2>

              <div className="space-y-5">
                <div className="flex flex-col items-center gap-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#34415F] bg-[#0F1626] transition hover:border-[#F5B83D]"
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FaImage size={36} className="text-[#34415F]" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
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
                    className="text-sm font-semibold text-[#F5B83D] transition hover:text-[#FFC857]"
                  >
                    {photoPreview ? "Ganti poster" : "Upload poster"}
                  </button>
                </div>

                <div>
                  <label htmlFor="title" className={LABEL_CLASS}>
                    Judul konser
                  </label>
                  <input
                    id="title"
                    type="text"
                    name="title"
                    placeholder="Nama konser"
                    value={form.title}
                    onChange={handleChange}
                    className={INPUT_CLASS}
                  />
                </div>

                {/* Venue + tombol pilih lokasi lewat peta */}
                <div>
                  <label htmlFor="venue" className={LABEL_CLASS}>
                    Venue
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="venue"
                      type="text"
                      name="venue"
                      placeholder="Ketik venue atau pilih lewat peta"
                      value={form.venue}
                      onChange={handleChange}
                      className={`${INPUT_CLASS} min-w-0 flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(true)}
                      title="Pilih lokasi di peta"
                      aria-label="Pilih lokasi di peta"
                      className="flex shrink-0 items-center justify-center rounded-lg border border-[#2C3858] bg-[#0F1626] px-4 text-[#F5B83D] transition hover:border-[#F5B83D]/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/15"
                    >
                      <FaMapMarkerAlt size={14} />
                    </button>
                  </div>
                </div>

                {/* Deskripsi Konser */}
                <div>
                  <label htmlFor="description" className={LABEL_CLASS}>
                    Deskripsi
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    placeholder="Ceritakan singkat tentang konser ini"
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                    className={`${INPUT_CLASS} resize-none`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date" className={LABEL_CLASS}>
                      Tanggal
                    </label>
                    <input
                      id="date"
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label htmlFor="time" className={LABEL_CLASS}>
                      Jam
                    </label>
                    <input
                      id="time"
                      type="time"
                      name="time"
                      value={form.time}
                      onChange={handleChange}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="concert_type" className={LABEL_CLASS}>
                      Tipe konser
                    </label>
                    <select
                      id="concert_type"
                      name="concert_type"
                      value={form.concert_type}
                      onChange={handleChange}
                      className={INPUT_CLASS}
                    >
                      <option value="single">Single</option>
                      <option value="festival">Festival</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="status" className={LABEL_CLASS}>
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className={INPUT_CLASS}
                    >
                      <option value="draft">Draft</option>
                      <option value="open">Aktif</option>
                      <option value="closed">Ditutup</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-[#2C3858] px-5 py-2.5 text-sm font-medium text-[#C9D1E3] transition hover:bg-white/[0.05] disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  onClick={saveConcert}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-[#F5B83D] px-5 py-2.5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30 disabled:opacity-60"
                >
                  {saving && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1A1305]/25 border-t-[#1A1305] motion-reduce:animate-none" />
                  )}
                  {saving ? "Menyimpan..." : "Simpan"}
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