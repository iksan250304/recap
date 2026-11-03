"use client";
import { useApp } from "@/lib/ctx";
import { rp, sum } from "@/lib/util";

function Stat({ title, value, tone = "slate" }: {
  title: string; value: string; tone?: "slate" | "emerald" | "rose";
}) {
  const text = tone === "rose" ? "text-rose-600" : tone === "emerald" ? "text-emerald-600" : "";
  return (
    <div className="card card-hover min-w-0">
      <div className="text-xs font-medium text-slate-500">{title}</div>
      <div className={`mt-1 truncate text-lg font-bold tracking-tight tabular-nums sm:text-xl ${text}`}>{value}</div>
    </div>
  );
}

const BAR = ["bg-amber-500", "bg-sky-500", "bg-emerald-500", "bg-violet-500", "bg-rose-400", "bg-teal-500", "bg-orange-400"];

export default function Dashboard() {
  const { project, plans, buys } = useApp();
  const items = buys.flatMap((b) => b.purchase_items);
  const real = sum(items, (i) => +i.subtotal);
<<<<<<< HEAD
  // rencana belum dibeli = estimasi dikurangi yang sudah terealisasi (rencana "Diproses" = dibeli sebagian)
  const realOf = (n: string) => sum(items.filter((i) => i.item_name.toLowerCase() === n.toLowerCase()), (i) => +i.subtotal);
  const est = sum(
    plans.filter((p) => ["Planned", "Processing"].includes(p.status)),
    (p) => Math.max(0, p.estimated_quantity * p.estimated_unit_price - realOf(p.item_name))
=======
  const est = sum(
    plans.filter((p) => ["Planned", "Processing"].includes(p.status)),
    (p) => p.estimated_quantity * p.estimated_unit_price
>>>>>>> f3a67b5c50398de2a7f5a10d44f28d931d8942c8
  );
  const bg = +project.budget;
  const pct = bg ? (real / bg) * 100 : 0;
  const left = bg - real;
  const over = bg > 0 && real + est > bg;

  const byCat: Record<string, number> = {};
  items.forEach((i) => (byCat[i.category] = (byCat[i.category] || 0) + +i.subtotal));
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  const status =
    !bg ? { t: "Anggaran belum diisi", c: "badge-mute", bar: "bg-slate-300" }
    : pct > 100 ? { t: "Melebihi anggaran", c: "badge-bad", bar: "bg-rose-500" }
    : pct >= 80 ? { t: "Hampir habis", c: "badge-warn", bar: "bg-amber-500" }
    : { t: "Aman", c: "badge-ok", bar: "bg-emerald-500" };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-title">Dasbor</h1>
        <p className="page-sub">{project.name}</p>
      </div>

      {/* hero */}
      <section className="card relative overflow-hidden !p-5 sm:!p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500">Realisasi pembelian</div>
            <div className="stat-num mt-1 break-words">{rp(real)}</div>
            <div className="mt-1 text-xs text-slate-500">dari anggaran {rp(bg)}</div>
          </div>
          <span className={`badge ${status.c}`}>{status.t}</span>
        </div>

        <div className="relative mt-5">
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full transition-all duration-700 ${status.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span className="font-semibold tabular-nums text-slate-700">{pct.toFixed(1)}%</span>
            <span>{left >= 0 ? `Sisa ${rp(left)}` : `Lebih ${rp(-left)}`}</span>
          </div>
        </div>

        {over && (
          <p className="relative mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            Realisasi + rencana melebihi anggaran {rp(real + est - bg)}.
          </p>
        )}
      </section>

      {/* stats */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat title="Anggaran" value={rp(bg)} tone="slate" />
        <Stat title="Realisasi" value={rp(real)} tone="slate" />
        <Stat title="Sisa anggaran" value={rp(left)} tone={left < 0 ? "rose" : "emerald"} />
        <Stat title="Rencana belum dibeli" value={rp(est)} tone="slate" />
      </section>

      {/* categories */}
      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Pengeluaran per kategori</h2>
          {cats.length > 0 && <span className="badge badge-mute">{cats.length} kategori</span>}
        </div>

        {cats.length === 0 ? (
          <div className="empty !border-0 !bg-transparent !py-8">
            <p className="font-medium text-slate-700">Belum ada data pembelian</p>
            <p className="text-xs">Tambah nota di menu Rekap untuk lihat ringkasan di sini.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {cats.map(([c, v], i) => {
              const share = real ? (v / real) * 100 : 0;
              return (
                <li key={c}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 font-medium">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${BAR[i % BAR.length]}`} />
                      <span className="truncate">{c}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {rp(v)} <span className="ml-1 text-xs text-slate-400">{share.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all duration-700 ${BAR[i % BAR.length]}`} style={{ width: `${share}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
