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
  FaSignOutAlt,
  FaUserShield,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaLock,
  FaTimes,
} from "react-icons/fa";

const EMPTY_FORM = {
  full_name: "",
  email: "",
  password: "",
};

const AVATAR_STYLES = [
  "from-violet-600 to-fuchsia-600",
  "from-sky-500 to-blue-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
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

const warningIconHtml = `
  <div style="width:64px;height:64px;border-radius:9999px;background:rgba(245,158,11,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
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
      Swal.fire({
        html: `${errorIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Gagal memuat data</p><p class="cx-text">Data user tidak berhasil diambil dari server.</p>`,
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
      Swal.fire({
        html: `${warningIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Data belum lengkap</p><p class="cx-text">Nama dan email wajib diisi.</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Oke",
        didOpen: injectSwalStyle,
      });
      return false;
    }

    if (!editId && !form.password.trim()) {
      Swal.fire({
        html: `${warningIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Data belum lengkap</p><p class="cx-text">Password wajib diisi.</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Oke",
        didOpen: injectSwalStyle,
      });
      return false;
    }

    if (form.password && form.password.length < 6) {
      Swal.fire({
        html: `${warningIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Password terlalu pendek</p><p class="cx-text">Minimal 6 karakter.</p>`,
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
        Swal.fire({
          html: `${successIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Berhasil diupdate</p><p class="cx-text">Data admin sudah tersimpan.</p>`,
          background: "#141420",
          buttonsStyling: false,
          customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
          confirmButtonText: "Oke",
          timer: 1800,
          didOpen: injectSwalStyle,
        });
      } else {
        await api.post("/admins", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire({
          html: `${successIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Admin ditambahkan</p><p class="cx-text">Akun admin baru berhasil dibuat.</p>`,
          background: "#141420",
          buttonsStyling: false,
          customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
          confirmButtonText: "Oke",
          timer: 1800,
          didOpen: injectSwalStyle,
        });
      }

      closeModal();
      await getAdmins();
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

  const deleteAdmin = async (id) => {
    const result = await Swal.fire({
      html: `
        ${deleteIconHtml}
        <p class="cx-title" style="font-size:1.25rem;margin-bottom:6px;">Hapus akun ini?</p>
        <p class="cx-text">Akun yang dihapus tidak bisa login lagi.</p>
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

      await api.delete(`/admins/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Swal.fire({
        html: `${successIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Akun dihapus</p><p class="cx-text">Data berhasil dihapus dari sistem.</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Oke",
        timer: 1800,
        didOpen: injectSwalStyle,
      });
      await getAdmins();
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

  const navItems = [
    { href: "/dashboard", icon: FaHome, label: "Dashboard" },
    { href: "/concert", icon: FaMusic, label: "Jadwal Konser" },
    { href: "/artist", icon: FaUsers, label: "Artis" },
    { href: "/genre", icon: FaTags, label: "Genre Musik" },
    { href: "/ticket", icon: FaTicketAlt, label: "Tiket" },
    { href: "/orders", icon: FaShoppingCart, label: "Orders" },
    { href: "/manage-admin", icon: FaUserShield, label: "Manage Admin" },
  ];

  if (loading) {
    return (
      <div className="h-screen flex flex-col justify-center items-center gap-5 bg-[#0b0b13] text-white">
        <div className="relative">
          <div className="w-12 h-12 border-[3px] border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
          <div className="absolute inset-0 w-12 h-12 border-[3px] border-transparent border-b-fuchsia-500/40 rounded-full animate-spin [animation-direction:reverse] [animation-duration:1.2s]" />
        </div>
        <p className="text-sm text-gray-500 tracking-wide">Memuat data akun...</p>
      </div>
    );
  }

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
            const active = item.href === "/manage-admin";
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
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Manage Admin &amp; User</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Kelola akun administrator dan pengguna yang terdaftar.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-violet-600/25 active:scale-[0.97]"
          >
            <FaPlus size={12} />
            Tambah Admin
          </button>
        </header>

        <div className="p-6 lg:p-10 space-y-6 flex-1">
          {/* SEARCH BAR */}
          <div className="bg-[#141420] rounded-2xl border border-white/[0.06] p-4">
            <div className="relative max-w-md">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/[0.04] border border-white/10 rounded-xl pl-11 pr-4 py-2.5 w-full text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 placeholder:text-gray-500 transition"
              />
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-[#141420] rounded-2xl border border-white/[0.06] overflow-hidden shadow-xl shadow-black/20">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-gray-500 text-[11px] uppercase tracking-wider">
                    <th className="text-left py-4 px-6 font-semibold">Nama</th>
                    <th className="text-left font-semibold">Email</th>
                    <th className="text-left font-semibold">Role</th>
                    <th className="text-left font-semibold">Bergabung</th>
                    <th className="text-center pr-6 font-semibold">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20">
                        <div className="flex flex-col items-center text-center px-4">
                          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
                            <FaUserShield className="text-gray-600" size={28} />
                          </div>
                          <p className="text-base font-semibold text-gray-300">
                            {search ? "Tidak ada akun yang cocok" : "Belum ada data akun"}
                          </p>
                          <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
                            {search
                              ? "Coba ubah kata kunci pencarian."
                              : 'Klik tombol "Tambah Admin" untuk membuat akun admin pertama.'}
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
                          className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group"
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3.5">
                              {item.avatar ? (
                                <img
                                  src={getAvatarUrl(item.avatar)}
                                  alt={item.full_name}
                                  className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-white/10"
                                />
                              ) : (
                                <div
                                  className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarStyle} shrink-0 flex items-center justify-center text-xs font-bold ring-2 ring-white/10`}
                                >
                                  {getInitials(item.full_name)}
                                </div>
                              )}
                              <p className="font-semibold text-[13.5px] flex items-center gap-2">
                                {item.full_name}
                                {isSelf && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/20">
                                    Kamu
                                  </span>
                                )}
                              </p>
                            </div>
                          </td>

                          <td className="text-gray-400 text-[13px]">{item.email}</td>

                          <td>
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase border ${
                                isAdmin
                                  ? "bg-violet-500/15 text-violet-300 border-violet-500/20"
                                  : "bg-sky-500/15 text-sky-400 border-sky-500/20"
                              }`}
                            >
                              {item.role}
                            </span>
                          </td>

                          <td className="text-gray-500 text-[13px]">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
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
                                onClick={() => deleteAdmin(item.id)}
                                disabled={deletingId === item.id || isSelf}
                                title={isSelf ? "Tidak bisa hapus akun sendiri" : "Hapus"}
                                className="w-8.5 h-8.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-red-400 transition"
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

        {/* MODAL */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !saving) closeModal();
            }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            <div className="relative w-full max-w-[500px] bg-[#141420] border border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600" />

              <div className="flex items-center justify-between px-7 pt-6 pb-2">
                <div>
                  <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    {viewOnly ? "Detail User" : editId ? "Edit Admin" : "Tambah Admin Baru"}
                    {viewOnly && <FaLock size={13} className="text-gray-500" />}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {viewOnly
                      ? "Akun user tidak bisa diedit dari sini, hanya bisa dihapus"
                      : editId
                      ? "Perbarui data admin"
                      : "Daftarkan admin baru untuk mengelola sistem"}
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

              <div className="px-7 py-5 space-y-4">
                {viewOnly && (
                  <div className="flex justify-center mb-1">
                    {form.avatar ? (
                      <img
                        src={getAvatarUrl(form.avatar)}
                        alt={form.full_name}
                        className="w-20 h-20 rounded-full object-cover ring-2 ring-white/10"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-lg font-bold ring-2 ring-white/10">
                        {getInitials(form.full_name)}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5">
                    Nama Lengkap {!viewOnly && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    placeholder="Nama Lengkap"
                    value={form.full_name}
                    onChange={handleChange}
                    readOnly={viewOnly}
                    className={`w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none placeholder:text-gray-600 transition ${
                      viewOnly
                        ? "opacity-60 cursor-not-allowed"
                        : "focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5">
                    Email {!viewOnly && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                    readOnly={viewOnly}
                    className={`w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none placeholder:text-gray-600 transition ${
                      viewOnly
                        ? "opacity-60 cursor-not-allowed"
                        : "focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
                    }`}
                  />
                </div>

                {!viewOnly && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5">
                      Password {!editId && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type="password"
                      name="password"
                      placeholder={
                        editId
                          ? "Password baru (kosongkan jika tidak diganti)"
                          : "Minimal 6 karakter"
                      }
                      value={form.password}
                      onChange={handleChange}
                      disabled={saving}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 placeholder:text-gray-600 transition disabled:opacity-50"
                    />
                    {editId && (
                      <p className="text-xs text-gray-500 mt-2">
                        Biarkan kosong kalau tidak ingin mengganti password.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="px-7 py-5 border-t border-white/[0.06] bg-white/[0.02] flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 text-gray-300 transition disabled:opacity-50"
                >
                  {viewOnly ? "Tutup" : "Batal"}
                </button>

                {!viewOnly && (
                  <button
                    onClick={saveAdmin}
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
                      "Tambah Admin"
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