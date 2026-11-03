import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const CATS = ["Sipil", "Kelistrikan", "Plumbing", "Finishing", "Atap", "Lainnya"];
const fail = (error: string, status: number) => { console.error("[OCR]", status, error); return NextResponse.json({ error }, { status }); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RETRYABLE = [429, 500, 503, 504];

/** Angka format Indonesia ("1.250.000", "1.250,50", "Rp 15.000") -> number */
function num(v: any): number {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v !== "string") return 0;
  let s = v.replace(/[^\d.,-]/g, "");
  if (!s) return 0;
  if (s.includes(",") && s.includes(".")) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    const p = s.split(",");
    s = p.length === 2 && p[1].length !== 3 ? p[0] + "." + p[1] : s.replace(/,/g, "");
  } else if (s.includes(".")) {
    const p = s.split(".");
    if (p.length > 2 || p[p.length - 1].length === 3) s = s.replace(/\./g, "");
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function extractJson(text: string) {
  const t = text.replace(/```json|```/g, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("tidak ada JSON");
  return JSON.parse(t.slice(a, b + 1));
}

function normalize(raw: any) {
  const items = (Array.isArray(raw?.items) ? raw.items : [])
    .map((i: any) => {
      const qty = num(i.qty) || 1;
      let unit_price = num(i.unit_price);
      const line = num(i.line_total);
      if (!unit_price && line) unit_price = Math.round((line / qty) * 100) / 100;
      return {
        name: String(i.name ?? "").trim(),
        qty,
        unit: String(i.unit ?? "").trim() || "pcs",
        unit_price,
        category: CATS.includes(i.category) ? i.category : "Lainnya",
      };
    })
    .filter((i: any) => i.name);
  const date = typeof raw?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : "";
  return { store: String(raw?.store ?? "").trim(), date, items, total: num(raw?.total) };
}

const PROMPT = `Kamu OCR struk/nota/invoice/faktur toko bangunan Indonesia. Struk bisa thermal pudar, miring, terlipat, atau tulisan tangan.
Balas HANYA JSON valid, tanpa teks lain:
{"store":string,"date":"YYYY-MM-DD" atau "","items":[{"name":string,"qty":number,"unit":string,"unit_price":number,"line_total":number,"category":"${CATS.join("|")}"}],"total":number}

Aturan:
- Satu objek per barang. Abaikan baris diskon, PPN, ongkir, subtotal, total, tunai, kembalian.
- Semua angka berupa number rupiah tanpa pemisah ribuan (contoh 1.250.000 -> 1250000).
- unit_price = harga satuan. line_total = jumlah harga baris itu (qty x harga). Isi keduanya bila ada di struk.
- name tulis apa adanya dari struk, rapikan huruf kapital berlebihan.
- unit contoh: pcs, sak, m, kg, btg, lbr, dus, roll. Jika tidak ada isi "pcs".
- Tanggal dd/mm/yy atau dd-mm-yyyy harus diubah ke YYYY-MM-DD. Tahun 2 digit = 20xx.
- Kategori: semen/pasir/batu/besi/bata/kayu/paku -> Sipil; kabel/saklar/stopkontak/lampu/MCB -> Kelistrikan; pipa/kran/closet/fitting/lem pvc -> Plumbing; cat/keramik/plafon/dempul/granit -> Finishing; genteng/baja ringan/seng/talang -> Atap; lainnya -> Lainnya.
- Jika ada lebih dari satu struk di foto, baca HANYA satu struk yang paling jelas dan paling lengkap.
- Tulisan tangan: baca sebaik mungkin, angka ribuan biasanya ditulis dengan titik (54.000).
- Jika teks tidak terbaca, isi string kosong atau 0. Jangan mengarang barang.`;

type Out = ReturnType<typeof normalize>;

async function runModel(
  model: string, key: string, makeBody: (enhanced: boolean) => string,
  signal: AbortSignal, deadline: number, perTry: number,
): Promise<Out> {
  let enhanced = true;
  let last = `${model}: tidak ada respons`;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (signal.aborted) throw new Error("dibatalkan");
    if (Date.now() > deadline) throw new Error(`${model}: waktu habis`);
    if (attempt) await sleep(800 * attempt);

    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    signal.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => ctrl.abort(), Math.max(1000, Math.min(perTry, deadline - Date.now())));
    const t = Date.now();
    let status = 0, raw = "";
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: makeBody(enhanced),
        signal: ctrl.signal,
      });
      status = r.status;
      raw = await r.text();
    } catch (e: any) {
      if (signal.aborted) throw new Error("dibatalkan");
      last = `${model}: timeout ${Math.round((Date.now() - t) / 1000)} dtk`;
      console.warn("[OCR]", last);
      continue;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    }

    console.log(`[OCR] ${model} status=${status} ${Date.now() - t}ms`);
    if (status >= 200 && status < 300) {
      try {
        const j = JSON.parse(raw);
        const text = (j.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
        if (!text.trim()) { last = `${model}: respons kosong ` + JSON.stringify(j.promptFeedback || j.candidates?.[0]?.finishReason || ""); continue; }
        return normalize(extractJson(text));
      } catch { last = `${model}: format JSON tidak valid`; continue; }
    }

    let msg = raw;
    try { msg = JSON.parse(raw).error?.message || raw; } catch {}
    last = `${model} ${status}: ${msg}`;
    if (status === 400 && enhanced) { enhanced = false; attempt--; continue; } // parameter ditolak -> ulang polos
    if (!RETRYABLE.includes(status)) throw new Error(last);
  }
  throw new Error(last);
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await sb.auth.getUser(token);
  if (!data.user) return fail("Sesi login tidak valid, coba login ulang", 401);
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return fail("GEMINI_API_KEY kosong di .env.local (restart server?)", 500);

  const { image, mediaType = "image/jpeg" } = await req.json();
  if (!image) return fail("Gambar kosong", 400);

  const models = Array.from(new Set(
    [process.env.GEMINI_MODEL || "gemini-3.8-flash", ...(process.env.GEMINI_FALLBACK || "gemini-flash-latest,gemini-3.1-flash-lite").split(",")]
      .map((m) => m.trim()).filter(Boolean),
  )).slice(0, 3);

  const makeBody = (enhanced: boolean) => JSON.stringify({
    contents: [{ parts: [{ inline_data: { mime_type: mediaType, data: image } }, { text: PROMPT }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0,
      maxOutputTokens: 4096,
      ...(enhanced ? { thinkingConfig: { thinkingLevel: process.env.GEMINI_THINKING || "low" } } : {}),
    },
  });

  const perTry = +(process.env.GEMINI_TIMEOUT_MS || 40_000);
  const deadline = t0 + 55_000;
  const shared = new AbortController();
  const errors: string[] = [];
  let winner: Out | null = null, empty: Out | null = null;

  // Semua model jalan PARALEL. Hasil pertama yang berisi barang menang, sisanya dibatalkan.
  await new Promise<void>((resolve) => {
    let pending = models.length;
    models.forEach((m) =>
      runModel(m, key, makeBody, shared.signal, deadline, perTry)
        .then((o) => {
          if (winner) return;
          if (o.items.length) { winner = o; console.log(`[OCR] menang ${m} total=${Date.now() - t0}ms items=${o.items.length}`); shared.abort(); resolve(); }
          else empty = o;
        })
        .catch((e) => { if (e.message !== "dibatalkan") errors.push(e.message); })
        .finally(() => { if (--pending === 0) resolve(); }),
    );
  });

  if (winner) return NextResponse.json(winner);
  if (empty) return fail("Teks struk tidak terbaca. Foto ulang lebih terang dan tegak, satu struk saja.", 422);
  return fail("Gemini gagal. " + errors.join(" | "), 502);
}
