const P = {
  dash: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  plan: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  buy: "M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6",
  rep: "M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3",
  menu: "M4 6h16M4 12h16M4 18h16",
  x: "M6 6l12 12M18 6L6 18",
  chevron: "M6 9l6 6 6-6",
};

export type IconName = keyof typeof P;

export default function Icon({ n, className = "h-5 w-5" }: { n: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={P[n]} />
    </svg>
  );
}
