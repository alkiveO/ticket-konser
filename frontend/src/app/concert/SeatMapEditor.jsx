"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/services/api";
import Swal from "sweetalert2";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { FaTimes, FaImage, FaUpload, FaMapMarkerAlt } from "react-icons/fa";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});

const HD = "font-[family-name:var(--font-display)]";

// Ambil base URL backend (tanpa akhiran /api) untuk membentuk URL gambar.
const getImageUrl = (path) => {
  if (!path) return null;
  const base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return `${base}${path}`;
};

// Warna chip solid supaya tetap kebaca di atas gambar denah apa pun
const PREFIX_COLORS = [
  "bg-[#F5B83D] text-[#1A1305]",
  "bg-sky-400 text-[#06121C]",
  "bg-emerald-400 text-[#04140C]",
  "bg-rose-400 text-[#1C0609]",
  "bg-violet-400 text-[#120A1F]",
  "bg-orange-400 text-[#1F0E03]",
];

// Tema SweetAlert, disamakan dengan halaman Kelola Kursi
const swalTheme = {
  background: "#151D2E",
  color: "#E8ECF4",
  confirmButtonColor: "#F5B83D",
  cancelButtonColor: "#2C3858",
  customClass: { confirmButton: "!text-[#1A1305] !font-semibold" },
};

const notify = (icon, title, text, extra = {}) =>
  Swal.fire({ ...swalTheme, icon, title, text, ...extra });

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
      notify("error", "Gagal memuat data", "Gagal mengambil layout kursi.");
    } finally {
      setLoading(false);
    }
  };

  if (!concert) return null;

  const rootClass = `${display.variable} ${body.variable} font-[family-name:var(--font-body)]`;

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      notify("warning", "Format salah", "Denah harus JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      notify("warning", "Terlalu besar", "Ukuran gambar maksimal 2MB.");
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
      notify("success", "Berhasil", "Denah berhasil diupload.", {
        timer: 1800,
        showConfirmButton: false,
      });
      onChanged?.();
    } catch (err) {
      notify(
        "error",
        "Gagal upload denah",
        err.response?.data?.message || "Terjadi kesalahan pada server."
      );
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
      notify("error", "Gagal menyimpan posisi", "Posisi kursi gagal disimpan.");
    }
  };

  const unplacedCount = layout.filter(
    (l) => l.pos_x === null || l.pos_y === null
  ).length;

  return (
    <div
      className={`${rootClass} fixed inset-0 z-[70] flex items-center justify-center p-4 text-[#E8ECF4]`}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading && draggingId === null) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      <div className="relative flex max-h-[90vh] w-full max-w-[820px] flex-col overflow-hidden rounded-2xl border border-[#2C3858] bg-[#151D2E] shadow-2xl shadow-black/60">
        {/* HEADER */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] px-7 pb-5 pt-7">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F5B83D]/10 text-[#F5B83D]">
              <FaMapMarkerAlt size={16} />
            </span>
            <div className="min-w-0">
              <h1 className={`${HD} text-2xl font-bold tracking-tight`}>Setup denah kursi</h1>
              <p className="mt-0.5 truncate text-sm text-[#8B96AD]">
                Konser:{" "}
                <span className="font-medium text-[#C9D1E3]">{concert.title}</span>
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
          {/* UPLOAD */}
          <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-[#0F1626] p-5 ring-1 ring-white/[0.06]">
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
              className="flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-lg bg-[#F5B83D] px-5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30 disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1A1305]/25 border-t-[#1A1305] motion-reduce:animate-none" />
                  Mengupload
                </>
              ) : (
                <>
                  <FaUpload size={12} />
                  {seatMapUrl ? "Ganti denah" : "Upload denah"}
                </>
              )}
            </button>
            <p className="min-w-[200px] flex-1 text-xs text-[#8B96AD]">
              Setelah upload, drag kotak huruf ke posisi yang sesuai di gambar. Format
              JPG, PNG, atau WEBP, maksimal 2MB.
            </p>
          </div>

          {/* CANVAS DENAH */}
          {!seatMapUrl ? (
            <div className="flex flex-col items-center rounded-xl bg-[#0F1626] px-4 py-14 text-center ring-1 ring-white/[0.06]">
              <FaImage className="mb-3 text-[#5E6A87]" size={28} />
              <p className="text-sm font-semibold">Belum ada denah</p>
              <p className="mt-1 max-w-xs text-xs text-[#8B96AD]">
                Upload gambar denah di atas untuk mulai menempatkan huruf kursi.
              </p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#F5B83D]/25 border-t-[#F5B83D] motion-reduce:animate-none" />
              <p className="text-sm text-[#8B96AD]">Memuat layout...</p>
            </div>
          ) : (
            <>
              <div
                ref={containerRef}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                className="relative w-full select-none overflow-hidden rounded-xl bg-[#0F1626] ring-1 ring-white/[0.06]"
                style={{ touchAction: "none" }}
              >
                <img
                  src={seatMapUrl}
                  alt="Denah kursi"
                  className="pointer-events-none block h-auto w-full"
                  draggable={false}
                />

                {layout.map((item, idx) => {
                  const hasPosition = item.pos_x !== null && item.pos_y !== null;
                  const left = hasPosition ? item.pos_x : 50;
                  const top = hasPosition ? item.pos_y : 50;
                  const color = PREFIX_COLORS[idx % PREFIX_COLORS.length];
                  const isDragging = draggingId === item.id;

                  return (
                    <div
                      key={item.id}
                      onMouseDown={handlePointerDown(item.id)}
                      onTouchStart={handlePointerDown(item.id)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-lg px-3 py-1.5 text-center text-xs font-bold shadow-lg shadow-black/50 ring-2 transition-transform active:cursor-grabbing motion-reduce:transition-none ${color} ${
                        hasPosition ? "ring-black/30" : "ring-white/70 ring-offset-2 ring-offset-[#0F1626]"
                      } ${isDragging ? "z-10 scale-110" : ""}`}
                      style={{ left: `${left}%`, top: `${top}%` }}
                      title={`${item.category_name} - Huruf ${item.prefix}`}
                    >
                      {item.prefix}
                      <span className="block text-[10px] font-medium opacity-80">
                        {item.category_name}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* LEGENDA */}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.06] pt-4 text-xs text-[#8B96AD]">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-[#F5B83D] ring-2 ring-black/30" />
                  Sudah ditempatkan
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-[#F5B83D] ring-2 ring-white/70" />
                  Belum ditempatkan (di tengah gambar)
                </span>
                {unplacedCount > 0 && (
                  <span className="tabular-nums text-[#F5B83D]">
                    {unplacedCount} huruf belum diposisikan
                  </span>
                )}
              </div>
            </>
          )}

          {!loading && seatMapUrl && layout.length === 0 && (
            <div className="mt-4 flex flex-col items-center rounded-xl bg-[#0F1626] px-4 py-8 text-center ring-1 ring-white/[0.06]">
              <p className="text-sm font-semibold">Belum ada huruf kursi</p>
              <p className="mt-1 max-w-xs text-xs text-[#8B96AD]">
                Buat dulu di menu Kelola kursi pada tiap kategori tiket.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}