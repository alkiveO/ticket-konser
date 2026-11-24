"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import Swal from "sweetalert2";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { FaTimes, FaPlus, FaEdit, FaTrash, FaTag, FaChair } from "react-icons/fa";
import SeatManagerModal from "./SeatManagerModal";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});

const HD = "font-[family-name:var(--font-display)]";

const EMPTY_FORM = { name: "", seat_type: "standing", price: "", quota: "", remaining_quota: "" };

const formatRupiah = (value) => {
  const num = Number(value) || 0;
  return num.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
};

// Tema SweetAlert, disamakan dengan halaman Tiket & Orders
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

const ICON_BTN =
  "flex h-8 w-8 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-white/[0.08] hover:text-[#F5B83D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B83D]";

export default function ConcertDetailModal({ concert, onClose, onChanged }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Kategori tiket yang lagi dibuka modal "Kelola Kursi"-nya. null = modal ketutup.
  const [seatCategory, setSeatCategory] = useState(null);

  useEffect(() => {
    if (concert) {
      loadDetail();
    } else {
      setDetail(null);
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concert]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/concerts/${concert.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDetail(res.data.data);
    } catch (err) {
      notify("error", "Gagal memuat data", "Gagal mengambil detail konser.");
    } finally {
      setLoading(false);
    }
  };

  if (!concert) return null;

  const categories = detail?.ticket_categories || [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "quota" && !editId) {
        next.remaining_quota = value;
      }
      return next;
    });
  };

  const handleSeatTypeChange = (value) => {
    setForm((prev) => ({ ...prev, seat_type: value }));
  };

  const openAddForm = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditId(item.id);
    setForm({
      name: item.name ?? "",
      seat_type: item.seat_type ?? "standing",
      price: item.price ?? "",
      quota: item.quota ?? "",
      remaining_quota: item.remaining_quota ?? "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const validateForm = () => {
    if (!form.name.trim() || form.price === "" || form.quota === "") {
      notify(
        "warning",
        "Data belum lengkap",
        "Nama, harga, dan kapasitas wajib diisi."
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

  const saveTicket = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        concert_id: concert.id,
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
        notify("success", "Berhasil diupdate", "Kategori tiket sudah tersimpan.", {
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

      closeForm();
      await loadDetail();
      onChanged?.(); // suruh parent refresh list concert (biar kapasitas ke-update)
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

  const deleteTicket = async (id) => {
    const result = await Swal.fire({
      ...swalTheme,
      icon: "warning",
      title: "Hapus kategori tiket?",
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
      await loadDetail();
      onChanged?.();
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

  const seatTypeOptions = [
    { value: "standing", label: "Berdiri" },
    { value: "seated", label: "Duduk" },
  ];

  return (
    <div
      className={`${rootClass} fixed inset-0 z-50 flex items-center justify-center p-4 text-[#E8ECF4]`}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      <div className="relative flex max-h-[88vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-[#2C3858] bg-[#151D2E] shadow-2xl shadow-black/60">
        {/* HEADER */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] px-7 pb-5 pt-7">
          <div className="min-w-0">
            <h1 className={`${HD} truncate text-2xl font-bold tracking-tight`}>
              {concert.title}
            </h1>
            <p className="mt-1 text-sm text-[#8B96AD]">
              {concert.location} &middot;{" "}
              {concert.concert_date
                ? new Date(concert.concert_date).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "-"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-white/[0.06] hover:text-white"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-14">
              <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#F5B83D]/25 border-t-[#F5B83D] motion-reduce:animate-none" />
              <p className="text-sm text-[#8B96AD]">Memuat data...</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-[#C9D1E3]">
                  <FaTag className="text-[#F5B83D]" size={12} />
                  Kategori tiket
                  <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-medium tabular-nums text-[#8B96AD]">
                    {categories.length}
                  </span>
                </h2>
                {!showForm && (
                  <button
                    onClick={openAddForm}
                    className="flex h-10 items-center gap-2 rounded-lg bg-[#F5B83D] px-4 text-xs font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30"
                  >
                    <FaPlus size={10} />
                    Tambah tiket
                  </button>
                )}
              </div>

              {/* LIST KATEGORI */}
              {categories.length === 0 && !showForm && (
                <div className="flex flex-col items-center rounded-xl bg-[#0F1626] px-4 py-10 text-center ring-1 ring-white/[0.06]">
                  <FaTicketIcon />
                  <p className="text-sm font-semibold">Belum ada kategori tiket</p>
                  <p className="mt-1 max-w-xs text-xs text-[#8B96AD]">
                    Klik &quot;Tambah tiket&quot; untuk membuat kategori tiket pertama
                    konser ini.
                  </p>
                </div>
              )}

              {categories.length > 0 && (
                <div className="mb-4 space-y-2.5">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[#0F1626] px-4 py-3.5 ring-1 ring-white/[0.06] transition hover:ring-white/[0.12]"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          <span className="truncate">{cat.name}</span>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                              cat.seat_type === "seated"
                                ? "bg-[#F5B83D]/10 text-[#F5B83D]"
                                : "bg-white/[0.06] text-[#C9D1E3]"
                            }`}
                          >
                            <FaChair size={9} />
                            {cat.seat_type === "seated" ? "Duduk" : "Berdiri"}
                          </span>
                        </p>
                        <p className="mt-1 text-xs tabular-nums text-[#8B96AD]">
                          <span className="font-medium text-[#C9D1E3]">
                            {formatRupiah(cat.price)}
                          </span>{" "}
                          &middot; Sisa{" "}
                          {cat.remaining_quota === 0 ? (
                            <span className="font-semibold text-red-300">habis</span>
                          ) : (
                            cat.remaining_quota
                          )}{" "}
                          / {cat.quota}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-1">
                        {cat.seat_type === "seated" && (
                          <button
                            onClick={() => setSeatCategory(cat)}
                            title="Kelola kursi"
                            aria-label={`Kelola kursi ${cat.name}`}
                            className={ICON_BTN}
                          >
                            <FaChair size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => openEditForm(cat)}
                          title="Edit"
                          aria-label={`Edit kategori ${cat.name}`}
                          className={ICON_BTN}
                        >
                          <FaEdit size={12} />
                        </button>
                        <button
                          onClick={() => deleteTicket(cat.id)}
                          disabled={deletingId === cat.id}
                          title="Hapus"
                          aria-label={`Hapus kategori ${cat.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-40"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* FORM TAMBAH / EDIT */}
              {showForm && (
                <div className="space-y-5 rounded-xl bg-[#0F1626] p-5 ring-1 ring-white/[0.06]">
                  <p className={`${HD} text-base font-bold tracking-tight`}>
                    {editId ? "Edit kategori tiket" : "Tambah kategori tiket"}
                  </p>

                  <div>
                    <label htmlFor="cd-name" className={LABEL_CLASS}>
                      Nama kategori <span className="text-red-300">*</span>
                    </label>
                    <input
                      id="cd-name"
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
                    <p id="cd-seat-type-label" className={LABEL_CLASS}>
                      Tipe tiket
                    </p>
                    <div
                      className="grid grid-cols-2 gap-3"
                      role="group"
                      aria-labelledby="cd-seat-type-label"
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
                                : "border-[#2C3858] bg-[#151D2E] text-[#8B96AD] hover:border-[#34415F] hover:text-[#C9D1E3]"
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
                        Setelah disimpan, atur nomor kursi lewat tombol kursi di
                        daftar kategori.
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="cd-price" className={LABEL_CLASS}>
                      Harga (Rp) <span className="text-red-300">*</span>
                    </label>
                    <input
                      id="cd-price"
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
                      <label htmlFor="cd-quota" className={LABEL_CLASS}>
                        Kapasitas total <span className="text-red-300">*</span>
                      </label>
                      <input
                        id="cd-quota"
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
                      <label htmlFor="cd-remaining" className={LABEL_CLASS}>
                        Sisa kapasitas
                      </label>
                      <input
                        id="cd-remaining"
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

                  <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-4">
                    <button
                      onClick={closeForm}
                      disabled={saving}
                      className="rounded-lg border border-[#2C3858] px-5 py-2.5 text-sm font-medium text-[#C9D1E3] transition hover:bg-white/[0.05] disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      onClick={saveTicket}
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
                        "Simpan"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL: Kelola Kursi (VIP/VVIP) */}
      <SeatManagerModal
        ticketCategory={seatCategory}
        onClose={() => setSeatCategory(null)}
      />
    </div>
  );
}

// Ikon kecil untuk empty state
function FaTicketIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#5E6A87"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mb-3"
      aria-hidden="true"
    >
      <path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1Z" />
      <path d="M13 5v2M13 17v2M13 11v2" />
    </svg>
  );
}