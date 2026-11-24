"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import Swal from "sweetalert2";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { FaTimes, FaSearch, FaCheck, FaPlus } from "react-icons/fa";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});

const HD = "font-[family-name:var(--font-display)]";

const swalTheme = {
  background: "#151D2E",
  color: "#E8ECF4",
  confirmButtonColor: "#F5B83D",
  cancelButtonColor: "#2C3858",
  customClass: { confirmButton: "!text-[#1A1305] !font-semibold" },
};

const notify = (icon, title, text, extra = {}) =>
  Swal.fire({ ...swalTheme, icon, title, text, ...extra });

const getImageUrl = (filename) => {
  if (!filename) return null;
  const base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return `${base}/uploads/artists/${filename}`;
};

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

// Avatar: foto kalau ada, kalau gagal/tidak ada pakai inisial
function Avatar({ artist, size = 40 }) {
  const [failed, setFailed] = useState(false);
  const url = getImageUrl(artist.photo);

  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#222C45] text-xs font-semibold text-[#C9D1E3]"
      style={{ width: size, height: size }}
    >
      {url && !failed ? (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        getInitials(artist.name)
      )}
    </span>
  );
}

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
      notify(
        "error",
        "Gagal memuat data",
        err.response?.data?.message || "Gagal mengambil data lineup."
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

  const selectedArtists = useMemo(
    () => allArtists.filter((a) => selectedIds.has(a.id)),
    [allArtists, selectedIds]
  );

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
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

      notify("success", "Berhasil", "Lineup berhasil disimpan.", {
        timer: 1800,
        showConfirmButton: false,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      notify(
        "error",
        "Gagal menyimpan lineup",
        err.response?.data?.message || "Terjadi kesalahan pada server."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const rootClass = `${display.variable} ${body.variable} font-[family-name:var(--font-body)]`;
  const MAX_STACK = 5;

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

      <div className="relative flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-[#2C3858] bg-[#151D2E] shadow-2xl shadow-black/60">
        {/* HEADER */}
        <div className="shrink-0 px-7 pt-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-1 truncate text-sm text-[#8B96AD]">{concert.name}</p>
              <h1 className={`${HD} text-[28px] font-bold leading-none tracking-tight`}>
                Lineup artist
              </h1>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              aria-label="Tutup"
              className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
            >
              <FaTimes size={14} />
            </button>
          </div>

          <div className="relative mt-6">
            <FaSearch className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-xs text-[#5E6A87]" />
            <input
              type="text"
              aria-label="Cari artist"
              placeholder="Cari nama atau genre"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={saving}
              className="h-11 w-full border-b border-[#2C3858] bg-transparent pl-6 text-sm text-[#E8ECF4] outline-none transition placeholder:text-[#5E6A87] focus:border-[#F5B83D] disabled:opacity-50"
            />
          </div>
        </div>

        {/* LIST */}
        <div className="mt-2 flex-1 overflow-y-auto px-3 pb-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#F5B83D]/25 border-t-[#F5B83D] motion-reduce:animate-none" />
              <p className="text-sm text-[#8B96AD]">Memuat artist...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <p className={`${HD} text-lg font-bold`}>
                {search ? "Tidak ada yang cocok" : "Belum ada artist"}
              </p>
              <p className="mx-auto mt-1 max-w-[260px] text-sm text-[#8B96AD]">
                {search
                  ? `Tidak ada artist atau genre dengan kata "${search}".`
                  : "Tambahkan artist dulu di menu Artist, lalu kembali ke sini."}
              </p>
            </div>
          ) : (
            <ul>
              {filtered.map((artist) => {
                const checked = selectedIds.has(artist.id);

                return (
                  <li key={artist.id}>
                    <button
                      onClick={() => toggleArtist(artist.id)}
                      disabled={saving}
                      aria-pressed={checked}
                      className={`group relative flex w-full items-center gap-3.5 rounded-lg px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B83D] disabled:opacity-60 ${
                        checked ? "bg-[#F5B83D]/[0.07]" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      {/* penanda sisi kiri untuk yang terpilih */}
                      <span
                        className={`absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-full bg-[#F5B83D] transition-opacity ${
                          checked ? "opacity-100" : "opacity-0"
                        }`}
                      />

                      <Avatar artist={artist} />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">
                          {artist.name}
                        </span>
                        <span className="block truncate text-xs text-[#8B96AD]">
                          {artist.genre_name || "Tanpa genre"}
                        </span>
                      </span>

                      {checked ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#F5B83D]">
                          <FaCheck size={10} />
                          Tampil
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-[#5E6A87] transition group-hover:text-[#C9D1E3]">
                          <FaPlus size={9} />
                          Tambah
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-white/[0.06] bg-[#121A2B] px-7 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {selectedArtists.length > 0 && (
              <div className="flex -space-x-2">
                {selectedArtists.slice(0, MAX_STACK).map((a) => (
                  <span key={a.id} className="rounded-full ring-2 ring-[#121A2B]">
                    <Avatar artist={a} size={28} />
                  </span>
                ))}
                {selectedArtists.length > MAX_STACK && (
                  <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[#2C3858] px-1.5 text-[10px] font-semibold tabular-nums ring-2 ring-[#121A2B]">
                    +{selectedArtists.length - MAX_STACK}
                  </span>
                )}
              </div>
            )}
            <p className="truncate text-sm text-[#8B96AD]">
              {selectedIds.size === 0 ? (
                "Belum ada artist dipilih"
              ) : (
                <>
                  <span className="font-semibold tabular-nums text-[#E8ECF4]">
                    {selectedIds.size}
                  </span>{" "}
                  artist tampil
                </>
              )}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-[#C9D1E3] transition hover:bg-white/[0.06] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={saveLineup}
              disabled={saving || loading || !isDirty}
              className="flex min-w-[128px] items-center justify-center gap-2 rounded-lg bg-[#F5B83D] px-5 py-2.5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1A1305]/25 border-t-[#1A1305] motion-reduce:animate-none" />
                  Menyimpan
                </>
              ) : (
                "Simpan lineup"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}