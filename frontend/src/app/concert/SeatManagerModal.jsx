"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import Swal from "sweetalert2";
import { FaTimes, FaPlus, FaTrash, FaChair, FaEdit } from "react-icons/fa";

const STATUS_STYLE = {
  available: "bg-white/5 text-gray-300 border border-white/10",
  locked: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  booked: "bg-red-500/15 text-red-400 border border-red-500/20",
};

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
      Swal.fire("Error", "Gagal mengambil data kursi", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!ticketCategory) return null;

  // Guard: kategori "berdiri" gak punya kursi, jadi modal ini gak relevan
  if (ticketCategory.seat_type !== "seated") {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
        <div className="bg-[#141420] border border-white/10 w-[420px] rounded-2xl p-8 text-center">
          <FaChair className="text-violet-400 mx-auto mb-3" size={24} />
          <h1 className="text-lg font-bold mb-2">Kategori Berdiri</h1>
          <p className="text-gray-500 text-sm mb-6">
            Kategori <span className="text-gray-300 font-medium">{ticketCategory.name}</span>{" "}
            bertipe berdiri (standing), jadi tidak menggunakan kursi bernomor.
          </p>
          <button
            onClick={onClose}
            className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-xl text-sm font-semibold"
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
      Swal.fire("Data belum lengkap", "Huruf prefix wajib diisi (mis. A)", "warning");
      return false;
    }
    if (!maxNumber || Number(maxNumber) <= 0) {
      Swal.fire("Data belum lengkap", "Maksimal nomor per huruf wajib diisi", "warning");
      return false;
    }
    if (Number(maxNumber) > 200) {
      Swal.fire("Terlalu banyak", "Maksimal 200 kursi per huruf", "warning");
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

      Swal.fire(
        "Berhasil",
        `Kursi ${prefix.toUpperCase()}1 - ${prefix.toUpperCase()}${maxNumber} berhasil dibuat`,
        "success"
      );

      setPrefix("");
      setMaxNumber("");
      await loadSeats();
    } catch (err) {
      Swal.fire(
        "Error",
        err.response?.data?.message || "Gagal generate kursi",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const deletePrefix = async (prefixLetter, seatPrefixId) => {
    const result = await Swal.fire({
      title: `Hapus semua kursi ${prefixLetter}?`,
      text: "Semua kursi dengan huruf ini akan terhapus permanen.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      background: "#141420",
      color: "#e5e7eb",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#374151",
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");
      await api.delete(`/admin/seat-prefixes/${seatPrefixId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Swal.fire("Berhasil", "Kursi berhasil dihapus", "success");
      await loadSeats();
    } catch (err) {
      Swal.fire(
        "Error",
        err.response?.data?.message || "Gagal menghapus kursi",
        "error"
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
      Swal.fire("Data belum lengkap", "Huruf wajib diisi", "warning");
      return;
    }
    if (!editMaxValue || Number(editMaxValue) <= 0) {
      Swal.fire("Data belum lengkap", "Maksimal nomor wajib diisi", "warning");
      return;
    }
    if (Number(editMaxValue) > 200) {
      Swal.fire("Terlalu banyak", "Maksimal 200 kursi per huruf", "warning");
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

      Swal.fire("Berhasil", "Kursi berhasil diupdate", "success");
      cancelEditPrefix();
      await loadSeats();
    } catch (err) {
      Swal.fire(
        "Error",
        err.response?.data?.message || "Gagal mengupdate kursi",
        "error"
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-[#141420] border border-white/10 w-[600px] max-h-[85vh] overflow-y-auto rounded-2xl p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FaChair className="text-violet-400" />
              Kelola Kursi
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Kategori: <span className="text-gray-300 font-medium">{ticketCategory.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* FORM GENERATE KURSI BARU */}
        <div className="bg-white/5 rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold text-gray-400 mb-3">
            Tambah Huruf Kursi Baru
          </p>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Huruf (Prefix)</label>
              <input
                type="text"
                placeholder="mis. A"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase().slice(0, 3))}
                maxLength={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">
                Maksimal Nomor
              </label>
              <input
                type="number"
                placeholder="mis. 15"
                value={maxNumber}
                onChange={(e) => setMaxNumber(e.target.value)}
                min="1"
                max="200"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-gray-500"
              />
            </div>
            <button
              onClick={generateSeats}
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold transition h-fit"
            >
              <FaPlus size={12} />
              {saving ? "..." : "Generate"}
            </button>
          </div>
          {prefix && maxNumber > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Preview: {prefix}1 s/d {prefix}{maxNumber} ({maxNumber} kursi)
            </p>
          )}
        </div>

        {/* LIST KURSI PER HURUF */}
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-8">Memuat data kursi...</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8 bg-white/5 rounded-xl">
            Belum ada kursi untuk kategori ini.
          </p>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([letter, letterSeats]) => {
              const isEditing = editingPrefixId === letterSeats[0].seat_prefix_id;

              return (
                <div key={letter}>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-gray-300">
                      Huruf {letter}{" "}
                      <span className="text-gray-500 font-normal">
                        ({letterSeats.length} kursi)
                      </span>
                    </p>

                    {!isEditing && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditPrefix(letter, letterSeats)}
                          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 transition"
                          title={`Edit huruf ${letter}`}
                        >
                          <FaEdit size={11} />
                        </button>
                        <button
                          onClick={() =>
                            deletePrefix(letter, letterSeats[0].seat_prefix_id)
                          }
                          className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition"
                          title={`Hapus semua kursi ${letter}`}
                        >
                          <FaTrash size={11} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* FORM EDIT (muncul kalau lagi diedit) */}
                  {isEditing ? (
                    <div className="bg-white/5 rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1.5 block">
                            Huruf
                          </label>
                          <input
                            type="text"
                            value={editPrefixValue}
                            onChange={(e) =>
                              setEditPrefixValue(e.target.value.toUpperCase().slice(0, 3))
                            }
                            maxLength={3}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1.5 block">
                            Jumlah Kursi
                          </label>
                          <input
                            type="number"
                            value={editMaxValue}
                            onChange={(e) => setEditMaxValue(e.target.value)}
                            min="1"
                            max="200"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Kalau jumlah dikurangi, kursi paling belakang akan dihapus (gagal
                        kalau kursi itu sudah dipilih/booked).
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={cancelEditPrefix}
                          disabled={updating}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs disabled:opacity-50"
                        >
                          Batal
                        </button>
                        <button
                          onClick={saveEditPrefix}
                          disabled={updating}
                          className="px-3 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs font-semibold disabled:opacity-50"
                        >
                          {updating ? "Menyimpan..." : "Simpan"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-8 gap-2">
                      {letterSeats.map((seat) => (
                        <div
                          key={seat.id}
                          className={`rounded-lg py-2 text-center text-xs font-semibold ${STATUS_STYLE[seat.status]}`}
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

            <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t border-white/5">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-white/5 border border-white/10 inline-block" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500/15 border border-amber-500/20 inline-block" /> Locked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500/15 border border-red-500/20 inline-block" /> Booked
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}