"use client";
import { useEffect, useRef, useState } from "react";
import { sb } from "@/lib/supabase";
import Icon from "@/components/Icon";
import { CATS, compress, rp, sum, toB64, today } from "@/lib/util";

type Item = { item_name: string; category: string; quantity: number; unit: string; unit_price: number };
type Msg = { type: "err" | "info"; text: string } | null;
const blank = (): Item => ({ item_name: "", category: "Sipil", quantity: 1, unit: "pcs", unit_price: 0 });

export default function ScanModal({ projectId, onClose, onSaved }: { projectId: string; onClose: () => void; onSaved: () => void }) {
  const [img, setImg] = useState<Blob | null>(null), [preview, setPreview] = useState(""), [hover, setHover] = useState(false);
  const [store, setStore] = useState(""), [date, setDate] = useState(today()), [items, setItems] = useState<Item[]>([blank()]);
  const [msg, setMsg] = useState<Msg>(null), [ocr, setOcr] = useState(false), [saving, setSaving] = useState(false);
  const [ocrFailed, setOcrFailed] = useState(false);
  const [sec, setSec] = useState(0);
  const cam = useRef<HTMLInputElement>(null), gal = useRef<HTMLInputElement>(null);
  const total = sum(items, (i) => i.quantity * i.unit_price);
  const err = (text: string) => setMsg({ type: "err", text });

  useEffect(() => {
    if (!ocr) { setSec(0); return; }
    const t = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [ocr]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [onClose, saving]);

  async function runOcr(b: Blob) {
    setOcr(true); setMsg(null); setOcrFailed(false);
    try {
      const { data } = await sb.auth.getSession();
      const r = await fetch("/api/ocr", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token}` },
        body: JSON.stringify({ image: await toB64(b) }),
        signal: AbortSignal.timeout(58000),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setStore(j.store || ""); if (j.date) setDate(j.date);
      setItems(j.items?.length ? j.items.map((i: any) => ({
        item_name: i.name || "", category: CATS.includes(i.category) ? i.category : "Lainnya",
        quantity: +i.qty || 1, unit: i.unit || "pcs", unit_price: +i.unit_price || 0,
      })) : [blank()]);
      setMsg({ type: "info", text: "Hasil OCR. Periksa dan koreksi sebelum menyimpan." });
    } catch (e: any) {
      err("OCR gagal: " + (e?.name === "TimeoutError" ? "waktu habis, koneksi lambat" : e?.message || "tidak diketahui") + ". Coba lagi atau isi manual.");
      setOcrFailed(true);
    }
    setOcr(false);
  }

  async function pick(f?: File) {
    if (!f?.type.startsWith("image/")) return err("Pilih berkas gambar (JPG/PNG).");
    const b = await compress(f); setImg(b); setPreview(URL.createObjectURL(b));
    await runOcr(b);
  }
  const set = (x: number, k: keyof Item, v: any) =>
    setItems((a) => a.map((it, i) => (i === x ? { ...it, [k]: ["quantity", "unit_price"].includes(k) ? +v || 0 : v } : it)));
  const del = (x: number) => setItems((a) => (a.length > 1 ? a.filter((_, i) => i !== x) : [blank()]));

  async function save() {
    if (!store.trim() || !items.some((i) => i.item_name.trim())) return err("Isi nama toko dan minimal 1 barang.");
    setSaving(true); setMsg(null);
    const { data: u } = await sb.auth.getUser();
    let path: string | null = null;
    if (img) {
      path = `${u.user!.id}/${crypto.randomUUID()}.jpg`;
      const up = await sb.storage.from("receipts").upload(path, img, { contentType: "image/jpeg" });
      if (up.error) { setSaving(false); return err("Upload gagal: " + up.error.message); }
    }
    const { data: p, error } = await sb.from("actual_purchases")
      .insert({ project_id: projectId, store_name: store, purchase_date: date, total_amount: total, receipt_image_url: path }).select().single();
    if (error) { setSaving(false); return err(error.message); }
    const { error: e2 } = await sb.from("purchase_items")
      .insert(items.filter((i) => i.item_name.trim()).map((i) => ({ ...i, purchase_id: p.id })));
    setSaving(false);
    if (e2) return err(e2.message);
    onSaved(); onClose();
  }

  return (
    <>
      <div className="backdrop" onClick={() => !saving && onClose()} />
      <div
        role="dialog" aria-modal aria-label="Tambah pembelian"
        className="fixed inset-x-0 bottom-0 z-50 flex h-[94dvh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-sheet-up
          md:inset-auto md:left-1/2 md:top-1/2 md:h-auto md:max-h-[92dvh] md:w-[min(64rem,calc(100vw-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Tambah pembelian</h2>
            <p className="text-xs text-slate-500">Scan struk atau isi manual.</p>
          </div>
          <button className="btn-ghost !min-h-0 !p-2" onClick={onClose} disabled={saving} aria-label="Tutup">
            <Icon n="x" />
          </button>
        </div>

        {/* body */}
        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-[1fr_1.8fr]">
          {/* kiri: gambar */}
          <div className="min-w-0 md:sticky md:top-0 md:self-start">
            {preview ? (
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <img src={preview} className="max-h-56 w-full object-contain md:max-h-[55dvh]" alt="Struk" />
                {ocr && (
                  <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-sm">
                    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium shadow-lg">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                      {sec < 3 ? "Mengirim gambar…" : sec < 10 ? "Membaca teks struk…" : `Masih memproses… ${sec} dtk`}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setHover(true); }}
                onDragLeave={() => setHover(false)}
                onDrop={(e) => { e.preventDefault(); setHover(false); pick(e.dataTransfer.files[0]); }}
                className={`rounded-2xl border-2 border-dashed p-5 text-center transition ${hover ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-slate-50/60"}`}
              >
                <p className="mb-4 hidden text-sm text-slate-500 md:block">Tarik dan lepas struk di sini, atau pilih:</p>
                <p className="mb-3 text-[11px] text-slate-400">Tips: foto satu struk saja, tegak, cahaya terang.</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
                  <button className="btn-p" onClick={() => cam.current?.click()}>Ambil foto</button>
                  <button className="btn" onClick={() => gal.current?.click()}>Dari galeri</button>
                </div>
              </div>
            )}
            <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
            <input ref={gal} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />

            {preview && !ocr && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="btn" onClick={() => gal.current?.click()}>Ganti foto</button>
                {ocrFailed && img && <button className="btn-p" onClick={() => runOcr(img)}>Coba lagi</button>}
              </div>
            )}
            {msg && (
              <p role="status" className={`mt-3 break-words rounded-xl px-3 py-2.5 text-xs ${msg.type === "err" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>
                {msg.text}
              </p>
            )}
          </div>

          {/* kanan: form */}
          <div className="min-w-0 space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="lbl">Nama toko</label>
                <input className="inp w-full" placeholder="Contoh: TB Maju Jaya" value={store} onChange={(e) => setStore(e.target.value)} />
              </div>
              <div>
                <label className="lbl">Tanggal</label>
                <input type="date" className="inp w-full" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Barang <span className="badge badge-mute ml-1">{items.length}</span></h3>
              <button className="btn-ghost !min-h-0 !py-1.5 text-amber-700" onClick={() => setItems((a) => [...a, blank()])}>
                Tambah baris
              </button>
            </div>

            {/* mobile: kartu item */}
            <div className="space-y-3 md:hidden">
              {items.map((it, x) => (
                <div key={x} className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="flex gap-2">
                    <input className="inp min-w-0 flex-1 font-medium" placeholder="Nama barang" value={it.item_name} onChange={(e) => set(x, "item_name", e.target.value)} />
                    <button className="btn-ghost !min-h-0 !px-3 !py-2 text-rose-500" onClick={() => del(x)} aria-label="Hapus baris">Hapus</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="lbl">Qty</label><input className="inp w-full" type="number" step="any" inputMode="decimal" value={it.quantity} onChange={(e) => set(x, "quantity", e.target.value)} /></div>
                    <div><label className="lbl">Satuan</label><input className="inp w-full" value={it.unit} onChange={(e) => set(x, "unit", e.target.value)} /></div>
                    <div><label className="lbl">Kategori</label><select className="inp w-full" value={it.category} onChange={(e) => set(x, "category", e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="min-w-0 flex-1"><label className="lbl">Harga satuan</label><input className="inp w-full" type="number" inputMode="numeric" value={it.unit_price} onChange={(e) => set(x, "unit_price", e.target.value)} /></div>
                    <div className="pb-2.5 text-right font-bold tabular-nums">{rp(it.quantity * it.unit_price)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* desktop: tabel item */}
            <div className="table-wrap hidden md:block">
              <table className="w-full">
                <thead><tr><th>Barang</th><th>Kategori</th><th>Qty</th><th>Sat.</th><th>Harga</th><th className="text-right">Subtotal</th><th /></tr></thead>
                <tbody>
                  {items.map((it, x) => (
                    <tr key={x}>
                      <td><input className="cell min-w-32" placeholder="Nama barang" value={it.item_name} onChange={(e) => set(x, "item_name", e.target.value)} /></td>
                      <td><select className="cell" value={it.category} onChange={(e) => set(x, "category", e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></td>
                      <td className="w-20"><input className="cell" type="number" step="any" value={it.quantity} onChange={(e) => set(x, "quantity", e.target.value)} /></td>
                      <td className="w-16"><input className="cell" value={it.unit} onChange={(e) => set(x, "unit", e.target.value)} /></td>
                      <td className="w-28"><input className="cell" type="number" value={it.unit_price} onChange={(e) => set(x, "unit_price", e.target.value)} /></td>
                      <td className="whitespace-nowrap text-right font-medium">{rp(it.quantity * it.unit_price)}</td>
                      <td className="w-10"><button className="btn-ghost !min-h-0 !px-2.5 !py-1 text-rose-500 hover:!bg-rose-50" onClick={() => del(x)} aria-label="Hapus baris">Hapus</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* footer */}
        <div
          className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-white px-5 pt-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mr-auto">
            <div className="text-[11px] font-medium text-slate-500">Total</div>
            <div className="text-lg font-bold tabular-nums">{rp(total)}</div>
          </div>
          <button className="btn" onClick={onClose} disabled={saving}>Batal</button>
          <button className="btn-p min-w-28" disabled={saving || ocr} onClick={save}>{saving ? "Menyimpan…" : "Simpan"}</button>
        </div>
      </div>
    </>
  );
}
