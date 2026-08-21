import type { Metadata } from "next";
import { Outfit, Prompt } from "next/font/google";
import { StoreShell } from "@/components/StoreShell";
import "./globals.css";

/** English wordmark — CI: Outfit */
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "900"],
  display: "swap",
});

/** Thai loopless (ไม่มีหัว) — Prompt, Cadson Demak, OFL. Usable as a webfont. */
const prompt = Prompt({
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "BlackSmith Tools | Tools Designed for Simpler Work",
    template: "%s | BlackSmith Tools",
  },
  description:
    "แบรนด์คนไทย — อุปกรณ์เสริมเครื่องมือช่างสำหรับ Milwaukee, Dewalt, Makita, Bosch และอื่น ๆ พร้อมเจลล้างมือ GoopOrange",
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "BlackSmith Tools",
    images: [{ url: "/brand/logo.png", width: 800, height: 800, alt: "BlackSmith" }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${prompt.variable} ${outfit.variable} ${prompt.className}`}>
      <body className="antialiased">
        <StoreShell>{children}</StoreShell>
      </body>
    </html>
  );
}