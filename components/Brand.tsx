export function LogoMark({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="100 15 600 770" fill="currentColor" className={className} aria-hidden>
      <path d="M688.86,774.58H111.14V25.42h409.81l167.91,158.52v590.64ZM508.03,46.56H132.28v709.23h535.45V199.21h-159.7V46.56ZM653.63,178.07l-126.82-117.42v113.9l3.52,3.52h123.29Z" />
      <path d="M575.75,326.4l-1.89,247.46-227.26,108.75-122.35-56.35-.48-129.57,110.09-53.61.77-116.68,120.56-56.56,120.56,56.56ZM540.9,330.75l-85.71-39.08c-24.6,13.56-57.07,23.43-80.35,38.49-2.27,1.47-4.21-.25-3.02,5.22l83.36,37.75c4.39,0,69.86-31.61,78.79-36.42,1.82-.98,8.2-4.28,6.92-5.96ZM444.62,485.72v-92.76l-89.24-43.45v92.76l89.24,43.45ZM555,349.51l-88.1,42.24-1.54,117.07-109.98,53.22v92.76l199.62-93.94v-211.36ZM428.17,499.85l-83.35-39.07-85.72,43.7,85.71,37.74c24.86-11.89,57.55-22.4,80.35-37.15,2.27-1.47,4.21.25,3.02-5.22ZM334.24,654.81v-92.76l-89.24-41.1v93.94l89.24,39.92Z" />
    </svg>
  );
}

export default function Brand({ dark = false, size = "md" }: { dark?: boolean; size?: "md" | "lg" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-bold tracking-tight ${size === "lg" ? "text-xl" : "text-base"} ${dark ? "text-white" : "text-slate-900"}`}>
      <LogoMark className={size === "lg" ? "h-10 w-auto" : "h-8 w-auto"} />
      <span>Build<span className="text-amber-500">Note</span></span>
    </span>
  );
}
