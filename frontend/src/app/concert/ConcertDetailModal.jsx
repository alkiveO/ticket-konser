"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import Swal from "sweetalert2";
import { FaTimes, FaPlus, FaEdit, FaTrash, FaTag, FaChair } from "react-icons/fa";
import SeatManagerModal from "./SeatManagerModal";

const EMPTY_FORM = { name: "", seat_type: "standing", price: "", quota: "", remaining_quota: "" };

const formatRupiah = (value) => {
  const num = Number(value) || 0;
  return num.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
};

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
      Swal.fire("Error", "Gagal mengambil detail konser", "error");
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
      Swal.fire("Data belum lengkap", "Nama, harga, dan kapasitas wajib diisi", "warning");
      return false;
    }
    if (Number(form.price) < 0 || Number(form.quota) < 0) {
      Swal.fire("Data tidak valid", "Harga dan kapasitas tidak boleh negatif", "warning");
      return false;
    }
    if (Number(form.remaining_quota) > Number(form.quota)) {
      Swal.fire(
        "Data tidak valid",
        "Sisa kapasitas tidak boleh lebih besar dari kapasitas total",
        "warning"
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
        Swal.fire("Success", "Kategori tiket berhasil diupdate", "success");
      } else {
        await api.post("/ticket-categories", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire("Success", "Kategori tiket berhasil ditambahkan", "success");
      }

      closeForm();
      await loadDetail();
      onChanged?.(); // suruh parent refresh list concert (biar kapasitas ke-update)
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteTicket = async (id) => {
    const result = await Swal.fire({
      title: "Hapus kategori tiket?",
      text: "Data yang dihapus tidak bisa dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya",
      cancelButtonText: "Batal",
      background: "#141420",
      color: "#e5e7eb",
      confirmButtonColor: "#7c3aed",
      cancelButtonColor: "#374151",
    });

    if (!result.isConfirmed) return;

    setDeletingId(id);
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/ticket-categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Swal.fire("Berhasil", "Kategori tiket berhasil dihapus", "success");
      await loadDetail();
      onChanged?.();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Gagal menghapus", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#141420] border border-white/10 w-[640px] max-h-[85vh] overflow-y-auto rounded-2xl p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">{concert.title}</h1>
            <p className="text-gray-500 text-sm mt-1">
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
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm py-10 text-center">Memuat data...</p>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <FaTag className="text-violet-400" />
                Kategori Tiket
              </h2>
              {!showForm && (
                <button
                  onClick={openAddForm}
                  className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold transition"
                >
                  <FaPlus size={10} />
                  Tambah Tiket
                </button>
              )}
            </div>

            {/* LIST KATEGORI */}
            {categories.length === 0 && !showForm && (
              <p className="text-gray-500 text-sm text-center py-8 bg-white/5 rounded-xl">
                Belum ada kategori tiket untuk konser ini.
              </p>
            )}

            {categories.length > 0 && (
              <div className="space-y-2 mb-4">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-2">
                        {cat.name}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            cat.seat_type === "seated"
                              ? "bg-violet-500/15 text-violet-400"
                              : "bg-white/10 text-gray-400"
                          }`}
                        >
                          {cat.seat_type === "seated" ? "Duduk" : "Berdiri"}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatRupiah(cat.price)} &middot; Sisa {cat.remaining_quota} /{" "}
                        {cat.quota}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {cat.seat_type === "seated" && (
                        <button
                          onClick={() => setSeatCategory(cat)}
                          title="Kelola Kursi"
                          className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400"
                        >
                          <FaChair size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => openEditForm(cat)}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300"
                      >
                        <FaEdit size={12} />
                      </button>
                      <button
                        onClick={() => deleteTicket(cat.id)}
                        disabled={deletingId === cat.id}
                        className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 flex items-center justify-center text-red-400"
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
              <div className="bg-white/5 rounded-xl p-5 space-y-4 mb-2">
                <p className="text-xs font-semibold text-gray-400">
                  {editId ? "Edit Kategori Tiket" : "Tambah Kategori Tiket"}
                </p>

                <input
                  type="text"
                  name="name"
                  placeholder="Nama Kategori (mis. VIP, Reguler)"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-gray-500"
                />

                {/* TIPE KURSI */}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Tipe Tiket</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSeatTypeChange("standing")}
                      className={`flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-medium border transition ${
                        form.seat_type === "standing"
                          ? "bg-violet-600 border-violet-600 text-white"
                          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      <FaChair size={12} />
                      Berdiri
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSeatTypeChange("seated")}
                      className={`flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-medium border transition ${
                        form.seat_type === "seated"
                          ? "bg-violet-600 border-violet-600 text-white"
                          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      <FaChair size={12} />
                      Duduk
                    </button>
                  </div>
                </div>

                <input
                  type="number"
                  name="price"
                  placeholder="Harga (Rp)"
                  value={form.price}
                  onChange={handleChange}
                  min="0"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-gray-500"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">
                      Kapasitas Total
                    </label>
                    <input
                      type="number"
                      name="quota"
                      value={form.quota}
                      onChange={handleChange}
                      min="0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">
                      Sisa Kapasitas
                    </label>
                    <input
                      type="number"
                      name="remaining_quota"
                      value={form.remaining_quota}
                      onChange={handleChange}
                      min="0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  <button
                    onClick={closeForm}
                    disabled={saving}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={saveTicket}
                    disabled={saving}
                    className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-xs font-semibold disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL: Kelola Kursi (VIP/VVIP) */}
      <SeatManagerModal
        ticketCategory={seatCategory}
        onClose={() => setSeatCategory(null)}
      />
    </div>
  );
}