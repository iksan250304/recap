"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";
import Brand from "@/components/Brand";

type Msg = { type: "err" | "ok"; text: string } | null;

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState<"in" | "up" | null>(null);

  async function go(mode: "in" | "up") {
    if (!email || !pw) return setMsg({ type: "err", text: "Email dan password wajib diisi." });
    setBusy(mode);
    setMsg(null);
    const { error } =
      mode === "in"
        ? await sb.auth.signInWithPassword({ email, password: pw })
        : await sb.auth.signUp({ email, password: pw });
    setBusy(null);
    if (error) return setMsg({ type: "err", text: error.message });
    if (mode === "up")
      setMsg({ type: "ok", text: "Akun dibuat. Cek email untuk konfirmasi (jika diaktifkan), lalu masuk." });
    else r.replace("/dashboard");
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* brand panel */}
      <aside className="relative hidden overflow-hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative"><Brand dark size="lg" /></div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Catat bahan bangunan, <span className="text-amber-400">kontrol anggaran</span> proyek.
          </h2>
          <p className="mt-4 text-slate-400">
            Rencana pembelian, rekap nota lewat scan, dan laporan siap ekspor. Semua dalam satu tempat.
          </p>
        </div>
        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} BuildNote</p>
      </aside>

      {/* form */}
      <main
        className="flex items-center justify-center bg-gradient-to-b from-amber-50/60 to-slate-50 p-5"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <form
          className="card w-full max-w-sm animate-fade-in !p-6 sm:!p-8"
          onSubmit={(e) => { e.preventDefault(); go("in"); }}
        >
          <div className="mb-6 lg:hidden">
            <Brand size="lg" />
          </div>
          <h1 className="page-title">Selamat datang</h1>
          <p className="page-sub mb-6">Masuk untuk lanjut kelola proyek.</p>

          <div className="space-y-4">
            <div>
              <label className="lbl" htmlFor="em">Email</label>
              <input
                id="em" className="inp w-full" type="email" autoComplete="email" inputMode="email"
                placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="lbl" htmlFor="pw">Password</label>
              <div className="relative">
                <input
                  id="pw" className="inp w-full pr-16" type={show ? "text" : "password"} autoComplete="current-password"
                  placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)}
                />
                <button
                  type="button" onClick={() => setShow(!show)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
                >
                  {show ? "Sembunyi" : "Lihat"}
                </button>
              </div>
            </div>
          </div>

          {msg && (
            <p
              role="alert"
              className={`mt-4 rounded-xl px-3 py-2.5 text-sm ${
                msg.type === "err" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {msg.text}
            </p>
          )}

          <div className="mt-6 space-y-2.5">
            <button type="submit" className="btn-p w-full" disabled={!!busy}>
              {busy === "in" ? "Memproses…" : "Masuk"}
            </button>
            <button type="button" className="btn w-full" disabled={!!busy} onClick={() => go("up")}>
              {busy === "up" ? "Memproses…" : "Buat akun baru"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
