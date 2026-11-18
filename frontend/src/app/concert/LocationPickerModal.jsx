"use client";

import { useEffect, useState, useRef } from "react";
import { FaTimes, FaSearch, FaMapMarkerAlt } from "react-icons/fa";

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
        alert("Lokasi tidak ditemukan, coba kata kunci lain");
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-[#141420] border border-white/10 w-[600px] rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FaMapMarkerAlt className="text-violet-400" />
            Pilih Lokasi Venue
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400"
          >
            <FaTimes size={14} />
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Cari nama tempat / alamat..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-gray-500"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 bg-violet-600 hover:bg-violet-700 rounded-xl flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <FaSearch size={12} />
            {searching ? "..." : "Cari"}
          </button>
        </div>

        <div
          ref={mapRef}
          className="w-full h-[320px] rounded-xl overflow-hidden border border-white/10"
        />

        <p className="text-xs text-gray-500 mt-2">
          Klik di peta untuk pilih titik lokasi, atau cari alamat di atas.
        </p>

        {selected && (
          <div className="bg-white/5 rounded-xl p-3 mt-3 text-sm text-gray-300">
            {selected.address}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm"
          >
            Batal
          </button>
          <button
            onClick={confirmSelection}
            disabled={!selected}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            Gunakan Lokasi Ini
          </button>
        </div>
      </div>
    </div>
  );
}