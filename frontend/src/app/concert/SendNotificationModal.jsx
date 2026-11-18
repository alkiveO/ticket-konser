"use client";

import { useState } from "react";
import api from "@/services/api";
import Swal from "sweetalert2";
import { FaBell, FaTimes } from "react-icons/fa";

export default function SendNotificationModal({ concert, onClose }) {
  const [type, setType] = useState("reminder");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!concert) return null;

  const target = type === "reminder" ? "all" : "buyers";

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      Swal.fire("Data belum lengkap", "Judul dan pesan wajib diisi", "warning");
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        "/notifications",
        {
          concert_id: concert.id,
          type,
          title,
          message,
          target,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire("Berhasil", res.data.message, "success");
      setTitle("");
      setMessage("");
      onClose();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Gagal mengirim notifikasi", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#141420] border border-white/10 w-full max-w-[500px] rounded-2xl p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FaBell className="text-violet-400" />
              Kirim Notifikasi
            </h1>
            <p className="text-gray-500 text-sm mt-1 truncate">{concert.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <FaTimes size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">
              Jenis Notifikasi
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="reminder">Reminder Beli Tiket (ke semua user)</option>
              <option value="reschedule">Pengunduran Jadwal (ke pembeli tiket)</option>
            </select>
            <p className="text-gray-600 text-xs mt-1.5">
              {type === "reminder"
                ? "Dikirim ke semua customer."
                : "Dikirim khusus ke user yang sudah membeli tiket konser ini."}
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">Judul</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === "reminder"
                  ? "Contoh: Tiket mulai terbatas!"
                  : "Contoh: Perubahan Jadwal Konser"
              }
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">Pesan</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Tulis pesan notifikasi..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-gray-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-5 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition disabled:opacity-50 text-sm"
          >
            Batal
          </button>
          <button
            onClick={send}
            disabled={sending}
            className="px-5 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl transition disabled:opacity-50 text-sm font-semibold"
          >
            {sending ? "Mengirim..." : "Kirim Notifikasi"}
          </button>
        </div>
      </div>
    </div>
  );
}