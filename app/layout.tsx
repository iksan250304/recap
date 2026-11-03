import "./globals.css";
import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "BuildNote", template: "%s · BuildNote" },
  description: "Rekap & rencana pembelian bahan bangunan",
  appleWebApp: { capable: true, title: "BuildNote", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f59e0b",
};

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
