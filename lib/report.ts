import { CATS, STATUS, rp } from "@/lib/util";

export type PdfMode = "laporan" | "lampiran" | "struk";
export type Rcp = { path: string; data: string; w: number; h: number };

const catOf = (p: any) => p.category || "Lainnya";
const lcs = (s: any) => String(s ?? "").trim().toLowerCase();
const total = (a: any[], f: (x: any) => number) => a.reduce((t, x) => t + (f(x) || 0), 0);
export const fmtDate = (d: string) => (d ? String(d).slice(0, 10).split("-").reverse().join("/") : "");

/* =====================================================================
   EXCEL
   ===================================================================== */
export async function buildExcel(
  ExcelJS: any,
  d: { project: any; plans: any[]; allItems: any[]; rows: any[]; period: string },
) {
  const { project, plans, allItems, rows, period } = d;
  const wb = new ExcelJS.Workbook();
  wb.creator = "BuildNote";
  wb.created = new Date();

  const RP = '"Rp" #,##0;[Red]-"Rp" #,##0';
  const PCT = "0.0%";
  const DARK = "FF0F172A", AMBER = "FFFEF3C7", ZEBRA = "FFF8FAFC", GRAY = "FF64748B";
  const thin = { style: "thin", color: { argb: "FFE2E8F0" } };
  const box = { top: thin, left: thin, bottom: thin, right: thin };
  const fill = (argb: string) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
  const today = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

  const s = wb.addWorksheet("Ringkasan", { views: [{ showGridLines: false }] });
  const a = wb.addWorksheet("Rencana", { views: [{ state: "frozen", ySplit: 4, showGridLines: false }] });
  const b = wb.addWorksheet("Realisasi", { views: [{ state: "frozen", ySplit: 4, showGridLines: false }] });

  const page = (ws: any, landscape: boolean, titleRow?: string) => {
    ws.pageSetup = { paperSize: 9, orientation: landscape ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } };
    if (titleRow) ws.pageSetup.printTitlesRow = titleRow;
    ws.headerFooter.oddFooter = "&L&8BuildNote&R&8Halaman &P dari &N";
  };
  const title = (ws: any, text: string, sub: string, cols: number) => {
    ws.mergeCells(1, 1, 1, cols);
    const t = ws.getCell(1, 1);
    t.value = text; t.font = { bold: true, size: 16, color: { argb: DARK } }; t.alignment = { vertical: "middle" };
    ws.getRow(1).height = 28;
    ws.mergeCells(2, 1, 2, cols);
    const u = ws.getCell(2, 1);
    u.value = sub; u.font = { size: 10, color: { argb: GRAY } };
    ws.mergeCells(3, 1, 3, cols);
    const p = ws.getCell(3, 1);
    p.value = ""; // baris jarak
  };
  const header = (ws: any, row: number, labels: string[], right: number[] = [], center: number[] = []) => {
    labels.forEach((l, i) => {
      const c = ws.getCell(row, i + 1);
      c.value = l;
      c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      c.fill = fill(DARK);
      c.border = box;
      c.alignment = { vertical: "middle", horizontal: right.includes(i + 1) ? "right" : center.includes(i + 1) ? "center" : "left", wrapText: true };
    });
    ws.getRow(row).height = 22;
  };
  const styleRow = (ws: any, row: number, cols: number, zebra: boolean) => {
    for (let c = 1; c <= cols; c++) {
      const cell = ws.getCell(row, c);
      cell.border = box;
      cell.font = { ...(cell.font || {}), size: 10 };
      cell.alignment = { vertical: "middle", ...(cell.alignment || {}) };
      if (zebra) cell.fill = fill(ZEBRA);
    }
  };
  const totalRow = (ws: any, row: number, cols: number) => {
    for (let c = 1; c <= cols; c++) {
      const cell = ws.getCell(row, c);
      cell.fill = fill(AMBER);
      cell.font = { bold: true, size: 10, color: { argb: DARK } };
      cell.border = { top: { style: "medium", color: { argb: DARK } }, bottom: thin, left: thin, right: thin };
      cell.alignment = { vertical: "middle", ...(cell.alignment || {}) };
    }
    ws.getRow(row).height = 22;
  };
  const qtyFmt = (q: number) => (Number.isInteger(q) ? "#,##0" : "#,##0.00");
  const realOf = (n: string) => total(allItems.filter((i) => lcs(i.item_name) === lcs(n)), (i) => +i.subtotal);

  /* ---------- Rencana ---------- */
  a.columns = [{ width: 34 }, { width: 15 }, { width: 9 }, { width: 10 }, { width: 17 }, { width: 18 }, { width: 18 }, { width: 16 }];
  title(a, "Rencana Pembelian", `${project.name}  ·  dicetak ${today}`, 8);
  header(a, 4, ["Barang", "Kategori", "Qty", "Satuan", "Harga Est.", "Estimasi", "Realisasi", "Status"], [3, 5, 6, 7], [4, 8]);
  plans.forEach((p, i) => {
    const r = 5 + i, est = (+p.estimated_quantity || 0) * (+p.estimated_unit_price || 0);
    a.getCell(r, 1).value = p.item_name;
    a.getCell(r, 2).value = catOf(p);
    a.getCell(r, 3).value = +p.estimated_quantity || 0; a.getCell(r, 3).numFmt = qtyFmt(+p.estimated_quantity || 0);
    a.getCell(r, 4).value = p.unit; a.getCell(r, 4).alignment = { horizontal: "center" };
    a.getCell(r, 5).value = +p.estimated_unit_price || 0; a.getCell(r, 5).numFmt = RP;
    a.getCell(r, 6).value = { formula: `C${r}*E${r}`, result: est }; a.getCell(r, 6).numFmt = RP;
    a.getCell(r, 7).value = realOf(p.item_name); a.getCell(r, 7).numFmt = RP;
    const st = STATUS[p.status] || p.status;
    a.getCell(r, 8).value = st;
    a.getCell(r, 8).alignment = { horizontal: "center" };
    a.getCell(r, 8).font = { bold: true, color: { argb: p.status === "Purchased" ? "FF047857" : p.status === "Processing" ? "FFB45309" : p.status === "Cancelled" ? "FF94A3B8" : "FF334155" } };
    styleRow(a, r, 8, i % 2 === 1);
  });
  {
    const n = plans.length, r = 5 + n;
    a.getCell(r, 1).value = "TOTAL";
    a.getCell(r, 6).value = n ? { formula: `SUM(F5:F${4 + n})`, result: total(plans, (p) => (+p.estimated_quantity || 0) * (+p.estimated_unit_price || 0)) } : 0;
    a.getCell(r, 7).value = n ? { formula: `SUM(G5:G${4 + n})`, result: total(plans, (p) => realOf(p.item_name)) } : 0;
    a.getCell(r, 6).numFmt = RP; a.getCell(r, 7).numFmt = RP;
    totalRow(a, r, 8);
    if (n) a.autoFilter = `A4:H${4 + n}`;
  }
  page(a, true, "4:4");

  /* ---------- Realisasi ---------- */
  b.columns = [{ width: 13 }, { width: 24 }, { width: 34 }, { width: 15 }, { width: 9 }, { width: 10 }, { width: 17 }, { width: 18 }];
  title(b, "Realisasi Pembelian", `${project.name}  ·  ${period}  ·  dicetak ${today}`, 8);
  header(b, 4, ["Tanggal", "Toko", "Barang", "Kategori", "Qty", "Satuan", "Harga Satuan", "Subtotal"], [5, 7, 8], [1, 6]);
  rows.forEach((x, i) => {
    const r = 5 + i;
    b.getCell(r, 1).value = x.date ? new Date(String(x.date).slice(0, 10) + "T00:00:00Z") : "";
    b.getCell(r, 1).numFmt = "dd/mm/yyyy"; b.getCell(r, 1).alignment = { horizontal: "center" };
    b.getCell(r, 2).value = x.store;
    b.getCell(r, 3).value = x.item_name;
    b.getCell(r, 4).value = x.category;
    b.getCell(r, 5).value = +x.quantity || 0; b.getCell(r, 5).numFmt = qtyFmt(+x.quantity || 0);
    b.getCell(r, 6).value = x.unit; b.getCell(r, 6).alignment = { horizontal: "center" };
    b.getCell(r, 7).value = +x.unit_price || 0; b.getCell(r, 7).numFmt = RP;
    b.getCell(r, 8).value = { formula: `E${r}*G${r}`, result: +x.subtotal || 0 }; b.getCell(r, 8).numFmt = RP;
    styleRow(b, r, 8, i % 2 === 1);
  });
  const realTotal = total(rows, (x) => +x.subtotal);
  {
    const n = rows.length, r = 5 + n;
    b.getCell(r, 1).value = "TOTAL";
    b.getCell(r, 8).value = n ? { formula: `SUM(H5:H${4 + n})`, result: realTotal } : 0;
    b.getCell(r, 8).numFmt = RP;
    totalRow(b, r, 8);
    if (n) b.autoFilter = `A4:H${4 + n}`;
  }
  page(b, true, "4:4");

  /* ---------- Ringkasan ---------- */
  s.columns = [{ width: 36 }, { width: 22 }, { width: 14 }];
  title(s, "Laporan Pembelian", project.name, 3);
  s.getCell(3, 1).value = `${period}  ·  dicetak ${today}`;
  s.getCell(3, 1).font = { size: 10, color: { argb: GRAY } };

  const budget = +project.budget || 0;
  const estTotal = total(plans, (p) => (+p.estimated_quantity || 0) * (+p.estimated_unit_price || 0));
  const left = budget - realTotal, pct = budget ? realTotal / budget : 0;
  const statusText = !budget ? "Anggaran belum diisi" : realTotal > budget ? "Melebihi anggaran" : pct >= 0.8 ? "Hampir habis" : "Aman";
  const estRef = `Rencana!F${5 + plans.length}`, realRef = `Realisasi!H${5 + rows.length}`;

  header(s, 5, ["Ringkasan", "Nilai"], [2]);
  const kv: [string, any, string | null][] = [
    ["Anggaran", budget, RP],
    ["Estimasi rencana (semua item)", { formula: estRef, result: estTotal }, RP],
    ["Realisasi (sesuai filter)", { formula: realRef, result: realTotal }, RP],
    ["Sisa anggaran", { formula: "B6-B8", result: left }, RP],
    ["Terpakai", { formula: "IF(B6=0,0,B8/B6)", result: pct }, PCT],
    ["Status", { formula: 'IF(B6=0,"Anggaran belum diisi",IF(B8>B6,"Melebihi anggaran",IF(B8/B6>=0.8,"Hampir habis","Aman")))', result: statusText }, null],
  ];
  kv.forEach(([k, v, fmt], i) => {
    const r = 6 + i;
    s.getCell(r, 1).value = k; s.getCell(r, 1).font = { bold: true, size: 10 };
    s.getCell(r, 2).value = v; if (fmt) s.getCell(r, 2).numFmt = fmt;
    s.getCell(r, 2).alignment = { horizontal: "right" };
    styleRow(s, r, 2, i % 2 === 1);
  });
  s.getCell(9, 2).font = { bold: true, size: 10, color: { argb: left < 0 ? "FFBE123C" : "FF047857" } };

  const catStart = 14;
  header(s, catStart - 1, ["Pengeluaran per kategori", "Total", "Porsi"], [2, 3]);
  const lastRow = Math.max(5, 4 + rows.length);
  const catTot = (c: string) => total(rows.filter((x) => x.category === c), (x) => +x.subtotal);
  const totRow = catStart + CATS.length;
  CATS.forEach((c, i) => {
    const r = catStart + i;
    s.getCell(r, 1).value = c;
    s.getCell(r, 2).value = { formula: `SUMIF(Realisasi!$D$5:$D$${lastRow},A${r},Realisasi!$H$5:$H$${lastRow})`, result: catTot(c) };
    s.getCell(r, 2).numFmt = RP;
    s.getCell(r, 3).value = { formula: `IF($B$${totRow}=0,0,B${r}/$B$${totRow})`, result: realTotal ? catTot(c) / realTotal : 0 };
    s.getCell(r, 3).numFmt = PCT;
    styleRow(s, r, 3, i % 2 === 1);
  });
  s.getCell(totRow, 1).value = "TOTAL";
  s.getCell(totRow, 2).value = { formula: `SUM(B${catStart}:B${totRow - 1})`, result: total(CATS, catTot) };
  s.getCell(totRow, 2).numFmt = RP;
  s.getCell(totRow, 3).value = { formula: `SUM(C${catStart}:C${totRow - 1})`, result: realTotal ? total(CATS, catTot) / realTotal : 0 };
  s.getCell(totRow, 3).numFmt = PCT;
  totalRow(s, totRow, 3);
  page(s, false);

  return wb.xlsx.writeBuffer();
}

/* =====================================================================
   PDF
   ===================================================================== */
export function buildPdf(
  jsPDF: any, autoTable: any,
  d: { project: any; rows: any[]; period: string; mode: PdfMode; receipts: Rcp[]; metaOf: (path: string) => any },
) {
  const { project, rows, period, mode, receipts, metaOf } = d;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 14;
  const sumAll = total(rows, (r) => +r.subtotal);
  let first = true;

  if (mode !== "struk") {
    first = false;
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(15, 23, 42);
    doc.text("Laporan Pembelian", M, 17);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
    doc.text(String(project.name), M, 23);
    doc.setFontSize(8.5); doc.setTextColor(100, 116, 139);
    doc.text(period, M, 28);

    const budget = +project.budget || 0, left = budget - sumAll;
    const bw = (W - 2 * M - 8) / 3;
    ([["Anggaran", rp(budget), false], ["Realisasi", rp(sumAll), false], ["Sisa anggaran", rp(left), left < 0]] as any[]).forEach(([l, v, bad], i) => {
      const x = M + i * (bw + 4);
      doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, 32, bw, 15, 2, 2, "FD");
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
      doc.text(l, x + 3, 37.5);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      if (bad) doc.setTextColor(190, 18, 60); else doc.setTextColor(15, 23, 42);
      doc.text(v, x + 3, 43.5);
    });
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: 53,
      margin: { left: M, right: M },
      head: [["Tanggal", "Toko", "Barang", "Kategori", "Qty", "Harga", "Subtotal"]],
      body: rows.map((r) => [fmtDate(r.date), r.store, r.item_name, r.category, `${r.quantity} ${r.unit}`, rp(r.unit_price), rp(r.subtotal)]),
      foot: [["", "", "", "", "", "Total", rp(sumAll)]],
      showFoot: "lastPage",
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.1, textColor: [30, 41, 59], valign: "middle" },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [254, 243, 199], textColor: [15, 23, 42], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (h: any) => { if (h.section !== "body" && [4, 5, 6].includes(h.column.index)) h.cell.styles.halign = "right"; },
      columnStyles: {
        0: { cellWidth: 20 }, 1: { cellWidth: 30 }, 3: { cellWidth: 22 },
        4: { halign: "right", cellWidth: 20 }, 5: { halign: "right", cellWidth: 25 }, 6: { halign: "right", cellWidth: 27 },
      },
    });

    // ringkasan per kategori
    const byCat: Record<string, number> = {};
    rows.forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + (+r.subtotal || 0); });
    const cats = Object.entries(byCat).sort((x, y) => y[1] - x[1]);
    if (cats.length) {
      const y0 = (doc as any).lastAutoTable.finalY + 8;
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
      if (y0 > H - 50) doc.addPage();
      const ys = y0 > H - 50 ? 20 : y0;
      doc.text("Ringkasan per kategori", M, ys);
      autoTable(doc, {
        startY: ys + 3,
        margin: { left: M, right: M },
        tableWidth: 110,
        head: [["Kategori", "Total", "Porsi"]],
        body: cats.map(([c, v]) => [c, rp(v), sumAll ? `${((v / sumAll) * 100).toFixed(1)}%` : "0%"]),
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.1, textColor: [30, 41, 59] },
        headStyles: { fillColor: [245, 158, 11], textColor: [15, 23, 42], fontStyle: "bold" },
        didParseCell: (h: any) => { if (h.section === "head" && [1, 2].includes(h.column.index)) h.cell.styles.halign = "right"; },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right", cellWidth: 20 } },
      });
    }
  }

  if (mode !== "laporan") {
    for (const rc of receipts) {
      if (!first) doc.addPage();
      first = false;
      const b = metaOf(rc.path);
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(15, 23, 42);
      doc.text(`Struk - ${b?.store_name ?? ""}`, M, 16);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
      doc.text(`${fmtDate(b?.purchase_date)}   |   Total ${rp(b?.total_amount ?? 0)}   |   ${project.name}`, M, 22);
      doc.setTextColor(0, 0, 0);
      const maxW = W - 2 * M, maxH = H - 30 - 14;
      let w = maxW, h = (w * rc.h) / rc.w;
      if (h > maxH) { h = maxH; w = (h * rc.w) / rc.h; }
      doc.addImage(rc.data, "JPEG", M + (maxW - w) / 2, 28, w, h);
    }
  }

  const n = doc.getNumberOfPages();
  const stamp = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
    doc.text(`BuildNote  -  dicetak ${stamp}`, M, H - 8);
    doc.text(`Halaman ${i} dari ${n}`, W - M, H - 8, { align: "right" });
  }
  return doc;
}