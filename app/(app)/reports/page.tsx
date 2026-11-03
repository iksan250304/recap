"use client";
import { useMemo, useState } from "react";
import { sb } from "@/lib/supabase";
import { useApp } from "@/lib/ctx";
import { CATS, download, rp, sum } from "@/lib/util";
import { buildExcel, buildPdf, fmtDate, type PdfMode, type Rcp } from "@/lib/report";

const EMPTY = { from: "", to: "", cat: "", store: "" };
const MODES: [PdfMode, string][] = [
  ["laporan", "Laporan saja (tanpa struk)"],
  ["lampiran", "Laporan + lampiran struk"],
  ["struk", "Struk saja (PDF terpisah)"],
];

export default function Reports() {
  const { project, plans, buys } = useApp();
  const [f, setF] = useState(EMPTY), [busy, setBusy] = useState(""), [mode, setMode] = useState<PdfMode>("laporan");
  const rows = useMemo(() => buys
    .filter((b) => (!f.from || b.purchase_date >= f.from) && (!f.to || b.purchase_date <= f.to) && (!f.store || b.store_name.toLowerCase().includes(f.store.toLowerCase())))
    .flatMap((b) => b.purchase_items.filter((i: any) => !f.cat || i.category === f.cat)
      .map((i: any) => ({ ...i, date: b.purchase_date, store: b.store_name, receipt: b.receipt_image_url }))), [buys, f]);
  const total = sum(rows, (r) => +r.subtotal);
  const filtered = !!(f.from || f.to || f.cat || f.store);
  const receiptPaths = useMemo(() => [...new Set(rows.map((r) => r.receipt).filter(Boolean))] as string[], [rows]);

  const period = [
    f.from || f.to ? `Periode ${f.from ? fmtDate(f.from) : "awal"} s/d ${f.to ? fmtDate(f.to) : "sekarang"}` : "Semua tanggal",
    f.cat && `Kategori: ${f.cat}`,
    f.store && `Toko: ${f.store}`,
  ].filter(Boolean).join("  ·  ");

  async function excel() {
    setBusy("xlsx");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const allItems = buys.flatMap((b) => b.purchase_items);
      const buf = await buildExcel(ExcelJS, { project, plans, allItems, rows, period });
      download(buf, `laporan-${project.name}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } catch (e: any) {
      alert("Gagal membuat Excel: " + (e?.message || e));
    }
    setBusy("");
  }

  async function loadReceipts(paths: string[]): Promise<Rcp[]> {
    const got = await Promise.all(paths.map(async (path) => {
      try {
        const { data } = await sb.storage.from("receipts").createSignedUrl(path, 180);
        if (!data) return null;
        const blob = await (await fetch(data.signedUrl)).blob();
        const url = await new Promise<string>((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(blob); });
        const bm = await createImageBitmap(blob);
        return { path, data: url, w: bm.width, h: bm.height } as Rcp;
      } catch { return null; }
    }));
    return got.filter(Boolean) as Rcp[];
  }

  async function pdf() {
    if (mode !== "laporan" && !receiptPaths.length) return alert("Tidak ada foto struk pada data yang difilter.");
    setBusy("pdf");
    try {
      const { jsPDF } = await import("jspdf"), autoTable = (await import("jspdf-autotable")).default;
      const receipts = mode === "laporan" ? [] : await loadReceipts(receiptPaths);
      if (mode === "struk" && !receipts.length) throw new Error("foto struk tidak bisa dimuat");
      const doc = buildPdf(jsPDF, autoTable, {
        project, rows, period, mode, receipts,
        metaOf: (path) => buys.find((b) => b.receipt_image_url === path),
      });
      doc.save(`${mode === "struk" ? "struk" : "laporan"}-${project.name}.pdf`);
      if (mode === "lampiran" && receipts.length < receiptPaths.length)
        alert(`${receiptPaths.length - receipts.length} foto struk gagal dimuat dan tidak disertakan.`);
    } catch (e: any) {
      alert("Gagal membuat PDF: " + (e?.message || e));
    }
    setBusy("");
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-title">Laporan & Ekspor</h1>
        <p className="page-sub">Filter data lalu ekspor ke Excel atau PDF.</p>
      </div>

      {/* filter */}
      <section className="card space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className="lbl">Dari tanggal</label>
            <input type="date" className="inp w-full" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
          </div>
          <div>
            <label className="lbl">Sampai tanggal</label>
            <input type="date" className="inp w-full" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
          </div>
          <div>
            <label className="lbl">Kategori</label>
            <select className="inp w-full" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>
              <option value="">Semua kategori</option>{CATS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">Toko / vendor</label>
            <input className="inp w-full" placeholder="Cari toko…" value={f.store} onChange={(e) => setF({ ...f, store: e.target.value })} />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <label className="lbl" htmlFor="pdfmode">Isi file PDF</label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select id="pdfmode" className="inp w-full sm:w-72" value={mode} onChange={(e) => setMode(e.target.value as PdfMode)}>
              {MODES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
            <span className="text-xs text-slate-500">
              {receiptPaths.length} foto struk tersedia pada data ini
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-p flex-1 sm:flex-none" disabled={!!busy} onClick={excel}>
            {busy === "xlsx" ? "Menyiapkan…" : "Ekspor Excel"}
          </button>
          <button className="btn flex-1 sm:flex-none" disabled={!!busy} onClick={pdf}>
            {busy === "pdf" ? "Menyiapkan…" : mode === "struk" ? "Unduh Struk (PDF)" : "Ekspor PDF"}
          </button>
          {filtered && (
            <button className="btn-ghost sm:ml-auto" onClick={() => setF(EMPTY)}>
              Reset filter
            </button>
          )}
        </div>
      </section>

      {/* ringkasan */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="text-xs font-medium text-slate-500">Total hasil filter</div>
          <div className="mt-1 truncate text-lg font-bold tabular-nums sm:text-xl">{rp(total)}</div>
        </div>
        <div className="card">
          <div className="text-xs font-medium text-slate-500">Jumlah baris</div>
          <div className="mt-1 text-lg font-bold tabular-nums sm:text-xl">{rows.length}</div>
        </div>
      </div>

      {!rows.length && (
        <div className="empty">
          <p className="font-medium text-slate-700">Tidak ada data</p>
          <p className="text-xs">Ubah filter atau tambah pembelian dulu.</p>
        </div>
      )}

      {/* Mobile: kartu */}
      {rows.length > 0 && (
        <div className="space-y-2 md:hidden">
          {rows.map((r) => (
            <div key={r.id} className="card flex justify-between gap-3 !p-4">
              <div className="min-w-0">
                <div className="truncate font-semibold">{r.item_name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{r.date} · {r.store}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="badge badge-mute">{r.category}</span>
                  <span className="text-xs text-slate-500">{r.quantity} {r.unit} × {rp(r.unit_price)}</span>
                </div>
              </div>
              <div className="whitespace-nowrap font-bold tabular-nums">{rp(r.subtotal)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop: tabel */}
      {rows.length > 0 && (
        <div className="table-wrap hidden md:block">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <th>Tanggal</th><th>Toko</th><th>Barang</th><th>Kategori</th>
                <th className="text-right">Qty</th><th className="text-right">Harga</th><th className="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{r.date}</td>
                  <td>{r.store}</td>
                  <td className="font-medium">{r.item_name}</td>
                  <td><span className="badge badge-mute">{r.category}</span></td>
                  <td className="text-right">{r.quantity} {r.unit}</td>
                  <td className="text-right">{rp(r.unit_price)}</td>
                  <td className="text-right font-semibold">{rp(r.subtotal)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold hover:!bg-slate-50">
                <td colSpan={6}>Total</td><td className="text-right">{rp(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}