"use client";

import { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { FaTimes, FaSearch, FaMapMarkerAlt } from "react-icons/fa";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});

const HD = "font-[family-name:var(--font-display)]";

// Tema SweetAlert, disamakan dengan halaman Tiket, Orders & Detail Konser
const swalTheme = {
  background: "#151D2E",
  color: "#E8ECF4",
  confirmButtonColor: "#F5B83D",
  cancelButtonColor: "#2C3858",
  customClass: { confirmButton: "!text-[#1A1305] !font-semibold" },
};

const notify = (icon, title, text, extra = {}) =>
  Swal.fire({ ...swalTheme, icon, title, text, ...extra });

export default function LocationPickerModal({ open, onClose, onSelect }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null); // { lat, lng, address }

  useEffect(() => {
    if (!open) return;

    // Load Leaflet cuma di client, dan cuma sekali
    let L;
    const init = async () => {
      L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      // Fix icon default leaflet yang suka gak muncul di Next.js
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mapInstance.current) return; // sudah pernah diinit

      mapInstance.current = L.map(mapRef.current).setView([-6.2, 106.816], 12); // default: Jakarta

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapInstance.current);

      mapInstance.current.on("click", async (e) => {
        const { lat, lng } = e.latlng;
        placeMarker(L, lat, lng);
        await reverseGeocode(lat, lng);
      });
    };

    init();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const placeMarker = (L, lat, lng) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(mapInstance.current);
    }
    mapInstance.current.setView([lat, lng], 15);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      setSelected({ lat, lng, address: data.display_name || `${lat}, ${lng}` });
    } catch {
      setSelected({ lat, lng, address: `${lat}, ${lng}` });
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&limit=1&countrycodes=id`
      );
      const data = await res.json();
      if (data.length === 0) {
        notify(
          "info",
          "Lokasi tidak ditemukan",
          "Coba kata kunci lain, misalnya nama gedung atau kota."
        );
        return;
      }
      const { lat, lon, display_name } = data[0];
      const L = (await import("leaflet")).default;
      placeMarker(L, Number(lat), Number(lon));
      setSelected({ lat: Number(lat), lng: Number(lon), address: display_name });
    } finally {
      setSearching(false);
    }
  };

  const confirmSelection = () => {
    if (!selected) return;
    onSelect(selected); // { lat, lng, address }
    onClose();
  };

  if (!open) return null;

  const rootClass = `${display.variable} ${body.variable} font-[family-name:var(--font-body)]`;

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

      <div className="relative flex max-h-[92vh] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl border border-[#2C3858] bg-[#151D2E] shadow-2xl shadow-black/60">
        {/* HEADER */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] px-7 pb-5 pt-7">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F5B83D]/10 text-[#F5B83D]">
              <FaMapMarkerAlt size={16} />
            </span>
            <div>
              <h2 className={`${HD} text-2xl font-bold tracking-tight`}>
                Pilih lokasi venue
              </h2>
              <p className="mt-0.5 text-sm text-[#8B96AD]">
                Cari alamat atau klik langsung di peta.
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
        <div className="flex-1 overflow-y-auto px-7 py-5">
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[#5E6A87]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Cari nama tempat atau alamat"
                aria-label="Cari nama tempat atau alamat"
                className="h-11 w-full rounded-lg border border-[#2C3858] bg-[#0F1626] pl-9 pr-4 text-sm text-[#E8ECF4] outline-none transition placeholder:text-[#5E6A87] focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="flex h-11 min-w-[96px] shrink-0 items-center justify-center gap-2 rounded-lg bg-[#F5B83D] px-5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30 disabled:opacity-60"
            >
              {searching ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1A1305]/25 border-t-[#1A1305] motion-reduce:animate-none" />
              ) : (
                <FaSearch size={11} />
              )}
              {searching ? "Mencari" : "Cari"}
            </button>
          </div>

          {/* isolate: supaya layer Leaflet tidak menimpa elemen lain */}
          <div className="isolate overflow-hidden rounded-xl ring-1 ring-white/[0.08]">
            <div ref={mapRef} className="h-[320px] w-full" />
          </div>

          <p className="mt-2.5 text-xs text-[#8B96AD]">
            Klik di peta untuk memilih titik lokasi, atau cari alamat di atas.
          </p>

          {selected ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#0F1626] p-4 ring-1 ring-white/[0.06]">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5B83D]/10 text-[#F5B83D]">
                <FaMapMarkerAlt size={13} />
              </span>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-medium text-[#F5B83D]">
                  Lokasi terpilih
                </p>
                <p className="text-sm leading-relaxed text-[#C9D1E3]">
                  {selected.address}
                </p>
                <p className="mt-1.5 text-xs tabular-nums text-[#5E6A87]">
                  {Number(selected.lat).toFixed(5)}, {Number(selected.lng).toFixed(5)}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-[#2C3858] px-4 py-3.5 text-center text-xs text-[#5E6A87]">
              Belum ada lokasi yang dipilih.
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-white/[0.06] px-7 py-5">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#2C3858] px-5 py-2.5 text-sm font-medium text-[#C9D1E3] transition hover:bg-white/[0.05]"
          >
            Batal
          </button>
          <button
            onClick={confirmSelection}
            disabled={!selected}
            className="rounded-lg bg-[#F5B83D] px-5 py-2.5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Gunakan lokasi ini
          </button>
        </div>
      </div>
    </div>
  );
}