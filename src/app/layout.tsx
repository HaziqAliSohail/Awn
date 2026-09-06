import type { Metadata, Viewport } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Awn (عَوْن) · Serve. Seek. Connect.",
    template: "%s · Awn",
  },
  description:
    "Awn is a Muslim community platform for mutual aid (khidmah). Ask for help or offer your skills, matched by AI, connected in trust, purely for the sake of Allah.",
  applicationName: "Awn",
  openGraph: {
    title: "Awn (عَوْن) · Muslim Community Mutual Aid",
    description:
      "Ask for help or offer your skills to the ummah. AI-matched, trust-first, $0. Sadaqah Jāriyah.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d5c46",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${mono.variable}`}>
      <body className="font-sans min-h-screen bg-surface-50 antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:rounded-lg focus:shadow-lg focus:text-surface-900"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
