"use client";
import { useState } from "react";
import { sb } from "@/lib/supabase";
import { useApp } from "@/lib/ctx";
import { CATS, rp, sum, STATUS } from "@/lib/util";
import { lc, syncPlanStatuses } from "@/lib/plan";

type SortKey = "asli" | "nama-asc" | "nama-desc" | "kategori" | "status" | "est-desc" | "est-asc";
const SORTS: [SortKey, string][] = [
  ["asli", "Urutan asli"],
  ["nama-asc", "Nama A–Z"],
  ["nama-desc", "Nama Z–A"],
  ["kategori", "Kategori"],
  ["status", "Status"],
  ["est-desc", "Estimasi terbesar"],
  ["est-asc", "Estimasi terkecil"],
];
const STATUS_ORDER: Record<string, number> = { Planned: 0, Processing: 1, Purchased: 2, Cancelled: 3 };
const collator = new Intl.Collator("id", { numeric: true, sensitivity: "base" });
const catOf = (p: any) => p.category || "Lainnya";
const catRank = (p: any) => { const i = CATS.indexOf(catOf(p)); return i < 0 ? 99 : i; };
const estOf = (p: any) => p.estimated_quantity * p.estimated_unit_price;

export default function Planning() {
  const { project, plans, buys, reload } = useApp();
  const [q, setQ] = useState(""), [cat, setCat] = useState(""), [sort, setSort] = useState<SortKey>("asli");
  const items = buys.flatMap((b) => b.purchase_items);

  const upd = async (id: string, patch: any) => {
    const { error } = await sb.from("purchase_planning").update(patch).eq("id", id);
    if (error) {
      alert(/category/i.test(error.message)
        ? "Kolom 'category' belum ada di database. Jalankan SQL penambahan kolom di Supabase dulu."
        : "Gagal menyimpan: " + error.message);
      return reload();
    }
    // nama/qty/satuan berubah -> cek ulang apakah sudah ada pembelian yang cocok (status hanya naik, tidak turun)
    if ("item_name" in patch || "estimated_quantity" in patch || "unit" in patch) {
      const cur = plans.find((x) => x.id === id);
      await syncPlanStatuses(project.id, [patch.item_name ?? cur?.item_name], false);
    }
    reload();
  };
  const add = async () => { await sb.from("purchase_planning").insert({ project_id: project.id, item_name: "Barang baru" }); reload(); };
  const del = async (id: string) => {
    if (!confirm("Hapus rencana ini?")) return;
    await sb.from("purchase_planning").delete().eq("id", id); reload();
  };
  const real = (n: string) => sum(items.filter((i) => i.item_name.toLowerCase() === n.toLowerCase()), (i) => +i.subtotal);
  const totalEst = sum(plans, (p) => estOf(p));

  /* ---------- cari, filter, urutkan ---------- */
  const key = lc(q);
  const idx = new Map(plans.map((p, i) => [p.id, i]));
  const byName = (a: any, b: any) => collator.compare(a.item_name || "", b.item_name || "");
  const cmp = (a: any, b: any) => {
    let r = 0;
    switch (sort) {
      case "nama-asc": r = byName(a, b); break;
      case "nama-desc": r = -byName(a, b); break;
      case "kategori": r = catRank(a) - catRank(b) || byName(a, b); break;
      case "status": r = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || byName(a, b); break;
      case "est-desc": r = estOf(b) - estOf(a); break;
      case "est-asc": r = estOf(a) - estOf(b); break;
    }
    return r || (idx.get(a.id)! - idx.get(b.id)!);
  };
  const list = plans
    .filter((p) => (!cat || catOf(p) === cat) && (!key || lc(p.item_name).includes(key) || lc(catOf(p)).includes(key)))
    .sort(cmp);
  const filtered = !!(key || cat);
  const dirty = filtered || sort !== "asli";
  const reset = () => { setQ(""); setCat(""); setSort("asli"); };
  const visEst = sum(list, (p) => estOf(p));
  const visReal = filtered ? sum(list, (p) => real(p.item_name)) : sum(items, (i) => +i.subtotal);

  const field = (p: any, k: string, num = false, cls = "cell") => (
    <input className={cls} type={num ? "number" : "text"} step="any" inputMode={num ? "decimal" : undefined}
      defaultValue={p[k]} key={p.id + k + p[k]}
      onBlur={(e) => { const v = num ? +e.target.value : e.target.value; if (v !== p[k]) upd(p.id, { [k]: v }); }} />
  );
  const statusSel = (p: any, cls: string) => (
    <select className={cls} value={p.status} onChange={(e) => upd(p.id, { status: e.target.value })}>
      {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
  const catSel = (p: any, cls: string) => (
    <select className={cls} value={catOf(p)} onChange={(e) => upd(p.id, { category: e.target.value })} aria-label="Kategori">
      {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
      {!CATS.includes(catOf(p)) && <option value={catOf(p)}>{catOf(p)}</option>}
    </select>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Rencana Pembelian</h1>
          <p className="page-sub">{plans.length} item · estimasi {rp(totalEst)}</p>
        </div>
        <button className="btn-p shrink-0" onClick={add}>
          Tambah
        </button>
      </div>

      {!plans.length && (
        <div className="empty">
          <p className="font-medium text-slate-700">Belum ada rencana</p>
          <p className="text-xs">Tekan Tambah untuk mulai daftar bahan yang mau dibeli.</p>
        </div>
      )}

      {/* cari + filter + urutkan */}
      {plans.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
            <input
              className="inp col-span-2 md:col-span-1 md:flex-1" type="search" placeholder="Cari barang atau kategori…"
              value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari"
            />
            <select className="inp md:w-48" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter kategori">
              <option value="">Semua kategori</option>
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="inp md:w-52" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Urutkan">
              {SORTS.map(([k, t]) => <option key={k} value={k}>Urutkan: {t}</option>)}
            </select>
          </div>
          {dirty && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{filtered ? `${list.length} dari ${plans.length} item` : "Diurutkan"}</span>
              <button className="btn-ghost !min-h-0 !px-2 !py-1 text-xs text-amber-700" onClick={reset}>Reset</button>
            </div>
          )}
        </div>
      )}

      {plans.length > 0 && !list.length && (
        <div className="empty">
          <p className="font-medium text-slate-700">Tidak ada rencana yang cocok</p>
          <p className="text-xs">Ubah kata kunci atau filter kategori.</p>
          <button className="btn mt-2" onClick={reset}>Reset filter</button>
        </div>
      )}

      {/* Mobile: kartu */}
      {list.length > 0 && (
        <div className="space-y-3 md:hidden">
          {list.map((p) => {
            const r = real(p.item_name);
            return (
              <div key={p.id} className="card space-y-3">
                <div className="flex items-center gap-2">
                  {field(p, "item_name", false, "inp min-w-0 flex-1 font-semibold")}
                  <button className="btn-ghost !min-h-0 !px-3 !py-2 text-rose-500" onClick={() => del(p.id)} aria-label="Hapus">
                    Hapus
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label><span className="lbl">Qty</span>{field(p, "estimated_quantity", true, "inp w-full")}</label>
                  <label><span className="lbl">Satuan</span>{field(p, "unit", false, "inp w-full")}</label>
                  <label><span className="lbl">Harga est.</span>{field(p, "estimated_unit_price", true, "inp w-full")}</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label><span className="lbl">Kategori</span>{catSel(p, "inp w-full")}</label>
                  <label><span className="lbl">Status</span>{statusSel(p, "inp w-full")}</label>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">Estimasi</span>
                  <div className="text-right">
                    <div className="text-lg font-bold tabular-nums">{rp(estOf(p))}</div>
                    {r > 0 && <span className="badge badge-ok mt-1">Real {rp(r)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="card flex items-center justify-between bg-slate-900 !text-white">
            <span className="text-slate-300">{filtered ? "Total hasil filter" : "Total estimasi"}</span>
            <span className="text-lg font-bold tabular-nums">{rp(visEst)}</span>
          </div>
        </div>
      )}

      {/* Desktop: tabel */}
      {list.length > 0 && (
        <div className="table-wrap hidden md:block">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                <th>Barang</th><th>Kategori</th><th>Qty</th><th>Satuan</th><th>Harga Est.</th>
                <th className="text-right">Estimasi</th><th className="text-right">Realisasi</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>{field(p, "item_name")}</td>
                  <td className="w-36">{catSel(p, "cell")}</td>
                  <td className="w-24">{field(p, "estimated_quantity", true)}</td>
                  <td className="w-24">{field(p, "unit")}</td>
                  <td className="w-36">{field(p, "estimated_unit_price", true)}</td>
                  <td className="text-right font-medium">{rp(estOf(p))}</td>
                  <td className="text-right">{real(p.item_name) ? <span className="badge badge-ok">{rp(real(p.item_name))}</span> : <span className="text-slate-300">–</span>}</td>
                  <td className="w-40">{statusSel(p, "cell")}</td>
                  <td className="w-12">
                    <button className="btn-ghost !min-h-0 !px-3 !py-1.5 text-rose-500 hover:!bg-rose-50" onClick={() => del(p.id)} aria-label="Hapus">
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold hover:!bg-slate-50">
                <td colSpan={5}>{filtered ? "Total hasil filter" : "Total"}</td>
                <td className="text-right">{rp(visEst)}</td>
                <td className="text-right">{rp(visReal)}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}