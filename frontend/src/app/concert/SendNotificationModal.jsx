"use client";

import { useState } from "react";
import api from "@/services/api";
import Swal from "sweetalert2";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { FaTimes, FaBell } from "react-icons/fa";

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

const TYPES = [
  {
    value: "reminder",
    label: "Reminder tiket",
    audience: "Semua customer",
    desc: "Dikirim ke semua customer.",
    titlePlaceholder: "Contoh: Tiket mulai terbatas!",
  },
  {
    value: "reschedule",
    label: "Jadwal diundur",
    audience: "Pembeli tiket",
    desc: "Dikirim khusus ke user yang sudah membeli tiket konser ini.",
    titlePlaceholder: "Contoh: Perubahan jadwal konser",
  },
];

const FIELD_CLASS =
  "w-full border-b border-[#2C3858] bg-transparent text-[#E8ECF4] outline-none transition placeholder:text-[#5E6A87] focus:border-[#F5B83D] disabled:opacity-50";

const LABEL_CLASS = "mb-1 block text-xs font-medium text-[#8B96AD]";

const MAX_TITLE = 80;
const MAX_MESSAGE = 240;

export default function SendNotificationModal({ concert, onClose }) {
  const [type, setType] = useState("reminder");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!concert) return null;

  const rootClass = `${display.variable} ${body.variable} font-[family-name:var(--font-body)]`;
  const current = TYPES.find((t) => t.value === type);
  const target = type === "reminder" ? "all" : "buyers";

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      notify("warning", "Data belum lengkap", "Judul dan pesan wajib diisi.");
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

      notify("success", "Berhasil", res.data.message, {
        timer: 1800,
        showConfirmButton: false,
      });
      setTitle("");
      setMessage("");
      onClose();
    } catch (err) {
      notify(
        "error",
        "Gagal mengirim notifikasi",
        err.response?.data?.message || "Terjadi kesalahan pada server."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`${rootClass} fixed inset-0 z-50 flex items-center justify-center p-4 text-[#E8ECF4]`}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      <div className="relative flex max-h-[92vh] w-full max-w-[540px] flex-col overflow-hidden rounded-xl border border-[#2C3858] bg-[#151D2E] shadow-2xl shadow-black/60">
        {/* HEADER */}
        <div className="flex shrink-0 items-start justify-between gap-4 px-7 pt-7">
          <div className="min-w-0">
            <p className="mb-1 truncate text-sm text-[#8B96AD]">{concert.title}</p>
            <h1 className={`${HD} text-[28px] font-bold leading-none tracking-tight`}>
              Kirim notifikasi
            </h1>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            aria-label="Tutup"
            className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#8B96AD] transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 space-y-6 overflow-y-auto px-7 py-6">
          {/* JENIS: segmented control */}
          <div>
            <span className={LABEL_CLASS}>Jenis notifikasi</span>
            <div
              role="radiogroup"
              aria-label="Jenis notifikasi"
              className="grid grid-cols-2 gap-1 rounded-lg bg-[#0F1626] p-1"
            >
              {TYPES.map((t) => {
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={sending}
                    onClick={() => setType(t.value)}
                    className={`rounded-md px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B83D] disabled:opacity-60 ${
                      active
                        ? "bg-[#222C45] shadow-sm shadow-black/30"
                        : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <span
                      className={`block text-sm font-semibold ${
                        active ? "text-[#E8ECF4]" : "text-[#8B96AD]"
                      }`}
                    >
                      {t.label}
                    </span>
                    <span
                      className={`block text-xs ${
                        active ? "text-[#F5B83D]" : "text-[#5E6A87]"
                      }`}
                    >
                      {t.audience}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[#8B96AD]">{current.desc}</p>
          </div>

          {/* JUDUL */}
          <div>
            <div className="flex items-end justify-between">
              <label htmlFor="notif-title" className={LABEL_CLASS}>
                Judul
              </label>
              <span className="mb-1 text-xs tabular-nums text-[#5E6A87]">
                {title.length}/{MAX_TITLE}
              </span>
            </div>
            <input
              id="notif-title"
              type="text"
              value={title}
              maxLength={MAX_TITLE}
              onChange={(e) => setTitle(e.target.value)}
              disabled={sending}
              placeholder={current.titlePlaceholder}
              className={`${FIELD_CLASS} h-10 text-base font-medium`}
            />
          </div>

          {/* PESAN */}
          <div>
            <div className="flex items-end justify-between">
              <label htmlFor="notif-message" className={LABEL_CLASS}>
                Pesan
              </label>
              <span className="mb-1 text-xs tabular-nums text-[#5E6A87]">
                {message.length}/{MAX_MESSAGE}
              </span>
            </div>
            <textarea
              id="notif-message"
              value={message}
              maxLength={MAX_MESSAGE}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              rows={3}
              placeholder="Tulis pesan untuk penerima..."
              className={`${FIELD_CLASS} resize-none py-2 text-sm leading-relaxed`}
            />
          </div>

          {/* PREVIEW */}
          <div>
            <span className={LABEL_CLASS}>Tampilan di user</span>
            <div className="flex gap-3 rounded-lg bg-[#0F1626] p-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5B83D]/10 text-[#F5B83D]">
                <FaBell size={12} />
              </span>
              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-semibold ${
                    title ? "text-[#E8ECF4]" : "text-[#5E6A87]"
                  }`}
                >
                  {title || "Judul notifikasi"}
                </p>
                <p
                  className={`mt-0.5 line-clamp-2 break-words text-xs leading-relaxed ${
                    message ? "text-[#C9D1E3]" : "text-[#5E6A87]"
                  }`}
                >
                  {message || "Isi pesan akan tampil di sini."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-white/[0.06] bg-[#121A2B] px-7 py-4">
          <p className="truncate text-sm text-[#8B96AD]">
            Penerima:{" "}
            <span className="font-semibold text-[#E8ECF4]">{current.audience}</span>
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={onClose}
              disabled={sending}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-[#C9D1E3] transition hover:bg-white/[0.06] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={send}
              disabled={sending}
              className="flex min-w-[116px] items-center justify-center gap-2 rounded-lg bg-[#F5B83D] px-5 py-2.5 text-sm font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30 disabled:opacity-60"
            >
              {sending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1A1305]/25 border-t-[#1A1305] motion-reduce:animate-none" />
                  Mengirim
                </>
              ) : (
                "Kirim"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}