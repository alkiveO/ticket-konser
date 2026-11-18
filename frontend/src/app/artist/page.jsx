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
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaSignOutAlt,
  FaUserCircle,
  FaCamera,
  FaUserShield,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaChevronDown,
} from "react-icons/fa";

const EMPTY_FORM = {
  genre_id: "",
  name: "",
  description: "",
};

const PAGE_SIZE = 6;

const getImageUrl = (filename) => {
  if (!filename) return null;
  const base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return `${base}/uploads/artists/${filename}`;
};

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

const warningIconHtml = `
  <div style="width:64px;height:64px;border-radius:9999px;background:rgba(245,158,11,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
    </svg>
  </div>
`;

export default function ArtistPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [artists, setArtists] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    initData();
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
  }, [search, genreFilter]);

  const initData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    setLoading(true);
    try {
      const [artistRes, genreRes] = await Promise.all([
        api.get("/artists", { headers: { Authorization: `Bearer ${token}` } }),
        api.get("/genres", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setArtists(artistRes.data.data || []);
      setGenres(genreRes.data.data || []);
    } catch (err) {
      Swal.fire({
        html: `${errorIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Gagal memuat data</p><p class="cx-text">Data artist tidak berhasil diambil dari server.</p>`,
        background: "#141420",
        buttonsStyling: false,
        showClass: { popup: "" },
        customClass: {
          popup: "cx-popup",
          confirmButton: "cx-btn cx-btn-confirm-violet",
        },
        confirmButtonText: "Mengerti",
        didOpen: () => {
          const style = document.createElement("style");
          style.innerHTML = SWAL_BASE_STYLE;
          document.head.appendChild(style);
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const getArtists = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/artists", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setArtists(res.data.data || []);
    } catch (err) {
      Swal.fire("Error", "Gagal mengambil data artist", "error");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return artists.filter((item) => {
      const name = item.name?.toLowerCase() ?? "";
      const genreName = item.genre_name?.toLowerCase() ?? "";
      const description = item.description?.toLowerCase() ?? "";
      const matchKeyword =
        !keyword ||
        name.includes(keyword) ||
        genreName.includes(keyword) ||
        description.includes(keyword);
      const matchGenre =
        genreFilter === "all" || String(item.genre_id) === String(genreFilter);
      return matchKeyword && matchGenre;
    });
  }, [artists, search, genreFilter]);

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
      Swal.fire({
        html: `${warningIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Format salah</p><p class="cx-text">Foto harus JPG, PNG, atau WEBP.</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Oke",
        didOpen: injectSwalStyle,
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        html: `${warningIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Terlalu besar</p><p class="cx-text">Ukuran foto maksimal 2MB.</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Oke",
        didOpen: injectSwalStyle,
      });
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
      genre_id: item.genre_id ?? "",
      name: item.name ?? "",
      description: item.description ?? "",
    });
    setPhotoFile(null);
    setPhotoPreview(getImageUrl(item.photo));
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
    if (!form.name.trim() || !form.genre_id) {
      Swal.fire({
        html: `${warningIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Data belum lengkap</p><p class="cx-text">Name dan genre wajib diisi.</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Oke",
        didOpen: injectSwalStyle,
      });
      return false;
    }
    return true;
  };

  const saveArtist = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("genre_id", form.genre_id);
      formData.append("name", form.name);
      formData.append("description", form.description);
      if (photoFile) formData.append("photo", photoFile);

      const headers = { Authorization: `Bearer ${token}` };

      if (editId) {
        await api.put(`/artists/${editId}`, formData, { headers });
        Swal.fire({
          html: `${successIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Berhasil diupdate</p><p class="cx-text">Data artist sudah tersimpan.</p>`,
          background: "#141420",
          buttonsStyling: false,
          customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
          confirmButtonText: "Oke",
          timer: 1800,
          didOpen: injectSwalStyle,
        });
      } else {
        await api.post("/artists", formData, { headers });
        Swal.fire({
          html: `${successIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Artist ditambahkan</p><p class="cx-text">Musisi baru berhasil didaftarkan.</p>`,
          background: "#141420",
          buttonsStyling: false,
          customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
          confirmButtonText: "Oke",
          timer: 1800,
          didOpen: injectSwalStyle,
        });
      }

      closeModal();
      await getArtists();
    } catch (err) {
      Swal.fire({
        html: `${errorIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Gagal menyimpan</p><p class="cx-text">${
          err.response?.data?.message || "Terjadi kesalahan pada server."
        }</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Mengerti",
        didOpen: injectSwalStyle,
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteArtist = async (id) => {
    const result = await Swal.fire({
      html: `
        ${deleteIconHtml}
        <p class="cx-title" style="font-size:1.25rem;margin-bottom:6px;">Hapus artist ini?</p>
        <p class="cx-text">Data dan foto yang sudah dihapus tidak bisa dikembalikan lagi.</p>
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
      await api.delete(`/artists/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Swal.fire({
        html: `${successIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Artist dihapus</p><p class="cx-text">Data berhasil dihapus dari sistem.</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Oke",
        timer: 1800,
        didOpen: injectSwalStyle,
      });
      await getArtists();
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

  function injectSwalStyle() {
    if (document.getElementById("cx-swal-style")) return;
    const style = document.createElement("style");
    style.id = "cx-swal-style";
    style.innerHTML = SWAL_BASE_STYLE;
    document.head.appendChild(style);
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col justify-center items-center gap-5 bg-[#0b0b13] text-white">
        <div className="relative">
          <div className="w-12 h-12 border-[3px] border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
          <div className="absolute inset-0 w-12 h-12 border-[3px] border-transparent border-b-fuchsia-500/40 rounded-full animate-spin [animation-direction:reverse] [animation-duration:1.2s]" />
        </div>
        <p className="text-sm text-gray-500 tracking-wide">Memuat data artist...</p>
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
            const active = item.href === "/artist";
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
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Manajemen Artis</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Kelola semua musisi yang tampil di konser.
            </p>
          </div>

          <button
            onClick={openAddModal}
            disabled={genres.length === 0}
            title={genres.length === 0 ? "Tambahkan genre terlebih dahulu" : ""}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-violet-600/25 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FaPlus size={12} />
            Tambah Artist
          </button>
        </header>

        <div className="p-6 lg:p-10 space-y-6 flex-1">
          <div className="bg-[#141420] rounded-2xl border border-white/[0.06] p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
              <input
                type="text"
                placeholder="Cari nama, genre, atau deskripsi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/[0.04] border border-white/10 rounded-xl pl-11 pr-4 py-2.5 w-full text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 placeholder:text-gray-500 transition"
              />
            </div>

            <div className="relative">
              <FaFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none" />
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="appearance-none bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 text-gray-300 transition cursor-pointer"
              >
                <option value="all">Semua Genre</option>
                {genres.map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-[#141420] rounded-2xl border border-white/[0.06] overflow-hidden shadow-xl shadow-black/20">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-gray-500 text-[11px] uppercase tracking-wider">
                    <th className="text-left py-4 px-6 font-semibold">Artist</th>
                    <th className="text-left font-semibold">Genre</th>
                    <th className="text-left font-semibold">Description</th>
                    <th className="text-center pr-6 font-semibold w-28">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-20">
                        <div className="flex flex-col items-center text-center px-4">
                          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
                            <FaUserCircle className="text-gray-600" size={28} />
                          </div>
                          <p className="text-base font-semibold text-gray-300">
                            {search || genreFilter !== "all"
                              ? "Tidak ada artist yang cocok"
                              : "Belum ada data artist"}
                          </p>
                          <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
                            {search || genreFilter !== "all"
                              ? "Coba ubah kata kunci atau filter genre."
                              : "Klik tombol \"Tambah Artist\" untuk mendaftarkan musisi pertama."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((item) => {
                      const imageUrl = getImageUrl(item.photo);
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group"
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3.5">
                              <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-violet-600 to-fuchsia-600 shrink-0 flex items-center justify-center ring-2 ring-white/10 shadow-md">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.nextSibling.style.display = "flex";
                                    }}
                                  />
                                ) : null}
                                <div
                                  className="w-full h-full items-center justify-center text-white/80"
                                  style={{ display: imageUrl ? "none" : "flex" }}
                                >
                                  <FaUserCircle size={20} />
                                </div>
                              </div>
                              <p className="font-semibold text-[13.5px] truncate max-w-[180px]">
                                {item.name}
                              </p>
                            </div>
                          </td>

                          <td>
                            <span className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/20">
                              {item.genre_name}
                            </span>
                          </td>

                          <td className="max-w-[260px] truncate text-gray-500 text-[13px]">
                            {item.description || "—"}
                          </td>

                          <td className="pr-6">
                            <div className="flex justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(item)}
                                className="w-8.5 h-8.5 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 hover:text-white transition"
                                title="Edit"
                              >
                                <FaEdit size={13} />
                              </button>
                              <button
                                onClick={() => deleteArtist(item.id)}
                                disabled={deletingId === item.id}
                                className="w-8.5 h-8.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 flex items-center justify-center text-red-400 transition"
                                title="Hapus"
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

            <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-t border-white/[0.06] text-sm text-gray-500">
              <p className="text-[13px]">
                Menampilkan{" "}
                <span className="text-gray-300 font-medium">
                  {paginated.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
                </span>{" "}
                –{" "}
                <span className="text-gray-300 font-medium">
                  {Math.min(page * PAGE_SIZE, filtered.length)}
                </span>{" "}
                dari{" "}
                <span className="text-gray-300 font-medium">{filtered.length}</span> artist
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center transition"
                >
                  <FaChevronLeft size={11} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 5)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                        p === page
                          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/30"
                          : "bg-white/5 hover:bg-white/10 text-gray-400"
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                {totalPages > 5 && <span className="text-gray-600 px-1">…</span>}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center transition"
                >
                  <FaChevronRight size={11} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !saving) closeModal();
            }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            <div className="relative w-full max-w-[520px] bg-[#141420] border border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600" />

              <div className="flex items-center justify-between px-7 pt-6 pb-2">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {editId ? "Edit Artist" : "Tambah Artist Baru"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editId ? "Perbarui data musisi" : "Daftarkan musisi untuk konser"}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition disabled:opacity-40"
                >
                  <FaTimes size={14} />
                </button>
              </div>

              <div className="px-7 py-5 space-y-5">
                <div className="flex flex-col items-center gap-3">
                  <div
                    onClick={() => !saving && fileInputRef.current?.click()}
                    className="relative w-28 h-28 rounded-full border-2 border-dashed border-white/15 hover:border-violet-500/60 flex items-center justify-center overflow-hidden cursor-pointer transition-all group bg-white/[0.03]"
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-600">
                        <FaUserCircle size={42} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm">
                        <FaCamera className="text-white" size={18} />
                      </div>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="hidden"
                    disabled={saving}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                    className="text-[13px] text-violet-400 font-medium hover:text-violet-300 transition disabled:opacity-50"
                  >
                    {photoPreview ? "Ganti foto" : "Upload foto artist"}
                  </button>
                  <p className="text-[11px] text-gray-600 -mt-1">JPG, PNG, WEBP • max 2MB</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5">
                      Nama Artist <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Contoh: Tulus, Raisa, Coldplay..."
                      value={form.name}
                      onChange={handleChange}
                      disabled={saving}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 placeholder:text-gray-600 transition disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5">
                      Genre <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="genre_id"
                        value={form.genre_id}
                        onChange={handleChange}
                        disabled={saving}
                        className="w-full appearance-none bg-white/[0.04] border border-white/10 rounded-xl pl-4 pr-11 py-3 text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition disabled:opacity-50 cursor-pointer text-white"
                      >
                        <option value="" className="bg-[#141420] text-gray-400">
                          — Pilih Genre —
                        </option>
                        {genres.map((genre) => (
                          <option
                            key={genre.id}
                            value={genre.id}
                            className="bg-[#141420] text-white"
                          >
                            {genre.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
                          <FaChevronDown size={11} className="text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5">
                      Deskripsi
                    </label>
                    <textarea
                      name="description"
                      placeholder="Ceritakan singkat tentang artist ini..."
                      value={form.description}
                      onChange={handleChange}
                      rows={3}
                      disabled={saving}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 placeholder:text-gray-600 resize-none transition disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div className="px-7 py-5 border-t border-white/[0.06] bg-white/[0.02] flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 text-gray-300 transition disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={saveArtist}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-600/25 transition-all disabled:opacity-60 flex items-center gap-2 min-w-[120px] justify-center"
                >
                  {saving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Menyimpan
                    </>
                  ) : editId ? (
                    "Simpan Perubahan"
                  ) : (
                    "Tambah Artist"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}