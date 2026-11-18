"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import Swal from "sweetalert2";
import {
  FaTimes,
  FaSearch,
  FaUserCircle,
  FaCheck,
  FaMusic,
} from "react-icons/fa";

const getImageUrl = (filename) => {
  if (!filename) return null;
  const base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return `${base}/uploads/artists/${filename}`;
};

/**
 * Modal buat ngatur lineup artist di satu konser.
 *
 * Cara pake, taro ini di halaman Concert lo:
 *
 *   const [lineupConcert, setLineupConcert] = useState(null);
 *   ...
 *   <button onClick={() => setLineupConcert(item)}>Kelola Lineup</button>
 *   ...
 *   <ConcertLineupModal
 *     concert={lineupConcert}
 *     onClose={() => setLineupConcert(null)}
 *     onSaved={() => getConcerts()}  // refresh list concert lo kalau perlu
 *   />
 *
 * `concert` harus object minimal { id, name }. Kalau null, modal nggak render.
 */
export default function ConcertLineupModal({ concert, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allArtists, setAllArtists] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [initialIds, setInitialIds] = useState(new Set());
  const [search, setSearch] = useState("");

  const isOpen = !!concert;

  useEffect(() => {
    if (!isOpen) return;

    setSearch("");
    loadData(concert.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concert?.id]);

  const loadData = async (concertId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [artistsRes, lineupRes] = await Promise.all([
        api.get("/artists", { headers }),
        api.get(`/concert-artists/${concertId}`, { headers }),
      ]);

      const artists = artistsRes.data.data || [];
      const currentLineup = lineupRes.data.data || [];
      const currentIds = new Set(currentLineup.map((a) => a.id));

      setAllArtists(artists);
      setSelectedIds(new Set(currentIds));
      setInitialIds(currentIds);
    } catch (err) {
      Swal.fire(
        "Error",
        err.response?.data?.message || "Gagal mengambil data lineup",
        "error"
      );
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return allArtists;

    return allArtists.filter((a) => {
      const name = a.name?.toLowerCase() ?? "";
      const genre = a.genre_name?.toLowerCase() ?? "";
      return name.includes(keyword) || genre.includes(keyword);
    });
  }, [allArtists, search]);

  const isDirty = useMemo(() => {
    if (selectedIds.size !== initialIds.size) return true;
    for (const id of selectedIds) {
      if (!initialIds.has(id)) return true;
    }
    return false;
  }, [selectedIds, initialIds]);

  const toggleArtist = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const saveLineup = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await api.put(
        `/concert-artists/${concert.id}`,
        { artist_ids: Array.from(selectedIds) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire("Success", "Lineup berhasil disimpan", "success");
      onSaved?.();
      onClose();
    } catch (err) {
      Swal.fire(
        "Error",
        err.response?.data?.message || "Gagal menyimpan lineup",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#141420] border border-white/10 w-[560px] max-h-[85vh] rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-white/5">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">Kelola Lineup</h1>
              <p className="text-gray-500 text-sm mt-1">
                Pilih artist yang tampil di{" "}
                <span className="text-gray-300 font-medium">
                  {concert.name}
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition"
            >
              <FaTimes size={20} />
            </button>
          </div>

          <div className="relative mt-5">
            <FaSearch className="absolute left-4 top-3.5 text-gray-500 text-sm" />
            <input
              type="text"
              placeholder="Cari nama artist atau genre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="py-16 text-center text-gray-500">Memuat artist...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              {search
                ? "Tidak ada artist yang cocok."
                : "Belum ada data artist. Tambahkan artist dulu."}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((artist) => {
                const checked = selectedIds.has(artist.id);
                const imageUrl = getImageUrl(artist.photo);

                return (
                  <button
                    key={artist.id}
                    onClick={() => toggleArtist(artist.id)}
                    className={`w-full flex items-center gap-4 p-3 rounded-xl transition text-left ${
                      checked
                        ? "bg-violet-500/10 border border-violet-500/40"
                        : "border border-transparent hover:bg-white/5"
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-violet-600 to-fuchsia-600 shrink-0 flex items-center justify-center">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={artist.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="w-full h-full items-center justify-center text-white/70"
                        style={{ display: imageUrl ? "none" : "flex" }}
                      >
                        <FaUserCircle size={20} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{artist.name}</p>
                      {artist.genre_name && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <FaMusic size={9} />
                          {artist.genre_name}
                        </p>
                      )}
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition ${
                        checked
                          ? "bg-violet-600"
                          : "bg-white/5 border border-white/15"
                      }`}
                    >
                      {checked && <FaCheck size={10} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-white/5 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            <span className="text-white font-semibold">{selectedIds.size}</span>{" "}
            artist dipilih
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-5 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition disabled:opacity-50 text-sm"
            >
              Batal
            </button>

            <button
              onClick={saveLineup}
              disabled={saving || loading || !isDirty}
              className="px-5 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold"
            >
              {saving ? "Menyimpan..." : "Simpan Lineup"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}