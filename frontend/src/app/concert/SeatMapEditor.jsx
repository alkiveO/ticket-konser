"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/services/api";
import Swal from "sweetalert2";
import { FaTimes, FaImage, FaUpload, FaMapMarkerAlt } from "react-icons/fa";

// Ambil base URL backend (tanpa akhiran /api) untuk membentuk URL gambar.
const getImageUrl = (path) => {
  if (!path) return null;
  const base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return `${base}${path}`;
};

const PREFIX_COLORS = [
  "bg-violet-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-sky-600",
  "bg-fuchsia-600",
];

export default function SeatMapEditor({ concert, onClose, onChanged }) {
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [seatMapUrl, setSeatMapUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [layout, setLayout] = useState([]); // [{ id, prefix, pos_x, pos_y, category_name }]
  const [loading, setLoading] = useState(true);

  const [draggingId, setDraggingId] = useState(null);

  useEffect(() => {
    if (concert) {
      setSeatMapUrl(getImageUrl(concert.seat_map));
      loadLayout();
    } else {
      setSeatMapUrl(null);
      setLayout([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concert]);

  const loadLayout = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/admin/concerts/${concert.id}/seat-layout`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLayout(res.data.data || []);
    } catch (err) {
      Swal.fire("Error", "Gagal mengambil layout kursi", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!concert) return null;

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire("Format salah", "Denah harus JPG, PNG, atau WEBP", "warning");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire("Terlalu besar", "Ukuran gambar maksimal 2MB", "warning");
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("poster", file);

      const res = await api.post(`/concerts/${concert.id}/seat-map`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSeatMapUrl(getImageUrl(res.data.seat_map));
      Swal.fire("Berhasil", "Denah berhasil diupload", "success");
      onChanged?.();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Gagal upload denah", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ----- Drag handling -----
  const clampPercent = (val) => Math.max(0, Math.min(100, val));

  const handlePointerDown = (id) => (e) => {
    e.preventDefault();
    setDraggingId(id);
  };

  const handlePointerMove = (e) => {
    if (draggingId === null || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const xPercent = clampPercent(((clientX - rect.left) / rect.width) * 100);
    const yPercent = clampPercent(((clientY - rect.top) / rect.height) * 100);

    setLayout((prev) =>
      prev.map((item) =>
        item.id === draggingId ? { ...item, pos_x: xPercent, pos_y: yPercent } : item
      )
    );
  };

  const handlePointerUp = async () => {
    if (draggingId === null) return;

    const item = layout.find((l) => l.id === draggingId);
    setDraggingId(null);

    if (!item) return;

    try {
      const token = localStorage.getItem("token");
      await api.put(
        `/admin/seat-prefixes/${item.id}/position`,
        { pos_x: item.pos_x, pos_y: item.pos_y },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      Swal.fire("Error", "Gagal menyimpan posisi kursi", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
      <div className="bg-[#141420] border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FaMapMarkerAlt className="text-violet-400" />
              Setup Denah Kursi
            </h1>
            <p className="text-gray-500 text-sm mt-1">{concert.title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* UPLOAD BUTTON */}
        <div className="flex items-center gap-3 mb-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition"
          >
            <FaUpload size={12} />
            {uploading ? "Mengupload..." : seatMapUrl ? "Ganti Denah" : "Upload Denah"}
          </button>
          <p className="text-xs text-gray-500">
            Setelah upload, drag kotak huruf ke posisi yang sesuai di gambar.
          </p>
        </div>

        {/* CANVAS DENAH */}
        {!seatMapUrl ? (
          <div className="h-64 rounded-xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-2 text-gray-600">
            <FaImage size={32} />
            <p className="text-sm">Belum ada gambar denah, upload dulu di atas.</p>
          </div>
        ) : loading ? (
          <p className="text-gray-500 text-sm text-center py-10">Memuat layout...</p>
        ) : (
          <div
            ref={containerRef}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className="relative w-full rounded-xl overflow-hidden border border-white/10 select-none"
            style={{ touchAction: "none" }}
          >
            <img
              src={seatMapUrl}
              alt="Denah"
              className="w-full h-auto block pointer-events-none"
              draggable={false}
            />

            {layout.map((item, idx) => {
              const hasPosition = item.pos_x !== null && item.pos_y !== null;
              const left = hasPosition ? item.pos_x : 50;
              const top = hasPosition ? item.pos_y : 50;
              const color = PREFIX_COLORS[idx % PREFIX_COLORS.length];

              return (
                <div
                  key={item.id}
                  onMouseDown={handlePointerDown(item.id)}
                  onTouchStart={handlePointerDown(item.id)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 ${color} rounded-lg px-3 py-1.5 text-xs font-bold text-white cursor-move shadow-lg border-2 ${
                    !hasPosition ? "border-dashed border-white/60" : "border-white/20"
                  } ${draggingId === item.id ? "scale-110 z-10" : ""} transition-transform`}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  title={`${item.category_name} - Huruf ${item.prefix}`}
                >
                  {item.prefix}
                  <span className="block text-[10px] font-normal opacity-80">
                    {item.category_name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {!loading && seatMapUrl && layout.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-4">
            Belum ada huruf kursi. Bikin dulu di menu "Kelola Kursi" tiap kategori tiket.
          </p>
        )}
      </div>
    </div>
  );
}