"use client";
import { useMemo, useState } from "react";
import { sb } from "@/lib/supabase";
import { useApp } from "@/lib/ctx";
import { CATS, STATUS, download, rp, sum } from "@/lib/util";

const EMPTY = { from: "", to: "", cat: "", store: "" };

export default function Reports() {
  const { project, plans, buys } = useApp();
  const [f, setF] = useState(EMPTY), [busy, setBusy] = useState("");
  const rows = useMemo(() => buys
    .filter((b) => (!f.from || b.purchase_date >= f.from) && (!f.to || b.purchase_date <= f.to) && (!f.store || b.store_name.toLowerCase().includes(f.store.toLowerCase())))
    .flatMap((b) => b.purchase_items.filter((i: any) => !f.cat || i.category === f.cat)
      .map((i: any) => ({ ...i, date: b.purchase_date, store: b.store_name, receipt: b.receipt_image_url }))), [buys, f]);
  const total = sum(rows, (r) => +r.subtotal);
  const filtered = !!(f.from || f.to || f.cat || f.store);

  async function excel() {
    setBusy("xlsx");
    const ExcelJS = (await import("exceljs")).default, wb = new ExcelJS.Workbook();
    const hdr = (ws: any) => { ws.getRow(1).font = { bold: true }; ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE68A" } }; };
    const s = wb.addWorksheet("Ringkasan"), a = wb.addWorksheet("Rencana"), b = wb.addWorksheet("Realisasi");
    a.addRow(["Barang", "Qty", "Satuan", "Harga Est.", "Estimasi", "Status"]); hdr(a);
    plans.forEach((p, i) => a.addRow([p.item_name, +p.estimated_quantity, p.unit, +p.estimated_unit_price,
      { formula: `B${i + 2}*D${i + 2}`, result: p.estimated_quantity * p.estimated_unit_price }, STATUS[p.status]]));
    a.addRow(["TOTAL", "", "", "", { formula: `SUM(E2:E${plans.length + 1})` }]);
    b.addRow(["Tanggal", "Toko", "Barang", "Kategori", "Qty", "Satuan", "Harga", "Subtotal"]); hdr(b);
    rows.forEach((r, i) => b.addRow([r.date, r.store, r.item_name, r.category, +r.quantity, r.unit, +r.unit_price,
      { formula: `E${i + 2}*G${i + 2}`, result: +r.subtotal }]));
    b.addRow(["TOTAL", "", "", "", "", "", "", { formula: `SUM(H2:H${rows.length + 1})` }]);
    [a.getColumn(4), a.getColumn(5), b.getColumn(7), b.getColumn(8)].forEach((c) => (c.numFmt = '"Rp" #,##0'));
    [a, b].forEach((w) => w.columns.forEach((c: any) => (c.width = 18)));
    s.addRows([["Proyek", project.name], ["Anggaran", +project.budget], ["Estimasi rencana", { formula: `Rencana!E${plans.length + 2}` }],
      ["Realisasi", { formula: `Realisasi!H${rows.length + 2}` }], ["Sisa anggaran", { formula: "B2-B4" }]]);
    s.getColumn(1).width = 20; s.getColumn(2).width = 24; s.getColumn(2).numFmt = '"Rp" #,##0'; s.getColumn(1).font = { bold: true };
    download(await wb.xlsx.writeBuffer(), `laporan-${project.name}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    setBusy("");
  }

  async function pdf() {
    setBusy("pdf");
    const { jsPDF } = await import("jspdf"), autoTable = (await import("jspdf-autotable")).default, doc = new jsPDF();
    doc.setFontSize(14); doc.text(`Laporan Pembelian – ${project.name}`, 14, 16);
    doc.setFontSize(10); doc.text(`Anggaran: ${rp(project.budget)}   Realisasi: ${rp(total)}   Sisa: ${rp(project.budget - total)}`, 14, 23);
    autoTable(doc, {
      startY: 28, head: [["Tanggal", "Toko", "Barang", "Kategori", "Qty", "Harga", "Subtotal"]], styles: { fontSize: 8 }, headStyles: { fillColor: [245, 158, 11], textColor: 20 },
      body: rows.map((r) => [r.date, r.store, r.item_name, r.category, `${r.quantity} ${r.unit}`, rp(r.unit_price), rp(r.subtotal)]),
      foot: [["", "", "", "", "", "Total", rp(total)]],
    });
    for (const path of [...new Set(rows.map((r) => r.receipt).filter(Boolean))] as string[]) {
      const { data } = await sb.storage.from("receipts").createSignedUrl(path, 120); if (!data) continue;
      const blob = await (await fetch(data.signedUrl)).blob();
      const url = await new Promise<string>((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(blob); });
      const bm = await createImageBitmap(blob), w = 180, h = Math.min(260, (bm.height / bm.width) * w);
      doc.addPage(); doc.setFontSize(9); doc.text(`Lampiran struk – ${rows.find((r) => r.receipt === path)?.store}`, 14, 12); doc.addImage(url, "JPEG", 14, 16, w, h);
    }
    doc.save(`laporan-${project.name}.pdf`); setBusy("");
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

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <button className="btn-p flex-1 sm:flex-none" disabled={!!busy} onClick={excel}>
            {busy === "xlsx" ? "Menyiapkan…" : "Ekspor Excel"}
          </button>
          <button className="btn flex-1 sm:flex-none" disabled={!!busy} onClick={pdf}>
            {busy === "pdf" ? "Menyiapkan…" : "Ekspor PDF"}
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
