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
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaSignOutAlt,
  FaUserShield,
  FaGuitar,
  FaHeadphonesAlt,
  FaCompactDisc,
  FaDrum,
  FaMicrophoneAlt,
  FaTimes,
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
  name: "",
};

// Ikon bergantian supaya tiap genre punya identitas sendiri
// tanpa butuh field tambahan dari backend. Warnanya seragam.
const GENRE_ICONS = [
  FaMusic,
  FaGuitar,
  FaCompactDisc,
  FaHeadphonesAlt,
  FaDrum,
  FaMicrophoneAlt,
];

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

export default function GenrePage() {
  const router = useRouter();

  // ----- data & UI state -----
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ----- modal & form state -----
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    getGenres();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getGenres = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/");
        return;
      }

      const res = await api.get("/genres", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setGenres(res.data.data || []);
    } catch (err) {
      notify("error", "Gagal memuat data", "Data genre tidak berhasil diambil dari server.");
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
    if (!keyword) return genres;

    return genres.filter((item) =>
      (item.name?.toLowerCase() ?? "").includes(keyword)
    );
  }, [genres, search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditId(item.id);
    setForm({ name: item.name ?? "" });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      notify("warning", "Data belum lengkap", "Nama genre wajib diisi.");
      return false;
    }
    return true;
  };

  const saveGenre = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      if (editId) {
        await api.put(
          `/genres/${editId}`,
          { name: form.name },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        notify("success", "Berhasil diupdate", "Data genre sudah tersimpan.", {
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        await api.post(
          "/genres",
          { name: form.name },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        notify("success", "Genre ditambahkan", "Genre baru berhasil didaftarkan.", {
          timer: 1800,
          showConfirmButton: false,
        });
      }

      closeModal();
      await getGenres();
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

  const deleteGenre = async (id) => {
    const result = await Swal.fire({
      ...swalTheme,
      icon: "warning",
      title: "Hapus genre ini?",
      text: "Data yang dihapus tidak bisa dikembalikan. Pastikan tidak ada artis yang masih memakai genre ini.",
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
      await api.delete(`/genres/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      notify("success", "Genre dihapus", "Data berhasil dihapus dari sistem.", {
        timer: 1800,
        showConfirmButton: false,
      });
      await getGenres();
    } catch (err) {
      notify(
        "error",
        "Gagal menghapus",
        err.response?.data?.message ||
          "Kemungkinan genre ini masih dipakai oleh artis."
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
        <p className="text-sm text-[#8B96AD]">Memuat data genre...</p>
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
            const active = item.href === "/genre";
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
            <h1 className={`${HD} text-3xl font-bold tracking-tight`}>Genre musik</h1>
            <p className="mt-1 text-sm text-[#8B96AD]">
              Klasifikasikan konser dan artis berdasarkan genre.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-[#F5B83D] px-5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30"
          >
            <FaPlus size={11} />
            Tambah genre
          </button>
        </header>

        <div className="flex-1 space-y-6 p-10">
          {/* ===== SEARCH ===== */}
          <section className="rounded-2xl bg-[#151D2E] p-5 ring-1 ring-white/[0.06]">
            <div className="relative max-w-md">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#5E6A87]" />
              <input
                type="text"
                placeholder="Cari genre"
                aria-label="Cari genre"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#2C3858] bg-[#0F1626] pl-9 pr-4 text-sm outline-none transition placeholder:text-[#5E6A87] focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15"
              />
            </div>
          </section>

          {/* ===== GRID GENRE ===== */}
          {filtered.length === 0 ? (
            <section className="rounded-2xl bg-[#151D2E] py-20 ring-1 ring-white/[0.06]">
              <div className="flex flex-col items-center px-4 text-center">
                <FaTags className="mb-3 text-[#5E6A87]" size={28} />
                <p className="text-sm font-semibold">
                  {search ? "Tidak ada genre yang cocok" : "Belum ada data genre"}
                </p>
                <p className="mt-1 max-w-xs text-xs text-[#8B96AD]">
                  {search
                    ? "Coba ubah kata kunci pencarian."
                    : 'Klik "Tambah genre" untuk mendaftarkan genre pertama.'}
                </p>
              </div>
            </section>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item, idx) => {
                const Icon = GENRE_ICONS[idx % GENRE_ICONS.length];
                const hasCount =
                  item.artist_count != null || item.event_count != null;

                return (
                  <article
                    key={item.id}
                    className="group relative rounded-2xl bg-[#151D2E] p-6 ring-1 ring-white/[0.06] transition hover:ring-[#F5B83D]/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5B83D]/10 text-[#F5B83D]">
                        <Icon size={18} />
                      </div>

                      {/* Tombol aksi: redup, jelas saat hover atau fokus, tetap bisa dijangkau di layar sentuh */}
                      <div className="flex gap-1 opacity-60 transition group-focus-within:opacity-100 group-hover:opacity-100">
                        <button
                          onClick={() => openEditModal(item)}
                          className={ACTION_BTN}
                          title="Edit"
                          aria-label={`Edit genre ${item.name}`}
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          onClick={() => deleteGenre(item.id)}
                          disabled={deletingId === item.id}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-40"
                          title="Hapus"
                          aria-label={`Hapus genre ${item.name}`}
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className={`${HD} mt-5 text-xl font-bold tracking-tight`}>
                      {item.name}
                    </h3>

                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-[#8B96AD]">
                        {item.description}
                      </p>
                    )}

                    <p className="mt-6 border-t border-white/[0.06] pt-4 text-sm text-[#8B96AD]">
                      {hasCount ? (
                        <>
                          <span className="font-semibold text-[#E8ECF4]">
                            {item.artist_count ?? 0}
                          </span>{" "}
                          artis,{" "}
                          <span className="font-semibold text-[#E8ECF4]">
                            {item.event_count ?? 0}
                          </span>{" "}
                          event
                        </>
                      ) : (
                        `ID #${item.id}`
                      )}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
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

            <div className="relative w-full max-w-[460px] overflow-hidden rounded-2xl border border-[#2C3858] bg-[#151D2E] shadow-2xl shadow-black/60">
              <div className="flex items-start justify-between px-7 pb-2 pt-7">
                <div>
                  <h2 className={`${HD} text-2xl font-bold tracking-tight`}>
                    {editId ? "Edit genre" : "Tambah genre"}
                  </h2>
                  <p className="mt-1 text-sm text-[#8B96AD]">
                    {editId ? "Perbarui nama genre." : "Daftarkan genre musik baru."}
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

              <div className="px-7 py-5">
                <label htmlFor="name" className={LABEL_CLASS}>
                  Nama genre <span className="text-red-300">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Contoh: Pop, Rock, Jazz"
                  value={form.name}
                  onChange={handleChange}
                  autoFocus
                  disabled={saving}
                  className={INPUT_CLASS}
                />
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
                  onClick={saveGenre}
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
                    "Tambah genre"
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