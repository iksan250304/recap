"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "./supabase";

type Ctx = { projects: any[]; project: any; setProjectId: (id: string) => void; reload: () => Promise<void>; plans: any[]; buys: any[]; loading: boolean };
const C = createContext<Ctx>(null as any);
export const useApp = () => useContext(C);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]), [pid, setPid] = useState<string>("");
  const [plans, setPlans] = useState<any[]>([]), [buys, setBuys] = useState<any[]>([]), [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    const { data: s } = await sb.auth.getSession();
    if (!s.session) return router.replace("/login");
    let { data } = await sb.from("projects").select("*").order("created_at");
    if (!data?.length) { await sb.from("projects").insert({ name: "Proyek Pertama", budget: 0 }); ({ data } = await sb.from("projects").select("*").order("created_at")); }
    setProjects(data!);
    setPid((p) => p || localStorage.getItem("pid") || data![0].id);
  }, [router]);

  const loadData = useCallback(async () => {
    if (!pid) return;
    const [a, b] = await Promise.all([
      sb.from("purchase_planning").select("*").eq("project_id", pid).order("item_name"),
      sb.from("actual_purchases").select("*, purchase_items(*)").eq("project_id", pid).order("purchase_date", { ascending: false }),
    ]);
    setPlans(a.data || []); setBuys(b.data || []); setLoading(false);
  }, [pid]);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadData(); }, [loadData]);

  const project = projects.find((p) => p.id === pid) || projects[0];
  const reload = async () => { await loadProjects(); await loadData(); };
  const setProjectId = (id: string) => { localStorage.setItem("pid", id); setPid(id); };
  if (!project) return <div className="p-6 text-slate-500">Memuat…</div>;
  return <C.Provider value={{ projects, project, setProjectId, reload, plans, buys, loading }}>{children}</C.Provider>;
}
