import { sb } from "@/lib/supabase";

/* ---------- pencocokan nama barang ---------- */
export const lc = (s: any) => String(s ?? "").trim().toLowerCase();
const norm = (s: any) => lc(s).replace(/(\d)([a-z])/g, "$1 $2").replace(/[^a-z0-9]+/g, " ").trim(); // "5cm" -> "5 cm"
const UNIT_WORDS = new Set([
  "pcs", "pc", "sak", "kg", "gr", "gram", "btg", "batang", "lbr", "lembar", "dus", "roll", "rol",
  "m", "mtr", "meter", "cm", "mm", "ltr", "liter", "buah", "bh", "unit", "set", "pak", "box", "kaleng", "krg", "karung",
]);
const tokens = (s: any) => norm(s).split(" ").filter((t) => t && !UNIT_WORDS.has(t));
const same = (a: string, b: string) =>
  a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));

/** 0..1. 1 = nama sama persis. >= 0.5 dianggap cocok. */
export function matchScore(a: string, b: string): number {
  if (norm(a) && norm(a) === norm(b)) return 1;
  const A = tokens(a), B = tokens(b);
  if (!A.length || !B.length) return 0;
  const used = new Set<number>();
  let inter = 0;
  for (const x of A) {
    const j = B.findIndex((y, idx) => !used.has(idx) && same(x, y));
    if (j >= 0) { used.add(j); inter++; }
  }
  if (!inter) return 0;
  const jac = inter / (A.length + B.length - inter);
  const cont = inter / Math.min(A.length, B.length);
  return cont === 1 ? 0.7 + 0.3 * jac : jac;
}
export const MATCH_MIN = 0.5;

/** id rencana yang paling cocok dengan nama barang, atau "" */
export function suggestPlan(name: string, plans: any[], used: Set<string>): string {
  let best = "", bs = 0;
  for (const p of plans) {
    if (p.status === "Cancelled" || used.has(p.id)) continue;
    const s = matchScore(name, p.item_name);
    if (s > bs) { bs = s; best = p.id; }
  }
  return bs >= MATCH_MIN ? best : "";
}

/* ---------- status otomatis ---------- */
const RANK: Record<string, number> = { Planned: 0, Processing: 1, Purchased: 2 };

export function computeStatus(plan: any, items: any[]): "Planned" | "Processing" | "Purchased" {
  const key = lc(plan.item_name);
  const m = items.filter((i) => lc(i.item_name) === key);
  if (!m.length) return "Planned";
  if (m.some((i) => lc(i.unit) !== lc(plan.unit))) return "Purchased"; // satuan beda, tidak bisa dibandingkan
  const qty = m.reduce((t, i) => t + (+i.quantity || 0), 0);
  const need = +plan.estimated_quantity || 0;
  return need <= 0 || qty >= need ? "Purchased" : "Processing";
}

/**
 * Hitung ulang status rencana yang namanya ada di `names`.
 * allowRevert=true  : boleh turun (mis. nota dihapus -> Direncanakan)
 * allowRevert=false : hanya naik (dipakai saat edit di halaman Rencana)
 * Rencana berstatus Batal tidak pernah disentuh. Gagal diam-diam supaya alur utama tidak rusak.
 */
export async function syncPlanStatuses(projectId: string, names: string[], allowRevert: boolean) {
  try {
    const keys = new Set(names.map(lc).filter(Boolean));
    if (!keys.size) return;
    const { data: plans } = await sb
      .from("purchase_planning")
      .select("id,item_name,unit,estimated_quantity,status")
      .eq("project_id", projectId);
    if (!plans?.length) return;
    const { data: purs } = await sb.from("actual_purchases").select("id").eq("project_id", projectId);
    const ids = (purs || []).map((p: any) => p.id);
    const items = ids.length
      ? ((await sb.from("purchase_items").select("item_name,quantity,unit").in("purchase_id", ids)).data || [])
      : [];
    for (const p of plans as any[]) {
      if (!keys.has(lc(p.item_name)) || p.status === "Cancelled") continue;
      const next = computeStatus(p, items);
      if (next === p.status) continue;
      if (!allowRevert && (RANK[next] ?? 0) < (RANK[p.status] ?? 0)) continue;
      await sb.from("purchase_planning").update({ status: next }).eq("id", p.id);
    }
  } catch (e) {
    console.warn("[syncPlanStatuses]", e);
  }
}

/* ---------- hapus pembelian ---------- */
export async function deletePurchase(b: any, projectId: string): Promise<string | null> {
  const names = (b.purchase_items || []).map((i: any) => i.item_name);
  const { error } = await sb.from("actual_purchases").delete().eq("id", b.id);
  if (error) return error.message;
  if (b.receipt_image_url) await sb.storage.from("receipts").remove([b.receipt_image_url]);
  await syncPlanStatuses(projectId, names, true);
  return null;
}
