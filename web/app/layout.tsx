import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StatusRail } from "@/components/StatusRail";
import { SITE } from "@/lib/nav";
import "./globals.css";

const display = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--f-display", display: "swap" });
const ui = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-ui", display: "swap" });
const data = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-data", display: "swap" });

const production = process.env.VERCEL_ENV === "production";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: fight weekends, verified records, titles`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  robots: production ? undefined : { index: false, follow: false },
  openGraph: { type: "website", siteName: SITE.name, title: SITE.name, description: SITE.description },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description },
};

export const viewport: Viewport = { themeColor: "#07090c", colorScheme: "dark", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${data.variable}`}>
      <body>
        <a href="#main" className="skip">Skip to content</a>
        <Header />
        <Suspense fallback={<div className="rail rail--placeholder" aria-hidden="true" />}>
          <StatusRail />
        </Suspense>
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
