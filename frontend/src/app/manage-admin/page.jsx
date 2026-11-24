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
  FaSignOutAlt,
  FaUserShield,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaLock,
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
  full_name: "",
  email: "",
  password: "",
};

// Avatar inisial: warna datar, bukan gradien
const AVATAR_STYLES = [
  "bg-[#2B3A5E] text-[#9DB7FF]",
  "bg-[#1F4D45] text-[#6EE7B7]",
  "bg-[#5A4320] text-[#F5B83D]",
  "bg-[#5A2A32] text-[#FCA5A5]",
  "bg-[#2D4A5E] text-[#7DD3FC]",
];

const IMAGE_BASE_URL = "http://localhost:3000";

const getAvatarUrl = (avatar) =>
  avatar ? `${IMAGE_BASE_URL}${avatar}` : null;

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
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
  "w-full rounded-lg border border-[#2C3858] bg-[#0F1626] px-3.5 py-2.5 text-sm text-[#E8ECF4] outline-none transition placeholder:text-[#5E6A87] [color-scheme:dark]";
const INPUT_EDITABLE =
  "focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15 disabled:opacity-50";
const INPUT_LOCKED = "cursor-not-allowed opacity-60";

const LABEL_CLASS = "mb-1.5 block text-sm font-medium";

const ACTION_BTN =
  "flex h-9 w-9 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-white/[0.08] hover:text-[#F5B83D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B83D]";

export default function ManageAdminPage() {
  const router = useRouter();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return admins;

    return admins.filter((item) => {
      const name = item.full_name?.toLowerCase() ?? "";
      const email = item.email?.toLowerCase() ?? "";
      return name.includes(keyword) || email.includes(keyword);
    });
  }, [admins, search]);

  useEffect(() => {
    getAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAdmins = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/");
        return;
      }

      const res = await api.get("/admins", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAdmins(res.data.data || []);
      setCurrentAdminId(res.data.currentAdminId ?? null);
    } catch (err) {
      notify("error", "Gagal memuat data", "Data user tidak berhasil diambil dari server.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  const handleChange = (e) => {
    if (viewOnly) return;
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setViewOnly(false);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditId(item.id);
    setForm({
      full_name: item.full_name ?? "",
      email: item.email ?? "",
      password: "",
      avatar: item.avatar ?? "",
    });
    setViewOnly(item.role !== "admin"); // user/customer -> read-only
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setViewOnly(false);
  };

  const validateForm = () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      notify("warning", "Data belum lengkap", "Nama dan email wajib diisi.");
      return false;
    }

    if (!editId && !form.password.trim()) {
      notify("warning", "Data belum lengkap", "Kata sandi wajib diisi.");
      return false;
    }

    if (form.password && form.password.length < 6) {
      notify("warning", "Kata sandi terlalu pendek", "Minimal 6 karakter.");
      return false;
    }

    return true;
  };

  const saveAdmin = async () => {
    if (viewOnly) return;
    if (!validateForm()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      const payload = {
        full_name: form.full_name,
        email: form.email,
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      if (editId) {
        await api.put(`/admins/${editId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        notify("success", "Berhasil diupdate", "Data admin sudah tersimpan.", {
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        await api.post("/admins", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        notify("success", "Admin ditambahkan", "Akun admin baru berhasil dibuat.", {
          timer: 1800,
          showConfirmButton: false,
        });
      }

      closeModal();
      await getAdmins();
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

  const deleteAdmin = async (id) => {
    const result = await Swal.fire({
      ...swalTheme,
      icon: "warning",
      title: "Hapus akun ini?",
      text: "Akun yang dihapus tidak bisa login lagi.",
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

      await api.delete(`/admins/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      notify("success", "Akun dihapus", "Data berhasil dihapus dari sistem.", {
        timer: 1800,
        showConfirmButton: false,
      });
      await getAdmins();
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

  const navItems = [
    { href: "/dashboard", icon: FaHome, label: "Dashboard" },
    { href: "/concert", icon: FaMusic, label: "Jadwal Konser" },
    { href: "/artist", icon: FaUsers, label: "Artis" },
    { href: "/genre", icon: FaTags, label: "Genre Musik" },
    { href: "/ticket", icon: FaTicketAlt, label: "Tiket" },
    { href: "/orders", icon: FaShoppingCart, label: "Orders" },
    { href: "/manage-admin", icon: FaUserShield, label: "Manage Admin" },
  ];

  const rootClass = `${display.variable} ${body.variable} font-[family-name:var(--font-body)]`;

  if (loading) {
    return (
      <div
        className={`${rootClass} flex h-screen flex-col items-center justify-center gap-4 bg-[#0C1220] text-[#E8ECF4]`}
      >
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#F5B83D]/25 border-t-[#F5B83D] motion-reduce:animate-none" />
        <p className="text-sm text-[#8B96AD]">Memuat data akun...</p>
      </div>
    );
  }

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
            const active = item.href === "/manage-admin";
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
            <h1 className={`${HD} text-3xl font-bold tracking-tight`}>Admin dan user</h1>
            <p className="mt-1 text-sm text-[#8B96AD]">
              Kelola akun administrator dan pengguna yang terdaftar.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-[#F5B83D] px-5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30"
          >
            <FaPlus size={11} />
            Tambah admin
          </button>
        </header>

        <div className="flex-1 space-y-6 p-10">
          {/* ===== SEARCH ===== */}
          <section className="rounded-2xl bg-[#151D2E] p-5 ring-1 ring-white/[0.06]">
            <div className="relative max-w-md">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#5E6A87]" />
              <input
                type="text"
                placeholder="Cari nama atau email"
                aria-label="Cari nama atau email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#2C3858] bg-[#0F1626] pl-9 pr-4 text-sm outline-none transition placeholder:text-[#5E6A87] focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15"
              />
            </div>
          </section>

          {/* ===== TABEL ===== */}
          <section className="overflow-hidden rounded-2xl bg-[#151D2E] ring-1 ring-white/[0.06]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs text-[#5E6A87]">
                    <th className="px-6 py-4 text-left font-medium">Nama</th>
                    <th className="text-left font-medium">Email</th>
                    <th className="text-left font-medium">Role</th>
                    <th className="text-left font-medium">Bergabung</th>
                    <th className="pr-6 text-center font-medium">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20">
                        <div className="flex flex-col items-center px-4 text-center">
                          <FaUserShield className="mb-3 text-[#5E6A87]" size={28} />
                          <p className="text-sm font-semibold">
                            {search ? "Tidak ada akun yang cocok" : "Belum ada data akun"}
                          </p>
                          <p className="mt-1 max-w-xs text-xs text-[#8B96AD]">
                            {search
                              ? "Coba ubah kata kunci pencarian."
                              : 'Klik "Tambah admin" untuk membuat akun admin pertama.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item, idx) => {
                      const isSelf = item.id === currentAdminId;
                      const isAdmin = item.role === "admin";
                      const avatarStyle = AVATAR_STYLES[idx % AVATAR_STYLES.length];

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.03]"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              {item.avatar ? (
                                <img
                                  src={getAvatarUrl(item.avatar)}
                                  alt={item.full_name}
                                  className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                                />
                              ) : (
                                <div
                                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarStyle}`}
                                >
                                  {getInitials(item.full_name)}
                                </div>
                              )}
                              <p className="flex items-center gap-2 font-semibold">
                                {item.full_name}
                                {isSelf && (
                                  <span className="rounded-full bg-[#F5B83D]/15 px-2 py-0.5 text-[11px] font-semibold text-[#F5B83D]">
                                    Kamu
                                  </span>
                                )}
                              </p>
                            </div>
                          </td>

                          <td className="text-[#C9D1E3]">{item.email}</td>

                          <td>
                            <span
                              className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium capitalize ${
                                isAdmin
                                  ? "bg-[#F5B83D]/10 text-[#F5B83D]"
                                  : "bg-white/[0.06] text-[#C9D1E3]"
                              }`}
                            >
                              {item.role}
                            </span>
                          </td>

                          <td className="text-[#8B96AD]">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
                          </td>

                          <td className="pr-6">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => openEditModal(item)}
                                className={ACTION_BTN}
                                title={isAdmin ? "Edit" : "Lihat detail"}
                                aria-label={`${isAdmin ? "Edit" : "Lihat detail"} ${item.full_name}`}
                              >
                                <FaEdit size={14} />
                              </button>

                              <button
                                onClick={() => deleteAdmin(item.id)}
                                disabled={deletingId === item.id || isSelf}
                                title={isSelf ? "Tidak bisa hapus akun sendiri" : "Hapus"}
                                aria-label={`Hapus ${item.full_name}`}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#8B96AD]"
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

            <div className="relative max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-2xl border border-[#2C3858] bg-[#151D2E] shadow-2xl shadow-black/60">
              <div className="flex items-start justify-between px-7 pb-2 pt-7">
                <div>
                  <h2 className={`${HD} flex items-center gap-2 text-2xl font-bold tracking-tight`}>
                    {viewOnly ? "Detail user" : editId ? "Edit admin" : "Tambah admin"}
                    {viewOnly && <FaLock size={13} className="text-[#5E6A87]" />}
                  </h2>
                  <p className="mt-1 text-sm text-[#8B96AD]">
                    {viewOnly
                      ? "Akun user tidak bisa diedit dari sini, hanya bisa dihapus."
                      : editId
                      ? "Perbarui data admin."
                      : "Daftarkan admin baru untuk mengelola sistem."}
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

              <div className="space-y-4 px-7 py-5">
                {viewOnly && (
                  <div className="mb-1 flex justify-center">
                    {form.avatar ? (
                      <img
                        src={getAvatarUrl(form.avatar)}
                        alt={form.full_name}
                        className="h-20 w-20 rounded-full object-cover ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2D4A5E] text-lg font-bold text-[#7DD3FC]">
                        {getInitials(form.full_name)}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="full_name" className={LABEL_CLASS}>
                    Nama lengkap {!viewOnly && <span className="text-red-300">*</span>}
                  </label>
                  <input
                    id="full_name"
                    type="text"
                    name="full_name"
                    placeholder="Nama lengkap"
                    value={form.full_name}
                    onChange={handleChange}
                    readOnly={viewOnly}
                    className={`${INPUT_CLASS} ${viewOnly ? INPUT_LOCKED : INPUT_EDITABLE}`}
                  />
                </div>

                <div>
                  <label htmlFor="email" className={LABEL_CLASS}>
                    Email {!viewOnly && <span className="text-red-300">*</span>}
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="nama@email.com"
                    value={form.email}
                    onChange={handleChange}
                    readOnly={viewOnly}
                    className={`${INPUT_CLASS} ${viewOnly ? INPUT_LOCKED : INPUT_EDITABLE}`}
                  />
                </div>

                {!viewOnly && (
                  <div>
                    <label htmlFor="password" className={LABEL_CLASS}>
                      Kata sandi {!editId && <span className="text-red-300">*</span>}
                    </label>
                    <input
                      id="password"
                      type="password"
                      name="password"
                      autoComplete="new-password"
                      placeholder={
                        editId
                          ? "Kata sandi baru (kosongkan jika tidak diganti)"
                          : "Minimal 6 karakter"
                      }
                      value={form.password}
                      onChange={handleChange}
                      disabled={saving}
                      className={`${INPUT_CLASS} ${INPUT_EDITABLE}`}
                    />
                    {editId && (
                      <p className="mt-2 text-xs text-[#8B96AD]">
                        Biarkan kosong kalau tidak ingin mengganti kata sandi.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-white/[0.06] px-7 py-5">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-[#2C3858] px-5 py-2.5 text-sm font-medium text-[#C9D1E3] transition hover:bg-white/[0.05] disabled:opacity-50"
                >
                  {viewOnly ? "Tutup" : "Batal"}
                </button>

                {!viewOnly && (
                  <button
                    onClick={saveAdmin}
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
                      "Tambah admin"
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}