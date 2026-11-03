"use client";
import { useState } from "react";
import { sb } from "@/lib/supabase";
import { useApp } from "@/lib/ctx";
import ScanModal from "@/components/ScanModal";
<<<<<<< HEAD
import { deletePurchase } from "@/lib/plan";
=======
>>>>>>> f3a67b5c50398de2a7f5a10d44f28d931d8942c8
import { rp } from "@/lib/util";

export default function Purchases() {
  const { project, buys, reload } = useApp();
<<<<<<< HEAD
  const [modal, setModal] = useState<{ purchase?: any } | null>(null);
=======
  const [open, setOpen] = useState(false);
>>>>>>> f3a67b5c50398de2a7f5a10d44f28d931d8942c8

  async function view(path: string) {
    const { data } = await sb.storage.from("receipts").createSignedUrl(path, 300);
    if (data) window.open(data.signedUrl, "_blank");
  }
  async function del(b: any) {
<<<<<<< HEAD
    if (!confirm("Hapus pembelian ini? Struk dan semua barangnya ikut terhapus.")) return;
    const e = await deletePurchase(b, project.id);
    if (e) alert("Gagal menghapus: " + e);
    reload();
  }
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  const openKey = (b: any) => (e: React.KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setModal({ purchase: b }); }
  };
=======
    if (!confirm("Hapus pembelian ini?")) return;
    if (b.receipt_image_url) await sb.storage.from("receipts").remove([b.receipt_image_url]);
    await sb.from("actual_purchases").delete().eq("id", b.id); reload();
  }
>>>>>>> f3a67b5c50398de2a7f5a10d44f28d931d8942c8

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Rekap Pembelian</h1>
<<<<<<< HEAD
          <p className="page-sub">{buys.length} nota tercatat{buys.length > 0 && " · ketuk nota untuk mengubah"}</p>
        </div>
        <button className="btn-p hidden shrink-0 md:inline-flex" onClick={() => setModal({})}>
=======
          <p className="page-sub">{buys.length} nota tercatat</p>
        </div>
        <button className="btn-p hidden shrink-0 md:inline-flex" onClick={() => setOpen(true)}>
>>>>>>> f3a67b5c50398de2a7f5a10d44f28d931d8942c8
          Scan / Upload Struk
        </button>
      </div>

      {!buys.length && (
        <div className="empty">
          <p className="font-medium text-slate-700">Belum ada pembelian</p>
          <p className="text-xs">Scan atau upload struk untuk catat otomatis.</p>
        </div>
      )}

      {/* Mobile: kartu */}
      {buys.length > 0 && (
        <div className="space-y-3 md:hidden">
          {buys.map((b) => (
<<<<<<< HEAD
            <div
              key={b.id}
              role="button" tabIndex={0}
              onClick={() => setModal({ purchase: b })}
              onKeyDown={openKey(b)}
              className="card cursor-pointer transition active:scale-[0.99] active:bg-slate-50"
            >
=======
            <div key={b.id} className="card">
>>>>>>> f3a67b5c50398de2a7f5a10d44f28d931d8942c8
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{b.store_name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{b.purchase_date} · {b.purchase_items.length} item</div>
                </div>
                <div className="whitespace-nowrap font-bold tabular-nums">{rp(b.total_amount)}</div>
              </div>
              <div className="mt-2 line-clamp-2 text-xs text-slate-500">{b.purchase_items.map((i: any) => i.item_name).join(", ")}</div>
              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                {b.receipt_image_url && (
<<<<<<< HEAD
                  <button className="btn flex-1 !px-3" onClick={stop(() => view(b.receipt_image_url))}>Struk</button>
                )}
                <button className="btn flex-1 !px-3" onClick={stop(() => setModal({ purchase: b }))}>Ubah</button>
                <button className="btn-danger !px-3" onClick={stop(() => del(b))} aria-label="Hapus">Hapus</button>
=======
                  <button className="btn flex-1" onClick={() => view(b.receipt_image_url)}>
                    Lihat struk
                  </button>
                )}
                <button className="btn-danger" onClick={() => del(b)} aria-label="Hapus">
                  Hapus
                </button>
>>>>>>> f3a67b5c50398de2a7f5a10d44f28d931d8942c8
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop: tabel */}
      {buys.length > 0 && (
        <div className="table-wrap hidden md:block">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr><th>Tanggal</th><th>Toko</th><th>Rincian</th><th className="text-right">Total</th><th>Struk</th><th /></tr>
            </thead>
            <tbody>
              {buys.map((b) => (
<<<<<<< HEAD
                <tr
                  key={b.id}
                  tabIndex={0}
                  onClick={() => setModal({ purchase: b })}
                  onKeyDown={openKey(b)}
                  className="cursor-pointer focus:bg-amber-50/60 focus:outline-none"
                  title="Klik untuk mengubah"
                >
=======
                <tr key={b.id}>
>>>>>>> f3a67b5c50398de2a7f5a10d44f28d931d8942c8
                  <td className="whitespace-nowrap">{b.purchase_date}</td>
                  <td className="font-medium">{b.store_name}</td>
                  <td className="max-w-xs truncate text-slate-500">
                    {b.purchase_items.map((i: any) => `${i.item_name} (${i.quantity} ${i.unit})`).join(", ").slice(0, 70)}
                  </td>
                  <td className="text-right font-semibold">{rp(b.total_amount)}</td>
                  <td>
                    {b.receipt_image_url ? (
<<<<<<< HEAD
                      <button className="btn-ghost !min-h-0 !px-2 !py-1 text-amber-700" onClick={stop(() => view(b.receipt_image_url))}>
=======
                      <button className="btn-ghost !min-h-0 !px-2 !py-1 text-amber-700" onClick={() => view(b.receipt_image_url)}>
>>>>>>> f3a67b5c50398de2a7f5a10d44f28d931d8942c8
                        Buka
                      </button>
                    ) : <span className="text-slate-300">–</span>}
                  </td>
                  <td className="w-12">
<<<<<<< HEAD
                    <button className="btn-ghost !min-h-0 !px-3 !py-1.5 text-rose-500 hover:!bg-rose-50" onClick={stop(() => del(b))} aria-label="Hapus">
=======
                    <button className="btn-ghost !min-h-0 !px-3 !py-1.5 text-rose-500 hover:!bg-rose-50" onClick={() => del(b)} aria-label="Hapus">
>>>>>>> f3a67b5c50398de2a7f5a10d44f28d931d8942c8
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tombol melayang (mobile), di atas bottom nav */}
      <button
        className="btn-p fixed right-4 z-40 !h-14 !rounded-full !px-5 shadow-xl shadow-amber-500/30 md:hidden"
        style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom))" }}
<<<<<<< HEAD
        onClick={() => setModal({})}
=======
        onClick={() => setOpen(true)}
>>>>>>> f3a67b5c50398de2a7f5a10d44f28d931d8942c8
      >
        Scan Struk
      </button>

<<<<<<< HEAD
      {modal && (
        <ScanModal
          key={modal.purchase?.id ?? "new"}
          projectId={project.id}
          purchase={modal.purchase}
          onClose={() => setModal(null)}
          onSaved={reload}
        />
      )}
=======
      {open && <ScanModal projectId={project.id} onClose={() => setOpen(false)} onSaved={reload} />}
>>>>>>> f3a67b5c50398de2a7f5a10d44f28d931d8942c8
    </div>
  );
}
