import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import { Suspense } from "react";
import { Arena, Footer, Header, Wire } from "@/components/Shell";
import { NetworkAnalytics } from "@/components/NetworkAnalytics";
import { SITE } from "@/lib/nav";
import { INDEXABLE } from "@/lib/posture";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["700", "800", "900"], style: ["normal", "italic"], variable: "--font-playfair", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: fight intelligence`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  robots: INDEXABLE ? undefined : { index: false, follow: false },
  icons: { icon: SITE.mark },
  openGraph: { type: "website", siteName: SITE.name, title: SITE.name, description: SITE.description },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description },
};

export const viewport: Viewport = { themeColor: "#110e0b", colorScheme: "dark", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} ${mono.variable}`}>
      <body>
        <NetworkAnalytics surface="boxing" />
        <a href="#main" className="skip">Skip to content</a>
        <Arena />
        <Header />
        <Suspense fallback={null}><Wire /></Suspense>
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
