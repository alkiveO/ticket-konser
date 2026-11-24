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

// Tema SweetAlert supaya cocok dengan tampilan gelap
const swalTheme = {
  background: "#151D2E",
  color: "#E8ECF4",
  confirmButtonColor: "#F5B83D",
  cancelButtonColor: "#2C3858",
  customClass: { confirmButton: "!text-[#1A1305] !font-semibold" },
};

const notify = (icon, title, text, extra = {}) =>
  Swal.fire({ ...swalTheme, icon, title, text, ...extra });

const INPUT_CLASS =
  "w-full rounded-lg border border-[#2C3858] bg-[#0F1626] px-3.5 py-2.5 text-sm text-[#E8ECF4] outline-none transition placeholder:text-[#5E6A87] focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15 disabled:opacity-50 [color-scheme:dark]";

const LABEL_CLASS = "mb-1.5 block text-sm font-medium";

const ACTION_BTN =
  "flex h-9 w-9 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-white/[0.08] hover:text-[#F5B83D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B83D]";

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
      notify("error", "Gagal memuat data", "Data artis tidak berhasil diambil dari server.");
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
      notify("error", "Error", "Gagal mengambil data artis");
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
      notify("warning", "Format salah", "Foto harus JPG, PNG, atau WEBP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      notify("warning", "Terlalu besar", "Ukuran foto maksimal 2MB.");
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
      notify("warning", "Data belum lengkap", "Nama dan genre wajib diisi.");
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
        notify("success", "Berhasil diupdate", "Data artis sudah tersimpan.", {
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        await api.post("/artists", formData, { headers });
        notify("success", "Artis ditambahkan", "Musisi baru berhasil didaftarkan.", {
          timer: 1800,
          showConfirmButton: false,
        });
      }

      closeModal();
      await getArtists();
    } catch (err) {
      notify(
        "error",
        "Gagal menyimpan",
        err.response?.data?.message || "Terjadi kesalahan pada server."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteArtist = async (id) => {
    const result = await Swal.fire({
      ...swalTheme,
      icon: "warning",
      title: "Hapus artis ini?",
      text: "Data dan foto yang sudah dihapus tidak bisa dikembalikan.",
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
      await api.delete(`/artists/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      notify("success", "Artis dihapus", "Data berhasil dihapus dari sistem.", {
        timer: 1800,
        showConfirmButton: false,
      });
      await getArtists();
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
        <p className="text-sm text-[#8B96AD]">Memuat data artis...</p>
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

  const hasFilter = search || genreFilter !== "all";

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
            const active = item.href === "/artist";
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
            <h1 className={`${HD} text-3xl font-bold tracking-tight`}>Artis</h1>
            <p className="mt-1 text-sm text-[#8B96AD]">
              Kelola semua musisi yang tampil di konser.
            </p>
          </div>

          <button
            onClick={openAddModal}
            disabled={genres.length === 0}
            title={genres.length === 0 ? "Tambahkan genre terlebih dahulu" : ""}
            className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-[#F5B83D] px-5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FaPlus size={11} />
            Tambah artis
          </button>
        </header>

        <div className="flex-1 space-y-6 p-10">
          {/* ===== SEARCH & FILTER ===== */}
          <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#151D2E] p-5 ring-1 ring-white/[0.06]">
            <div className="relative min-w-[220px] flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#5E6A87]" />
              <input
                type="text"
                placeholder="Cari nama, genre, atau deskripsi"
                aria-label="Cari artis"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#2C3858] bg-[#0F1626] pl-9 pr-4 text-sm outline-none transition placeholder:text-[#5E6A87] focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15"
              />
            </div>

            <div className="relative">
              <FaFilter className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#5E6A87]" />
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                aria-label="Filter genre"
                className="h-11 cursor-pointer appearance-none rounded-lg border border-[#2C3858] bg-[#0F1626] pl-9 pr-9 text-sm text-[#C9D1E3] outline-none transition focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15 [color-scheme:dark]"
              >
                <option value="all">Semua genre</option>
                {genres.map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.name}
                  </option>
                ))}
              </select>
              <FaChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-[#5E6A87]" />
            </div>
          </section>

          {/* ===== TABEL ===== */}
          <section className="overflow-hidden rounded-2xl bg-[#151D2E] ring-1 ring-white/[0.06]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs text-[#5E6A87]">
                    <th className="px-6 py-4 text-left font-medium">Artis</th>
                    <th className="text-left font-medium">Genre</th>
                    <th className="text-left font-medium">Deskripsi</th>
                    <th className="w-28 pr-6 text-center font-medium">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-20">
                        <div className="flex flex-col items-center px-4 text-center">
                          <FaUserCircle className="mb-3 text-[#5E6A87]" size={28} />
                          <p className="text-sm font-semibold">
                            {hasFilter
                              ? "Tidak ada artis yang cocok"
                              : "Belum ada data artis"}
                          </p>
                          <p className="mt-1 max-w-xs text-xs text-[#8B96AD]">
                            {hasFilter
                              ? "Coba ubah kata kunci atau filter genre."
                              : "Klik \"Tambah artis\" untuk mendaftarkan musisi pertama."}
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
                          className="border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.03]"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1B2539] ring-1 ring-white/10">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.nextSibling.style.display = "flex";
                                    }}
                                  />
                                ) : null}
                                <div
                                  className="h-full w-full items-center justify-center text-[#5E6A87]"
                                  style={{ display: imageUrl ? "none" : "flex" }}
                                >
                                  <FaUserCircle size={20} />
                                </div>
                              </div>
                              <p className="max-w-[180px] truncate font-semibold">
                                {item.name}
                              </p>
                            </div>
                          </td>

                          <td>
                            <span className="inline-flex rounded-md bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-[#C9D1E3]">
                              {item.genre_name}
                            </span>
                          </td>

                          <td className="max-w-[260px] truncate text-[#8B96AD]">
                            {item.description || "-"}
                          </td>

                          <td className="pr-6">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => openEditModal(item)}
                                className={ACTION_BTN}
                                title="Edit"
                                aria-label={`Edit ${item.name}`}
                              >
                                <FaEdit size={14} />
                              </button>
                              <button
                                onClick={() => deleteArtist(item.id)}
                                disabled={deletingId === item.id}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-40"
                                title="Hapus"
                                aria-label={`Hapus ${item.name}`}
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
                Menampilkan{" "}
                <span className="font-medium text-[#E8ECF4]">
                  {paginated.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
                </span>{" "}
                -{" "}
                <span className="font-medium text-[#E8ECF4]">
                  {Math.min(page * PAGE_SIZE, filtered.length)}
                </span>{" "}
                dari{" "}
                <span className="font-medium text-[#E8ECF4]">{filtered.length}</span>{" "}
                artis
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

        {/* ===== MODAL ===== */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget && !saving) closeModal();
            }}
          >
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

            <div className="relative max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-2xl border border-[#2C3858] bg-[#151D2E] shadow-2xl shadow-black/60">
              <div className="flex items-start justify-between px-7 pb-2 pt-7">
                <div>
                  <h2 className={`${HD} text-2xl font-bold tracking-tight`}>
                    {editId ? "Edit artis" : "Tambah artis"}
                  </h2>
                  <p className="mt-1 text-sm text-[#8B96AD]">
                    {editId ? "Perbarui data musisi." : "Daftarkan musisi untuk konser."}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  disabled={saving}
                  aria-label="Tutup"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                >
                  <FaTimes size={14} />
                </button>
              </div>

              <div className="space-y-5 px-7 py-5">
                <div className="flex flex-col items-center gap-2.5">
                  <div
                    onClick={() => !saving && fileInputRef.current?.click()}
                    className="group relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#34415F] bg-[#0F1626] transition hover:border-[#F5B83D]"
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FaUserCircle size={40} className="text-[#34415F]" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                      <FaCamera className="text-white" size={18} />
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
                    className="text-sm font-semibold text-[#F5B83D] transition hover:text-[#FFC857] disabled:opacity-50"
                  >
                    {photoPreview ? "Ganti foto" : "Upload foto artis"}
                  </button>
                  <p className="-mt-1 text-xs text-[#5E6A87]">JPG, PNG, atau WEBP, maks. 2MB</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className={LABEL_CLASS}>
                      Nama artis <span className="text-red-300">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      placeholder="Contoh: Tulus, Raisa, Coldplay"
                      value={form.name}
                      onChange={handleChange}
                      disabled={saving}
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label htmlFor="genre_id" className={LABEL_CLASS}>
                      Genre <span className="text-red-300">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="genre_id"
                        name="genre_id"
                        value={form.genre_id}
                        onChange={handleChange}
                        disabled={saving}
                        className={`${INPUT_CLASS} cursor-pointer appearance-none pr-10`}
                      >
                        <option value="">Pilih genre</option>
                        {genres.map((genre) => (
                          <option key={genre.id} value={genre.id}>
                            {genre.name}
                          </option>
                        ))}
                      </select>
                      <FaChevronDown
                        size={11}
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#5E6A87]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className={LABEL_CLASS}>
                      Deskripsi
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      placeholder="Ceritakan singkat tentang artis ini"
                      value={form.description}
                      onChange={handleChange}
                      rows={3}
                      disabled={saving}
                      className={`${INPUT_CLASS} resize-none`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/[0.06] px-7 py-5">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-[#2C3858] px-5 py-2.5 text-sm font-medium text-[#C9D1E3] transition hover:bg-white/[0.05] disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={saveArtist}
                  disabled={saving}
                  className="flex min-w-[130px] items-center justify-center gap-2 rounded-lg bg-[#F5B83D] px-5 py-2.5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1A1305]/25 border-t-[#1A1305] motion-reduce:animate-none" />
                      Menyimpan
                    </>
                  ) : editId ? (
                    "Simpan perubahan"
                  ) : (
                    "Tambah artis"
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