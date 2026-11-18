"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { FaTicketAlt, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import api from "@/services/api";

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
        icon: "warning",
        title: "Oops...",
        text: "Email dan Password wajib diisi.",
        background: "#141420",
        color: "#e5e7eb",
        confirmButtonColor: "#7c3aed",
      });
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);

      Swal.fire({
        icon: "success",
        title: "Login Berhasil",
        text: "Selamat datang Admin 👋",
        timer: 1500,
        showConfirmButton: false,
        background: "#141420",
        color: "#e5e7eb",
      });

      router.push("/dashboard");
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Login Gagal",
        text: err.response?.data?.message || "Terjadi kesalahan.",
        background: "#141420",
        color: "#e5e7eb",
        confirmButtonColor: "#7c3aed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b13] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl animate-pulse [animation-duration:6s]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-fuchsia-600/10 blur-3xl animate-pulse [animation-duration:8s]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[100px]" />

      {/* Faint grid texture di background biar ga polos */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* === TICKET STUB CARD === */}
        <div className="relative bg-[#141420] border border-white/10 rounded-[28px] shadow-2xl shadow-black/60">

          {/* --- Stub header (bagian robekan tiket) --- */}
          <div className="px-10 pt-9 pb-7 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-600/30 rotate-3 hover:rotate-0 transition-transform duration-300">
                <FaTicketAlt size={26} className="text-white" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center text-white tracking-tight">
              Lokatix Admin Portal
            </h1>

            <p className="text-center text-gray-500 text-sm mt-1.5">
              Silakan masuk untuk melanjutkan ke panel admin
            </p>

            <div className="flex items-center justify-center gap-2 mt-4 text-[10px] font-semibold tracking-[0.2em] text-violet-400/70">
              <span>ADMIN</span>
              <span className="w-1 h-1 rounded-full bg-violet-500/50" />
              <span>ACCESS PASS</span>
            </div>
          </div>

          {/* --- Perforated divider dengan notch kiri-kanan --- */}
          <div className="relative">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0b0b13] border border-white/10" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0b0b13] border border-white/10" />
            <div className="mx-8 border-t border-dashed border-white/15" />
          </div>

          {/* --- Form --- */}
          <form onSubmit={login} className="px-10 pt-8 pb-9 space-y-4">
            <div>
              <label className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">
                EMAIL
              </label>

              <div className="relative group">
                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm group-focus-within:text-violet-400 transition-colors" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40 placeholder:text-gray-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wide text-gray-500 mb-1.5">
                KATA SANDI
              </label>

              <div className="relative group">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm group-focus-within:text-violet-400 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan kata sandi..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-24 py-3 text-sm text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40 placeholder:text-gray-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-violet-400 font-semibold flex items-center gap-1.5 hover:text-violet-300 transition"
                >
                  {showPassword ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                  {showPassword ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-violet-600/20 mt-2 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          {/* --- Barcode footer, aksen khas tiket --- */}
          <div className="px-10 pb-7">
            <div
              className="h-6 w-full rounded-sm opacity-60"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, #a78bfa 0px, #a78bfa 2px, transparent 2px, transparent 5px, #a78bfa 5px, #a78bfa 6px, transparent 6px, transparent 10px, #a78bfa 10px, #a78bfa 13px, transparent 13px, transparent 16px)",
              }}
            />
            <p className="text-center text-[10px] tracking-[0.3em] text-gray-600 font-mono mt-2">
              LKX-ADMIN-0001
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}