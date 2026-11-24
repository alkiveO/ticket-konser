"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { FaTicketAlt, FaEye, FaEyeSlash } from "react-icons/fa";
import api from "@/services/api";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});

// Pola garis barcode (lebar dalam px) — murni dekorasi ala tiket
const BARS = [2, 1, 3, 1, 1, 4, 2, 1, 3, 2, 1, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1];

const swalBase = {
  background: "#151D2E",
  color: "#E8ECF4",
  confirmButtonColor: "#F5B83D",
  customClass: { confirmButton: "!text-[#1A1305] !font-semibold" },
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const login = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      return Swal.fire({
        ...swalBase,
        icon: "warning",
        title: "Data belum lengkap",
        text: "Isi email dan kata sandi dulu.",
      });
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);

      Swal.fire({
        ...swalBase,
        icon: "success",
        title: "Login berhasil",
        text: "Selamat datang, Admin 👋",
        timer: 1500,
        showConfirmButton: false,
      });

      router.push("/dashboard");
    } catch (err) {
      Swal.fire({
        ...swalBase,
        icon: "error",
        title: "Login gagal",
        text: err.response?.data?.message || "Terjadi kesalahan. Coba lagi.",
      });
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-11 w-full rounded-lg border border-[#2C3858] bg-[#0F1626] px-3.5 text-[15px] text-[#E8ECF4] placeholder:text-[#5E6A87] outline-none transition focus:border-[#F5B83D] focus:ring-4 focus:ring-[#F5B83D]/15";

  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#0C1220] font-[family-name:var(--font-body)] text-[#E8ECF4] flex flex-col items-center justify-center px-4 py-10 selection:bg-[#F5B83D] selection:text-[#1A1305]`}
    >
      {/* ================= TIKET ================= */}
      <div className="w-full max-w-[880px] flex flex-col md:flex-row rounded-2xl bg-[#151D2E] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.06]">
        {/* ---------- STUB (kiri / atas) ---------- */}
        <aside className="md:w-[300px] shrink-0 flex flex-col justify-between gap-10 rounded-t-2xl md:rounded-tr-none md:rounded-l-2xl bg-[#1B2539] p-8">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5B83D] text-[#1A1305]">
                <FaTicketAlt size={15} />
              </div>
              <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
                Lokatix
              </span>
            </div>

            <h2 className="mt-8 font-[family-name:var(--font-display)] text-[28px] font-bold leading-[1.1] tracking-tight">
              Tiket, pembayaran, dan e-tiket dalam satu panel.
            </h2>
          </div>

          <div className="hidden md:block">
            <div className="flex h-12 items-stretch gap-[2px]" aria-hidden="true">
              {BARS.map((w, i) => (
                <span key={i} className="bg-[#C9D1E3]/80" style={{ width: w }} />
              ))}
            </div>
            <p className="mt-3 text-xs text-[#8B96AD]">Khusus admin Lokatix</p>
          </div>
        </aside>

        {/* ---------- GARIS SOBEKAN ---------- */}
        <div
          className="relative z-10 h-0 w-full border-t-2 border-dashed border-[#34415F] md:h-auto md:w-0 md:self-stretch md:border-t-0 md:border-l-2"
          aria-hidden="true"
        >
          <span className="absolute -left-3.5 -top-3.5 h-7 w-7 rounded-full bg-[#0C1220]" />
          <span className="absolute -right-3.5 -top-3.5 h-7 w-7 rounded-full bg-[#0C1220] md:right-auto md:top-auto md:-left-3.5 md:-bottom-3.5" />
        </div>

        {/* ---------- FORM (kanan / bawah) ---------- */}
        <main className="flex-1 p-8 md:p-12">
          <div className="mx-auto max-w-[360px]">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
              Masuk
            </h1>
            <p className="mt-2 text-sm text-[#8B96AD]">
              Pakai akun admin yang diberikan tim IT.
            </p>

            <form onSubmit={login} className="mt-8 space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@lokatix.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                  Kata sandi
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#6F7B98] transition hover:bg-white/[0.06] hover:text-[#F5B83D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B83D]"
                  >
                    {showPassword ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#F5B83D] text-[15px] font-semibold text-[#1A1305] transition hover:bg-[#FFC857] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B83D]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A1305]/25 border-t-[#1A1305] motion-reduce:animate-none" />
                    Memeriksa...
                  </>
                ) : (
                  "Masuk"
                )}
              </button>
            </form>

            <p className="mt-6 text-sm text-[#8B96AD]">
              Lupa kata sandi? Hubungi tim IT untuk reset.
            </p>
          </div>
        </main>
      </div>

      <p className="mt-6 text-xs text-[#5E6A87]">
        © {new Date().getFullYear()} Lokatix
      </p>
    </div>
  );
}