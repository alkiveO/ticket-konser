"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import Swal from "sweetalert2";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { FaTimes, FaPlus, FaTrash, FaChair, FaEdit } from "react-icons/fa";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});

const HD = "font-[family-name:var(--font-display)]";

// Status kursi tetap semantik: abu = tersedia, kuning = terkunci, merah = terisi
const STATUS_STYLE = {
  available: "bg-white/[0.04] text-[#C9D1E3] ring-1 ring-white/10",
  locked: "bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20",
  booked: "bg-red-400/10 text-red-300 ring-1 ring-red-400/20",
};

// Tema SweetAlert, disamakan dengan halaman Tiket, Orders & modal lainnya
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
  "h-11 w-full rounded-lg border border-[#2C3858] bg-[#0F1626] px-3.5 text-sm text-[#E8ECF4] outline-none transition placeholder:text-[#5E6A87] focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15 disabled:opacity-50 [color-scheme:dark]";

const LABEL_CLASS = "mb-1.5 block text-sm font-medium";

const ICON_BTN =
  "flex h-8 w-8 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-white/[0.08] hover:text-[#F5B83D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B83D]";

export default function SeatManagerModal({ ticketCategory, onClose }) {
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState([]); // flat list dari backend

  const [prefix, setPrefix] = useState("");
  const [maxNumber, setMaxNumber] = useState("");
  const [saving, setSaving] = useState(false);

  // State buat edit huruf yang udah ada
  const [editingPrefixId, setEditingPrefixId] = useState(null);
  const [editPrefixValue, setEditPrefixValue] = useState("");
  const [editMaxValue, setEditMaxValue] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (ticketCategory && ticketCategory.seat_type === "seated") {
      loadSeats();
    } else {
      setSeats([]);
      setPrefix("");
      setMaxNumber("");
      setEditingPrefixId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketCategory]);

  const loadSeats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(
        `/admin/ticket-categories/${ticketCategory.id}/seats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSeats(res.data.data || []);
    } catch (err) {
      notify("error", "Gagal memuat data", "Gagal mengambil data kursi.");
    } finally {
      setLoading(false);
    }
  };

  if (!ticketCategory) return null;

  const rootClass = `${display.variable} ${body.variable} font-[family-name:var(--font-body)]`;

  // Guard: kategori "berdiri" gak punya kursi, jadi modal ini gak relevan
  if (ticketCategory.seat_type !== "seated") {
    return (
      <div
        className={`${rootClass} fixed inset-0 z-[60] flex items-center justify-center p-4 text-[#E8ECF4]`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

        <div className="relative w-full max-w-[420px] rounded-2xl border border-[#2C3858] bg-[#151D2E] p-8 text-center shadow-2xl shadow-black/60">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5B83D]/10 text-[#F5B83D]">
            <FaChair size={20} />
          </span>
          <h1 className={`${HD} mb-2 text-xl font-bold tracking-tight`}>
            Kategori berdiri
          </h1>
          <p className="mb-6 text-sm text-[#8B96AD]">
            Kategori{" "}
            <span className="font-medium text-[#C9D1E3]">{ticketCategory.name}</span>{" "}
            bertipe berdiri (standing), jadi tidak menggunakan kursi bernomor.
          </p>
          <button
            onClick={onClose}
            className="rounded-lg bg-[#F5B83D] px-6 py-2.5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  // kelompokin flat list jadi { A: [...], B: [...] }
  const grouped = seats.reduce((acc, seat) => {
    acc[seat.prefix] = acc[seat.prefix] || [];
    acc[seat.prefix].push(seat);
    return acc;
  }, {});

  const validateForm = () => {
    if (!prefix.trim()) {
      notify("warning", "Data belum lengkap", "Huruf prefix wajib diisi (mis. A).");
      return false;
    }
    if (!maxNumber || Number(maxNumber) <= 0) {
      notify("warning", "Data belum lengkap", "Maksimal nomor per huruf wajib diisi.");
      return false;
    }
    if (Number(maxNumber) > 200) {
      notify("warning", "Terlalu banyak", "Maksimal 200 kursi per huruf.");
      return false;
    }
    return true;
  };

  const generateSeats = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await api.post(
        `/admin/ticket-categories/${ticketCategory.id}/seat-prefixes`,
        {
          prefix: prefix.trim().toUpperCase(),
          max_number: Number(maxNumber),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      notify(
        "success",
        "Berhasil",
        `Kursi ${prefix.toUpperCase()}1 - ${prefix.toUpperCase()}${maxNumber} berhasil dibuat.`,
        { timer: 1800, showConfirmButton: false }
      );

      setPrefix("");
      setMaxNumber("");
      await loadSeats();
    } catch (err) {
      notify(
        "error",
        "Gagal generate kursi",
        err.response?.data?.message || "Terjadi kesalahan pada server."
      );
    } finally {
      setSaving(false);
    }
  };

  const deletePrefix = async (prefixLetter, seatPrefixId) => {
    const result = await Swal.fire({
      ...swalTheme,
      icon: "warning",
      title: `Hapus semua kursi ${prefixLetter}?`,
      text: "Semua kursi dengan huruf ini akan terhapus permanen.",
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#DC2626",
      customClass: {},
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      await api.delete(`/admin/seat-prefixes/${seatPrefixId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      notify("success", "Kursi dihapus", "Kursi berhasil dihapus.", {
        timer: 1800,
        showConfirmButton: false,
      });
      await loadSeats();
    } catch (err) {
      notify(
        "error",
        "Gagal menghapus kursi",
        err.response?.data?.message || "Terjadi kesalahan pada server."
      );
    }
  };

  const openEditPrefix = (letter, letterSeats) => {
    setEditingPrefixId(letterSeats[0].seat_prefix_id);
    setEditPrefixValue(letter);
    setEditMaxValue(String(letterSeats.length));
  };

  const cancelEditPrefix = () => {
    setEditingPrefixId(null);
    setEditPrefixValue("");
    setEditMaxValue("");
  };

  const saveEditPrefix = async () => {
    if (!editPrefixValue.trim()) {
      notify("warning", "Data belum lengkap", "Huruf wajib diisi.");
      return;
    }
    if (!editMaxValue || Number(editMaxValue) <= 0) {
      notify("warning", "Data belum lengkap", "Maksimal nomor wajib diisi.");
      return;
    }
    if (Number(editMaxValue) > 200) {
      notify("warning", "Terlalu banyak", "Maksimal 200 kursi per huruf.");
      return;
    }

    setUpdating(true);
    try {
      const token = localStorage.getItem("token");
      await api.put(
        `/admin/seat-prefixes/${editingPrefixId}`,
        {
          prefix: editPrefixValue.trim().toUpperCase(),
          max_number: Number(editMaxValue),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      notify("success", "Kursi diupdate", "Kursi berhasil diupdate.", {
        timer: 1800,
        showConfirmButton: false,
      });
      cancelEditPrefix();
      await loadSeats();
    } catch (err) {
      notify(
        "error",
        "Gagal mengupdate kursi",
        err.response?.data?.message || "Terjadi kesalahan pada server."
      );
    } finally {
      setUpdating(false);
    }
  };

  const totalSeats = seats.length;

  return (
    <div
      className={`${rootClass} fixed inset-0 z-[60] flex items-center justify-center p-4 text-[#E8ECF4]`}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving && !updating) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      <div className="relative flex max-h-[88vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-[#2C3858] bg-[#151D2E] shadow-2xl shadow-black/60">
        {/* HEADER */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] px-7 pb-5 pt-7">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F5B83D]/10 text-[#F5B83D]">
              <FaChair size={16} />
            </span>
            <div className="min-w-0">
              <h1 className={`${HD} text-2xl font-bold tracking-tight`}>Kelola kursi</h1>
              <p className="mt-0.5 truncate text-sm text-[#8B96AD]">
                Kategori:{" "}
                <span className="font-medium text-[#C9D1E3]">{ticketCategory.name}</span>
                {totalSeats > 0 && (
                  <>
                    {" "}
                    &middot; <span className="tabular-nums">{totalSeats}</span> kursi
                  </>
                )}
              </p>
            </div>
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
          {/* FORM GENERATE KURSI BARU */}
          <div className="mb-6 rounded-xl bg-[#0F1626] p-5 ring-1 ring-white/[0.06]">
            <p className={`${HD} mb-4 text-base font-bold tracking-tight`}>
              Tambah huruf kursi baru
            </p>
            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
              <div>
                <label htmlFor="sm-prefix" className={LABEL_CLASS}>
                  Huruf (prefix)
                </label>
                <input
                  id="sm-prefix"
                  type="text"
                  placeholder="Contoh: A"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase().slice(0, 3))}
                  maxLength={3}
                  disabled={saving}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="sm-max" className={LABEL_CLASS}>
                  Maksimal nomor
                </label>
                <input
                  id="sm-max"
                  type="number"
                  placeholder="Contoh: 15"
                  value={maxNumber}
                  onChange={(e) => setMaxNumber(e.target.value)}
                  min="1"
                  max="200"
                  disabled={saving}
                  className={INPUT_CLASS}
                />
              </div>
              <button
                onClick={generateSeats}
                disabled={saving}
                className="flex h-11 min-w-[116px] items-center justify-center gap-2 rounded-lg bg-[#F5B83D] px-5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1A1305]/25 border-t-[#1A1305] motion-reduce:animate-none" />
                    Membuat
                  </>
                ) : (
                  <>
                    <FaPlus size={11} />
                    Generate
                  </>
                )}
              </button>
            </div>
            {prefix && maxNumber > 0 && (
              <p className="mt-3 text-xs tabular-nums text-[#8B96AD]">
                Preview:{" "}
                <span className="font-medium text-[#F5B83D]">
                  {prefix}1 s/d {prefix}
                  {maxNumber}
                </span>{" "}
                ({maxNumber} kursi)
              </p>
            )}
          </div>

          {/* LIST KURSI PER HURUF */}
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#F5B83D]/25 border-t-[#F5B83D] motion-reduce:animate-none" />
              <p className="text-sm text-[#8B96AD]">Memuat data kursi...</p>
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="flex flex-col items-center rounded-xl bg-[#0F1626] px-4 py-10 text-center ring-1 ring-white/[0.06]">
              <FaChair className="mb-3 text-[#5E6A87]" size={26} />
              <p className="text-sm font-semibold">Belum ada kursi</p>
              <p className="mt-1 max-w-xs text-xs text-[#8B96AD]">
                Isi huruf dan jumlah nomor di atas, lalu klik Generate untuk membuat
                kursi pertama.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([letter, letterSeats]) => {
                const isEditing = editingPrefixId === letterSeats[0].seat_prefix_id;

                return (
                  <div key={letter}>
                    <div className="mb-2.5 flex items-center justify-between">
                      <p className="flex items-center gap-2 text-sm font-semibold text-[#C9D1E3]">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F5B83D]/10 text-xs font-bold text-[#F5B83D]">
                          {letter}
                        </span>
                        Huruf {letter}
                        <span className="text-xs font-normal tabular-nums text-[#8B96AD]">
                          ({letterSeats.length} kursi)
                        </span>
                      </p>

                      {!isEditing && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditPrefix(letter, letterSeats)}
                            className={ICON_BTN}
                            title={`Edit huruf ${letter}`}
                            aria-label={`Edit huruf ${letter}`}
                          >
                            <FaEdit size={12} />
                          </button>
                          <button
                            onClick={() =>
                              deletePrefix(letter, letterSeats[0].seat_prefix_id)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                            title={`Hapus semua kursi ${letter}`}
                            aria-label={`Hapus semua kursi ${letter}`}
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* FORM EDIT (muncul kalau lagi diedit) */}
                    {isEditing ? (
                      <div className="space-y-4 rounded-xl bg-[#0F1626] p-4 ring-1 ring-[#F5B83D]/30">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="sm-edit-prefix" className={LABEL_CLASS}>
                              Huruf
                            </label>
                            <input
                              id="sm-edit-prefix"
                              type="text"
                              value={editPrefixValue}
                              onChange={(e) =>
                                setEditPrefixValue(e.target.value.toUpperCase().slice(0, 3))
                              }
                              maxLength={3}
                              disabled={updating}
                              className={INPUT_CLASS}
                            />
                          </div>
                          <div>
                            <label htmlFor="sm-edit-max" className={LABEL_CLASS}>
                              Jumlah kursi
                            </label>
                            <input
                              id="sm-edit-max"
                              type="number"
                              value={editMaxValue}
                              onChange={(e) => setEditMaxValue(e.target.value)}
                              min="1"
                              max="200"
                              disabled={updating}
                              className={INPUT_CLASS}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-[#8B96AD]">
                          Kalau jumlah dikurangi, kursi paling belakang akan dihapus (gagal
                          kalau kursi itu sudah dipilih/booked).
                        </p>
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={cancelEditPrefix}
                            disabled={updating}
                            className="rounded-lg border border-[#2C3858] px-4 py-2 text-xs font-medium text-[#C9D1E3] transition hover:bg-white/[0.05] disabled:opacity-50"
                          >
                            Batal
                          </button>
                          <button
                            onClick={saveEditPrefix}
                            disabled={updating}
                            className="flex min-w-[110px] items-center justify-center gap-2 rounded-lg bg-[#F5B83D] px-4 py-2 text-xs font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30 disabled:opacity-60"
                          >
                            {updating ? (
                              <>
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#1A1305]/25 border-t-[#1A1305] motion-reduce:animate-none" />
                                Menyimpan
                              </>
                            ) : (
                              "Simpan"
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-8 gap-2">
                        {letterSeats.map((seat) => (
                          <div
                            key={seat.id}
                            className={`rounded-lg py-2 text-center text-xs font-semibold tabular-nums ${
                              STATUS_STYLE[seat.status] || STATUS_STYLE.available
                            }`}
                            title={`Status: ${seat.status}`}
                          >
                            {seat.code}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* LEGENDA */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.06] pt-4 text-xs text-[#8B96AD]">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-white/[0.04] ring-1 ring-white/10" />
                  Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-amber-400/10 ring-1 ring-amber-400/20" />
                  Locked
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-red-400/10 ring-1 ring-red-400/20" />
                  Booked
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}