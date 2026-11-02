"use client";
import { sb } from "@/lib/supabase";
import { useApp } from "@/lib/ctx";
import { rp, sum, STATUS } from "@/lib/util";

export default function Planning() {
  const { project, plans, buys, reload } = useApp();
  const items = buys.flatMap((b) => b.purchase_items);
  const upd = async (id: string, patch: any) => { await sb.from("purchase_planning").update(patch).eq("id", id); reload(); };
  const add = async () => { await sb.from("purchase_planning").insert({ project_id: project.id, item_name: "Barang baru" }); reload(); };
  const del = async (id: string) => {
    if (!confirm("Hapus rencana ini?")) return;
    await sb.from("purchase_planning").delete().eq("id", id); reload();
  };
  const real = (n: string) => sum(items.filter((i) => i.item_name.toLowerCase() === n.toLowerCase()), (i) => +i.subtotal);
  const totalEst = sum(plans, (p) => p.estimated_quantity * p.estimated_unit_price);

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

      {/* Mobile: kartu */}
      {plans.length > 0 && (
        <div className="space-y-3 md:hidden">
          {plans.map((p) => {
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
                <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                  {statusSel(p, "inp")}
                  <div className="text-right">
                    <div className="text-lg font-bold tabular-nums">{rp(p.estimated_quantity * p.estimated_unit_price)}</div>
                    {r > 0 && <span className="badge badge-ok mt-1">Real {rp(r)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="card flex items-center justify-between bg-slate-900 !text-white">
            <span className="text-slate-300">Total estimasi</span>
            <span className="text-lg font-bold tabular-nums">{rp(totalEst)}</span>
          </div>
        </div>
      )}

      {/* Desktop: tabel */}
      {plans.length > 0 && (
        <div className="table-wrap hidden md:block">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr>
                <th>Barang</th><th>Qty</th><th>Satuan</th><th>Harga Est.</th>
                <th className="text-right">Estimasi</th><th className="text-right">Realisasi</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>{field(p, "item_name")}</td>
                  <td className="w-24">{field(p, "estimated_quantity", true)}</td>
                  <td className="w-24">{field(p, "unit")}</td>
                  <td className="w-36">{field(p, "estimated_unit_price", true)}</td>
                  <td className="text-right font-medium">{rp(p.estimated_quantity * p.estimated_unit_price)}</td>
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
                <td colSpan={4}>Total</td>
                <td className="text-right">{rp(totalEst)}</td>
                <td className="text-right">{rp(sum(items, (i) => +i.subtotal))}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
