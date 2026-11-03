"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppProvider, useApp } from "@/lib/ctx";
import { sb } from "@/lib/supabase";
import Icon, { type IconName } from "@/components/Icon";
import Brand from "@/components/Brand";

const NAV: { href: string; label: string; short: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Dasbor", short: "Dasbor", icon: "dash" },
  { href: "/planning", label: "Rencana Pembelian", short: "Rencana", icon: "plan" },
  { href: "/purchases", label: "Rekap Pembelian", short: "Rekap", icon: "buy" },
  { href: "/reports", label: "Laporan & Ekspor", short: "Laporan", icon: "rep" },
];

/* ---------- modal tambah / ubah proyek ---------- */
function ProjectModal({ mode, onClose, onSave }: {
  mode: "new" | "edit";
  onClose: () => void;
  onSave: (name: string, budget: number) => Promise<void>;
}) {
  const { project } = useApp();
  const [name, setName] = useState(mode === "edit" ? project.name : "");
  const [budget, setBudget] = useState(mode === "edit" ? String(project.budget ?? 0) : "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await onSave(name.trim(), +budget || 0);
    setBusy(false);
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <form className="sheet" onSubmit={submit} role="dialog" aria-modal>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{mode === "new" ? "Proyek baru" : "Ubah proyek"}</h2>
            <p className="page-sub !mt-0.5">Nama dan anggaran total proyek.</p>
          </div>
          <button type="button" className="btn-ghost !min-h-0 !p-2" onClick={onClose} aria-label="Tutup">
            <Icon n="x" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="lbl" htmlFor="pn">Nama proyek</label>
            <input id="pn" className="inp w-full" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Rumah Pak Budi" />
          </div>
          <div>
            <label className="lbl" htmlFor="pb">Anggaran (Rp)</label>
            <input id="pb" className="inp w-full tabular-nums" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ""))} placeholder="0" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" className="btn" onClick={onClose}>Batal</button>
          <button className="btn-p" disabled={busy || !name.trim()}>{busy ? "Menyimpan…" : "Simpan"}</button>
        </div>
      </form>
    </>
  );
}

/* ---------- modal hapus proyek (konfirmasi ketik nama) ---------- */
function DeleteModal({ onClose, onConfirm }: {
  onClose: () => void;
  onConfirm: () => Promise<string | null>;
}) {
  const { project, plans, buys } = useApp();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const match = typed.trim() === project.name.trim();

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose, busy]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!match) return;
    setBusy(true); setErr("");
    const m = await onConfirm();
    setBusy(false);
    if (m) setErr(m);
  }

  return (
    <>
      <div className="backdrop" onClick={() => !busy && onClose()} />
      <form className="sheet" onSubmit={submit} role="alertdialog" aria-modal>
        <h2 className="text-lg font-bold tracking-tight text-rose-600">Hapus proyek ini?</h2>
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
          <p className="font-semibold">Tindakan ini permanen dan tidak bisa dibatalkan.</p>
          <p className="mt-1">
            Proyek <b>{project.name}</b> beserta {plans.length} rencana pembelian, {buys.length} nota, dan semua foto struknya akan dihapus.
          </p>
        </div>
        <div className="mt-4">
          <label className="lbl" htmlFor="dn">
            Ketik <b className="text-slate-800">{project.name}</b> untuk konfirmasi
          </label>
          <input
            id="dn" className="inp w-full" autoFocus autoComplete="off"
            value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={project.name}
          />
        </div>
        {err && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700">{err}</p>}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>Batal</button>
          <button
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white transition hover:bg-rose-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
            disabled={!match || busy}
          >
            {busy ? "Menghapus…" : "Hapus permanen"}
          </button>
        </div>
      </form>
    </>
  );
}

/* ---------- kontrol proyek ---------- */
function ProjectControls({ stacked, onNew, onEdit, onDelete }: {
  stacked?: boolean; onNew: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const { projects, project, setProjectId } = useApp();
  const only = projects.length <= 1;
  return (
    <div className={stacked ? "space-y-2" : "flex items-center gap-2"}>
      <div className={`relative ${stacked ? "" : "w-64"}`}>
        <select
          className="inp w-full appearance-none truncate pr-9 font-medium"
          value={project?.id}
          onChange={(e) => setProjectId(e.target.value)}
          aria-label="Pilih proyek"
        >
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Icon n="chevron" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      <div className={stacked ? "grid grid-cols-3 gap-2" : "flex gap-2"}>
        <button className="btn !px-3" onClick={onNew}>Baru</button>
        <button className="btn !px-3" onClick={onEdit}>Ubah</button>
        <button
          className="btn-danger !px-3 disabled:!opacity-40"
          onClick={onDelete} disabled={only}
          title={only ? "Minimal harus ada satu proyek" : "Hapus proyek"}
        >
          Hapus
        </button>
      </div>
      {stacked && only && <p className="text-[11px] text-slate-400">Proyek terakhir tidak bisa dihapus.</p>}
    </div>
  );
}

/* ---------- shell ---------- */
function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(), r = useRouter();
  const { projects, project, setProjectId, reload, buys } = useApp();
  const [modal, setModal] = useState<null | "new" | "edit" | "delete">(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => { setMenu(false); }, [path]);
  useEffect(() => {
    if (!menu) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [menu]);

  const open = (m: "new" | "edit" | "delete") => { setMenu(false); setModal(m); };

  async function saveProj(name: string, budget: number) {
    if (modal === "new") {
      const { data } = await sb.from("projects").insert({ name, budget }).select().single();
      await reload();
      if (data) setProjectId(data.id);
    } else {
      await sb.from("projects").update({ name, budget }).eq("id", project.id);
      await reload();
    }
    setModal(null);
  }

  async function deleteProj(): Promise<string | null> {
    const paths = buys.map((b: any) => b.receipt_image_url).filter(Boolean) as string[];
    const { error } = await sb.from("projects").delete().eq("id", project.id);
    if (error) return "Gagal menghapus: " + error.message;
    if (paths.length) await sb.storage.from("receipts").remove(paths);
    const next = projects.find((p) => p.id !== project.id);
    if (next) setProjectId(next.id);
    await reload();
    setModal(null);
    return null;
  }

  const logout = async () => { await sb.auth.signOut(); r.replace("/login"); };
  const active = (h: string) => path === h || path.startsWith(h + "/");

  return (
    <div className="min-h-dvh md:flex">
      {/* sidebar desktop */}
      <aside className="noprint sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-slate-900 p-4 text-slate-400 md:flex">
        <div className="px-2 pb-6 pt-1"><Brand dark /></div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-xl px-3 py-2.5 font-medium transition ${
                active(n.href)
                  ? "bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/20"
                  : "hover:bg-white/5 hover:text-white"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} className="mt-auto rounded-xl px-3 py-2.5 text-left font-medium transition hover:bg-white/5 hover:text-white">
          Keluar
        </button>
      </aside>

      <div className="min-w-0 flex-1 pb-28 md:pb-0">
        {/* header */}
        <header
          className="noprint glass sticky top-0 z-30 flex items-center gap-2 border-b px-3 pb-2.5 md:px-6"
          style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
        >
          {/* mobile */}
          <button className="btn-ghost !min-h-0 !p-2 md:hidden" onClick={() => setMenu(true)} aria-label="Buka menu">
            <Icon n="menu" className="h-6 w-6" />
          </button>
          <div className="md:hidden"><Brand /></div>
          <button
            className="ml-auto max-w-[42%] truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 md:hidden"
            onClick={() => setMenu(true)}
          >
            {project?.name}
          </button>

          {/* desktop */}
          <div className="hidden md:block">
            <ProjectControls onNew={() => open("new")} onEdit={() => open("edit")} onDelete={() => open("delete")} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl animate-fade-in p-3 sm:p-4 md:p-6">{children}</main>
      </div>

      {/* bottom nav mobile */}
      <nav
        className="noprint fixed inset-x-3 z-40 grid grid-cols-4 rounded-2xl border border-slate-200/70 bg-white/90 p-1 shadow-xl shadow-slate-900/10 backdrop-blur-xl md:hidden"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium transition active:scale-95 ${
              active(n.href) ? "bg-amber-50 text-amber-600" : "text-slate-500"
            }`}
          >
            <Icon n={n.icon} className="h-5 w-5" />
            {n.short}
          </Link>
        ))}
      </nav>

      {/* drawer mobile (proyek + keluar) */}
      {menu && (
        <div className="noprint fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setMenu(false)} />
          <aside
            className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs animate-drawer-in flex-col overflow-y-auto bg-white shadow-2xl"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="font-semibold">Menu</span>
              <button className="btn-ghost !min-h-0 !p-2" onClick={() => setMenu(false)} aria-label="Tutup menu">
                <Icon n="x" />
              </button>
            </div>

            <div className="mx-3 mt-4">
              <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Proyek</div>
              <ProjectControls stacked onNew={() => open("new")} onEdit={() => open("edit")} onDelete={() => open("delete")} />
            </div>

            <div className="mt-auto p-3">
              <button className="btn w-full" onClick={logout}>Keluar</button>
            </div>
          </aside>
        </div>
      )}

      {(modal === "new" || modal === "edit") && <ProjectModal mode={modal} onClose={() => setModal(null)} onSave={saveProj} />}
      {modal === "delete" && <DeleteModal onClose={() => setModal(null)} onConfirm={deleteProj} />}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppProvider><Shell>{children}</Shell></AppProvider>;
}
