export const CATS = ["Sipil", "Kelistrikan", "Plumbing", "Finishing", "Atap", "Lainnya"];
export const STATUS: Record<string, string> = { Planned: "Direncanakan", Processing: "Diproses", Purchased: "Lunas", Cancelled: "Batal" };
export const rp = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(+n || 0));
export const today = () => new Date().toISOString().slice(0, 10);
export const sum = (a: any[], f: (x: any) => number) => a.reduce((t, x) => t + f(x), 0);
export function download(buf: BlobPart, name: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([buf], { type }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
export async function compress(file: File, max = 2000, q = 0.82): Promise<Blob> {
  const bm = await createImageBitmap(file, { imageOrientation: "from-image" }), k = Math.min(1, max / Math.max(bm.width, bm.height));
  const c = document.createElement("canvas"); c.width = Math.round(bm.width * k); c.height = Math.round(bm.height * k);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bm, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", q));
}
export const toB64 = (b: Blob) => new Promise<string>((r) => { const f = new FileReader(); f.onload = () => r((f.result as string).split(",")[1]); f.readAsDataURL(b); });
