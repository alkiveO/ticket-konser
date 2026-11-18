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
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaSignOutAlt,
  FaUserShield,
  FaChair,
  FaTimes,
  FaChevronDown,
} from "react-icons/fa";

const EMPTY_FORM = {
  concert_id: "",
  name: "",
  seat_type: "standing",
  price: "",
  quota: "",
  remaining_quota: "",
};

const formatRupiah = (value) => {
  const num = Number(value) || 0;
  return num.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
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

export default function TicketCategoryPage() {
  const router = useRouter();

  // ----- data & UI state -----
  const [categories, setCategories] = useState([]);
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ----- modal & form state -----
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Semua hook di atas, sebelum early return apapun.
  useEffect(() => {
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initData = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/");
      return;
    }

    setLoading(true);
    try {
      const [categoryRes, concertRes] = await Promise.all([
        api.get("/ticket-categories", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get("/concerts", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setCategories(categoryRes.data.data || []);
      setConcerts(concertRes.data.data || []);
    } catch (err) {
      Swal.fire({
        html: `${errorIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Gagal memuat data</p><p class="cx-text">Data kategori tiket tidak berhasil diambil dari server.</p>`,
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

  const getCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/ticket-categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(res.data.data || []);
    } catch (err) {
      Swal.fire({
        html: `${errorIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Gagal memuat data</p><p class="cx-text">Data kategori tiket tidak berhasil diambil dari server.</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Mengerti",
        didOpen: injectSwalStyle,
      });
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return categories;

    return categories.filter((item) => {
      const name = item.name?.toLowerCase() ?? "";
      const concertTitle = item.concert_title?.toLowerCase() ?? "";
      return name.includes(keyword) || concertTitle.includes(keyword);
    });
  }, [categories, search]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };

      // Waktu tambah baru dan quota diubah, otomatis samakan remaining_quota
      // supaya admin tidak perlu isi dua kali untuk kasus normal.
      if (name === "quota" && !editId) {
        next.remaining_quota = value;
      }

      return next;
    });
  };

  const handleSeatTypeChange = (value) => {
    setForm((prev) => ({ ...prev, seat_type: value }));
  };

  const openAddModal = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditId(item.id);
    setForm({
      concert_id: item.concert_id ?? "",
      name: item.name ?? "",
      seat_type: item.seat_type ?? "standing",
      price: item.price ?? "",
      quota: item.quota ?? "",
      remaining_quota: item.remaining_quota ?? "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const validateForm = () => {
    if (!form.concert_id || !form.name.trim() || form.price === "" || form.quota === "") {
      Swal.fire({
        html: `${warningIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Data belum lengkap</p><p class="cx-text">Concert, name, price, dan kapasitas wajib diisi.</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Oke",
        didOpen: injectSwalStyle,
      });
      return false;
    }

    if (Number(form.price) < 0 || Number(form.quota) < 0) {
      Swal.fire({
        html: `${warningIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Data tidak valid</p><p class="cx-text">Price dan kapasitas tidak boleh negatif.</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Oke",
        didOpen: injectSwalStyle,
      });
      return false;
    }

    if (Number(form.remaining_quota) > Number(form.quota)) {
      Swal.fire({
        html: `${warningIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Data tidak valid</p><p class="cx-text">Sisa kapasitas tidak boleh lebih besar dari kapasitas total.</p>`,
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

  const saveCategory = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        concert_id: Number(form.concert_id),
        name: form.name,
        seat_type: form.seat_type,
        price: Number(form.price),
        quota: Number(form.quota),
        remaining_quota: Number(form.remaining_quota),
      };

      if (editId) {
        await api.put(`/ticket-categories/${editId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire({
          html: `${successIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Berhasil diupdate</p><p class="cx-text">Data kategori tiket sudah tersimpan.</p>`,
          background: "#141420",
          buttonsStyling: false,
          customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
          confirmButtonText: "Oke",
          timer: 1800,
          didOpen: injectSwalStyle,
        });
      } else {
        await api.post("/ticket-categories", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire({
          html: `${successIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Kategori ditambahkan</p><p class="cx-text">Kategori tiket baru berhasil dibuat.</p>`,
          background: "#141420",
          buttonsStyling: false,
          customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
          confirmButtonText: "Oke",
          timer: 1800,
          didOpen: injectSwalStyle,
        });
      }

      closeModal();
      await getCategories();
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

  const deleteCategory = async (id) => {
    const result = await Swal.fire({
      html: `
        ${deleteIconHtml}
        <p class="cx-title" style="font-size:1.25rem;margin-bottom:6px;">Hapus kategori tiket ini?</p>
        <p class="cx-text">Data yang dihapus tidak bisa dikembalikan.</p>
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
      await api.delete(`/ticket-categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Swal.fire({
        html: `${successIconHtml}<p class="cx-title" style="font-size:1.15rem;margin-bottom:6px;">Kategori dihapus</p><p class="cx-text">Data berhasil dihapus dari sistem.</p>`,
        background: "#141420",
        buttonsStyling: false,
        customClass: { popup: "cx-popup", confirmButton: "cx-btn cx-btn-confirm-violet" },
        confirmButtonText: "Oke",
        timer: 1800,
        didOpen: injectSwalStyle,
      });
      await getCategories();
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

  if (loading) {
    return (
      <div className="h-screen flex flex-col justify-center items-center gap-5 bg-[#0b0b13] text-white">
        <div className="relative">
          <div className="w-12 h-12 border-[3px] border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
          <div className="absolute inset-0 w-12 h-12 border-[3px] border-transparent border-b-fuchsia-500/40 rounded-full animate-spin [animation-direction:reverse] [animation-duration:1.2s]" />
        </div>
        <p className="text-sm text-gray-500 tracking-wide">Memuat data kategori tiket...</p>
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
            const active = item.href === "/ticket";
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
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Kategori Tiket</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Atur harga dan kapasitas tiket tiap kategori per konser.
            </p>
          </div>

          <button
            onClick={openAddModal}
            disabled={concerts.length === 0}
            title={concerts.length === 0 ? "Tambahkan concert terlebih dahulu" : ""}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-violet-600/25 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FaPlus size={12} />
            Tambah Kategori
          </button>
        </header>

        <div className="p-6 lg:p-10 space-y-6 flex-1">
          {/* SEARCH BAR */}
          <div className="bg-[#141420] rounded-2xl border border-white/[0.06] p-4">
            <div className="relative max-w-md">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
              <input
                type="text"
                placeholder="Cari kategori atau nama konser..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/[0.04] border border-white/10 rounded-xl pl-11 pr-4 py-2.5 w-full text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 placeholder:text-gray-500 transition"
              />
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-[#141420] rounded-2xl border border-white/[0.06] overflow-hidden shadow-xl shadow-black/20">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[920px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-gray-500 text-[11px] uppercase tracking-wider">
                    <th className="text-left py-4 px-6 font-semibold">Kategori</th>
                    <th className="text-left font-semibold">Konser</th>
                    <th className="text-left font-semibold">Tipe</th>
                    <th className="text-right font-semibold">Harga</th>
                    <th className="text-center font-semibold">Kapasitas</th>
                    <th className="text-center font-semibold">Sisa</th>
                    <th className="text-center font-semibold">Terjual</th>
                    <th className="text-center pr-6 font-semibold">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-20">
                        <div className="flex flex-col items-center text-center px-4">
                          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
                            <FaTicketAlt className="text-gray-600" size={28} />
                          </div>
                          <p className="text-base font-semibold text-gray-300">
                            {search
                              ? "Tidak ada kategori yang cocok"
                              : "Belum ada data kategori tiket"}
                          </p>
                          <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
                            {search
                              ? "Coba ubah kata kunci pencarian."
                              : 'Klik tombol "Tambah Kategori" untuk membuat kategori tiket pertama.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group"
                      >
                        <td className="py-4 px-6 font-semibold text-[13.5px]">{item.name}</td>
                        <td className="text-gray-400 text-[13px]">{item.concert_title}</td>
                        <td>
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold items-center gap-1.5 w-fit border ${
                              item.seat_type === "seated"
                                ? "bg-violet-500/15 text-violet-300 border-violet-500/20"
                                : "bg-white/5 text-gray-400 border-white/10"
                            }`}
                          >
                            <FaChair size={10} />
                            {item.seat_type === "seated" ? "Duduk" : "Berdiri"}
                          </span>
                        </td>
                        <td className="text-right font-medium text-[13px]">
                          {formatRupiah(item.price)}
                        </td>
                        <td className="text-center text-gray-300 text-[13px]">{item.quota}</td>
                        <td className="text-center">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                              item.remaining_quota === 0
                                ? "bg-red-500/15 text-red-400 border-red-500/20"
                                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {item.remaining_quota}
                          </span>
                        </td>
                        <td className="text-center text-gray-400 text-[13px]">
                          {item.tickets_sold ?? 0}
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
                              onClick={() => deleteCategory(item.id)}
                              disabled={deletingId === item.id}
                              className="w-8.5 h-8.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 flex items-center justify-center text-red-400 transition"
                              title="Hapus"
                            >
                              <FaTrash size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
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

            <div className="relative w-full max-w-[560px] bg-[#141420] border border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600" />

              <div className="flex items-center justify-between px-7 pt-6 pb-2 shrink-0">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {editId ? "Edit Kategori Tiket" : "Tambah Kategori Tiket"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editId ? "Perbarui detail kategori tiket" : "Buat kategori tiket baru untuk sebuah konser"}
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

              <div className="px-7 py-5 space-y-5 overflow-y-auto">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5">
                    Konser <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="concert_id"
                      value={form.concert_id}
                      onChange={handleChange}
                      disabled={saving}
                      className="w-full appearance-none bg-white/[0.04] border border-white/10 rounded-xl pl-4 pr-11 py-3 text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition disabled:opacity-50 cursor-pointer text-white"
                    >
                      <option value="" className="bg-[#141420] text-gray-400">
                        — Pilih Konser —
                      </option>
                      {concerts.map((concert) => (
                        <option key={concert.id} value={concert.id} className="bg-[#141420] text-white">
                          {concert.title}
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
                    Nama Kategori <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Contoh: VIP, Reguler..."
                    value={form.name}
                    onChange={handleChange}
                    disabled={saving}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 placeholder:text-gray-600 transition disabled:opacity-50"
                  />
                </div>

                {/* TIPE KURSI */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5">
                    Tipe Tiket
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSeatTypeChange("standing")}
                      disabled={saving}
                      className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium border transition disabled:opacity-50 ${
                        form.seat_type === "standing"
                          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 border-transparent text-white shadow-lg shadow-violet-600/25"
                          : "bg-white/[0.04] border-white/10 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      <FaChair size={12} />
                      Berdiri
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSeatTypeChange("seated")}
                      disabled={saving}
                      className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium border transition disabled:opacity-50 ${
                        form.seat_type === "seated"
                          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 border-transparent text-white shadow-lg shadow-violet-600/25"
                          : "bg-white/[0.04] border-white/10 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      <FaChair size={12} />
                      Duduk
                    </button>
                  </div>
                  {form.seat_type === "seated" && (
                    <p className="text-xs text-gray-500 mt-2">
                      Setelah disimpan, atur nomor kursi lewat tombol "Kelola Kursi".
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5">
                    Harga (Rp) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    placeholder="mis. 250000"
                    value={form.price}
                    onChange={handleChange}
                    min="0"
                    disabled={saving}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 placeholder:text-gray-600 transition disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5">
                      Kapasitas Total <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      name="quota"
                      placeholder="mis. 500"
                      value={form.quota}
                      onChange={handleChange}
                      min="0"
                      disabled={saving}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 placeholder:text-gray-600 transition disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5">
                      Sisa Kapasitas
                    </label>
                    <input
                      type="number"
                      name="remaining_quota"
                      placeholder="mis. 500"
                      value={form.remaining_quota}
                      onChange={handleChange}
                      min="0"
                      disabled={saving}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 placeholder:text-gray-600 transition disabled:opacity-50"
                    />
                  </div>
                </div>

                {editId && (
                  <p className="text-xs text-gray-500">
                    Tiket terjual:{" "}
                    <span className="text-gray-300 font-medium">
                      {form.quota && form.remaining_quota !== ""
                        ? Number(form.quota) - Number(form.remaining_quota)
                        : "-"}
                    </span>{" "}
                    (dihitung otomatis dari kapasitas - sisa)
                  </p>
                )}
              </div>

              <div className="px-7 py-5 border-t border-white/[0.06] bg-white/[0.02] flex justify-end gap-3 shrink-0">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 text-gray-300 transition disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  onClick={saveCategory}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-600/25 transition-all disabled:opacity-60 flex items-center gap-2 min-w-[140px] justify-center"
                >
                  {saving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Menyimpan
                    </>
                  ) : editId ? (
                    "Simpan Perubahan"
                  ) : (
                    "Tambah Kategori"
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