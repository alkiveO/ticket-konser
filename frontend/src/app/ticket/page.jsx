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
  FaChair,
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
      notify(
        "error",
        "Gagal memuat data",
        "Data kategori tiket tidak berhasil diambil dari server."
      );
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
      notify(
        "error",
        "Gagal memuat data",
        "Data kategori tiket tidak berhasil diambil dari server."
      );
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
      notify(
        "warning",
        "Data belum lengkap",
        "Konser, nama kategori, harga, dan kapasitas wajib diisi."
      );
      return false;
    }

    if (Number(form.price) < 0 || Number(form.quota) < 0) {
      notify("warning", "Data tidak valid", "Harga dan kapasitas tidak boleh negatif.");
      return false;
    }

    if (Number(form.remaining_quota) > Number(form.quota)) {
      notify(
        "warning",
        "Data tidak valid",
        "Sisa kapasitas tidak boleh lebih besar dari kapasitas total."
      );
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
        notify("success", "Berhasil diupdate", "Data kategori tiket sudah tersimpan.", {
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        await api.post("/ticket-categories", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        notify("success", "Kategori ditambahkan", "Kategori tiket baru berhasil dibuat.", {
          timer: 1800,
          showConfirmButton: false,
        });
      }

      closeModal();
      await getCategories();
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

  const deleteCategory = async (id) => {
    const result = await Swal.fire({
      ...swalTheme,
      icon: "warning",
      title: "Hapus kategori tiket ini?",
      text: "Data yang dihapus tidak bisa dikembalikan.",
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
      await api.delete(`/ticket-categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      notify("success", "Kategori dihapus", "Data berhasil dihapus dari sistem.", {
        timer: 1800,
        showConfirmButton: false,
      });
      await getCategories();
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
        <p className="text-sm text-[#8B96AD]">Memuat data kategori tiket...</p>
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

  const seatTypeOptions = [
    { value: "standing", label: "Berdiri" },
    { value: "seated", label: "Duduk" },
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
            const active = item.href === "/ticket";
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
            <h1 className={`${HD} text-3xl font-bold tracking-tight`}>Kategori tiket</h1>
            <p className="mt-1 text-sm text-[#8B96AD]">
              Atur harga dan kapasitas tiket tiap kategori per konser.
            </p>
          </div>

          <button
            onClick={openAddModal}
            disabled={concerts.length === 0}
            title={concerts.length === 0 ? "Tambahkan konser terlebih dahulu" : ""}
            className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-[#F5B83D] px-5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FaPlus size={11} />
            Tambah kategori
          </button>
        </header>

        <div className="flex-1 space-y-6 p-10">
          {/* ===== SEARCH ===== */}
          <section className="rounded-2xl bg-[#151D2E] p-5 ring-1 ring-white/[0.06]">
            <div className="relative max-w-md">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#5E6A87]" />
              <input
                type="text"
                placeholder="Cari kategori atau nama konser"
                aria-label="Cari kategori atau nama konser"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#2C3858] bg-[#0F1626] pl-9 pr-4 text-sm outline-none transition placeholder:text-[#5E6A87] focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15"
              />
            </div>
          </section>

          {/* ===== TABEL ===== */}
          <section className="overflow-hidden rounded-2xl bg-[#151D2E] ring-1 ring-white/[0.06]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs text-[#5E6A87]">
                    <th className="px-6 py-4 text-left font-medium">Kategori</th>
                    <th className="px-3 text-left font-medium">Konser</th>
                    <th className="px-3 text-left font-medium">Tipe</th>
                    <th className="px-3 text-right font-medium">Harga</th>
                    <th className="px-3 text-center font-medium">Kapasitas</th>
                    <th className="px-3 text-center font-medium">Sisa</th>
                    <th className="px-3 text-center font-medium">Terjual</th>
                    <th className="pr-6 text-center font-medium">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-20">
                        <div className="flex flex-col items-center px-4 text-center">
                          <FaTicketAlt className="mb-3 text-[#5E6A87]" size={28} />
                          <p className="text-sm font-semibold">
                            {search
                              ? "Tidak ada kategori yang cocok"
                              : "Belum ada data kategori tiket"}
                          </p>
                          <p className="mt-1 max-w-xs text-xs text-[#8B96AD]">
                            {search
                              ? "Coba ubah kata kunci pencarian."
                              : 'Klik "Tambah kategori" untuk membuat kategori tiket pertama.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.03]"
                      >
                        <td className="px-6 py-4 font-semibold">{item.name}</td>
                        <td className="px-3 text-[#8B96AD]">{item.concert_title}</td>
                        <td className="px-3">
                          <span
                            className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                              item.seat_type === "seated"
                                ? "bg-[#F5B83D]/10 text-[#F5B83D]"
                                : "bg-white/[0.06] text-[#C9D1E3]"
                            }`}
                          >
                            <FaChair size={10} />
                            {item.seat_type === "seated" ? "Duduk" : "Berdiri"}
                          </span>
                        </td>
                        <td className="px-3 text-right font-medium tabular-nums">
                          {formatRupiah(item.price)}
                        </td>
                        <td className="px-3 text-center tabular-nums text-[#C9D1E3]">
                          {item.quota}
                        </td>
                        <td className="px-3 text-center tabular-nums">
                          {item.remaining_quota === 0 ? (
                            <span className="inline-flex rounded-md bg-red-400/10 px-2.5 py-1 text-xs font-semibold text-red-300">
                              Habis
                            </span>
                          ) : (
                            <span className="text-[#C9D1E3]">{item.remaining_quota}</span>
                          )}
                        </td>
                        <td className="px-3 text-center tabular-nums text-[#8B96AD]">
                          {item.tickets_sold ?? 0}
                        </td>
                        <td className="pr-6">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => openEditModal(item)}
                              className={ACTION_BTN}
                              title="Edit"
                              aria-label={`Edit kategori ${item.name}`}
                            >
                              <FaEdit size={14} />
                            </button>

                            <button
                              onClick={() => deleteCategory(item.id)}
                              disabled={deletingId === item.id}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-40"
                              title="Hapus"
                              aria-label={`Hapus kategori ${item.name}`}
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
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

            <div className="relative flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-[#2C3858] bg-[#151D2E] shadow-2xl shadow-black/60">
              <div className="flex shrink-0 items-start justify-between px-7 pb-2 pt-7">
                <div>
                  <h2 className={`${HD} text-2xl font-bold tracking-tight`}>
                    {editId ? "Edit kategori tiket" : "Tambah kategori tiket"}
                  </h2>
                  <p className="mt-1 text-sm text-[#8B96AD]">
                    {editId
                      ? "Perbarui detail kategori tiket."
                      : "Buat kategori tiket baru untuk sebuah konser."}
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

              <div className="space-y-5 overflow-y-auto px-7 py-5">
                <div>
                  <label htmlFor="concert_id" className={LABEL_CLASS}>
                    Konser <span className="text-red-300">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="concert_id"
                      name="concert_id"
                      value={form.concert_id}
                      onChange={handleChange}
                      disabled={saving}
                      className={`${INPUT_CLASS} cursor-pointer appearance-none pr-10`}
                    >
                      <option value="">Pilih konser</option>
                      {concerts.map((concert) => (
                        <option key={concert.id} value={concert.id}>
                          {concert.title}
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
                  <label htmlFor="name" className={LABEL_CLASS}>
                    Nama kategori <span className="text-red-300">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    placeholder="Contoh: VIP, Reguler"
                    value={form.name}
                    onChange={handleChange}
                    disabled={saving}
                    className={INPUT_CLASS}
                  />
                </div>

                {/* TIPE TIKET */}
                <div>
                  <p id="seat-type-label" className={LABEL_CLASS}>
                    Tipe tiket
                  </p>
                  <div
                    className="grid grid-cols-2 gap-3"
                    role="group"
                    aria-labelledby="seat-type-label"
                  >
                    {seatTypeOptions.map((opt) => {
                      const selected = form.seat_type === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSeatTypeChange(opt.value)}
                          disabled={saving}
                          aria-pressed={selected}
                          className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/15 disabled:opacity-50 ${
                            selected
                              ? "border-[#F5B83D] bg-[#F5B83D]/10 text-[#F5B83D]"
                              : "border-[#2C3858] bg-[#0F1626] text-[#8B96AD] hover:border-[#34415F] hover:text-[#C9D1E3]"
                          }`}
                        >
                          <FaChair size={12} />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {form.seat_type === "seated" && (
                    <p className="mt-2 text-xs text-[#8B96AD]">
                      Setelah disimpan, atur denah dan nomor kursi lewat menu
                      Jadwal Konser.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="price" className={LABEL_CLASS}>
                    Harga (Rp) <span className="text-red-300">*</span>
                  </label>
                  <input
                    id="price"
                    type="number"
                    name="price"
                    placeholder="Contoh: 250000"
                    value={form.price}
                    onChange={handleChange}
                    min="0"
                    disabled={saving}
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="quota" className={LABEL_CLASS}>
                      Kapasitas total <span className="text-red-300">*</span>
                    </label>
                    <input
                      id="quota"
                      type="number"
                      name="quota"
                      placeholder="Contoh: 500"
                      value={form.quota}
                      onChange={handleChange}
                      min="0"
                      disabled={saving}
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label htmlFor="remaining_quota" className={LABEL_CLASS}>
                      Sisa kapasitas
                    </label>
                    <input
                      id="remaining_quota"
                      type="number"
                      name="remaining_quota"
                      placeholder="Contoh: 500"
                      value={form.remaining_quota}
                      onChange={handleChange}
                      min="0"
                      disabled={saving}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                {editId && (
                  <p className="text-xs text-[#8B96AD]">
                    Tiket terjual:{" "}
                    <span className="font-medium text-[#E8ECF4]">
                      {form.quota && form.remaining_quota !== ""
                        ? Number(form.quota) - Number(form.remaining_quota)
                        : "-"}
                    </span>{" "}
                    (dihitung otomatis dari kapasitas dikurangi sisa)
                  </p>
                )}
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-white/[0.06] px-7 py-5">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-[#2C3858] px-5 py-2.5 text-sm font-medium text-[#C9D1E3] transition hover:bg-white/[0.05] disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  onClick={saveCategory}
                  disabled={saving}
                  className="flex min-w-[150px] items-center justify-center gap-2 rounded-lg bg-[#F5B83D] px-5 py-2.5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1A1305]/25 border-t-[#1A1305] motion-reduce:animate-none" />
                      Menyimpan
                    </>
                  ) : editId ? (
                    "Simpan perubahan"
                  ) : (
                    "Tambah kategori"
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