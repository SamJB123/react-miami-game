import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AssetsProvider, type Assets } from "./components/assets";
import { cn } from "@/lib/utils";
import { OverscrollPrevent } from "./components/utils/overscroll-prevent";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Basement - React miami",
  description: "Partykit + peerjs demo",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const assetsResult: Assets = {
    models: {
      track: { url: "/game-track.glb" },
      vehicle: { url: "/auto1.glb" },
      logo: { url: "/react-miami-logo.png" },
      heroBackground: { url: "/awesome-background.webp" },
      bodyMobile: { url: "/txmobil.jpg" },
    },
  };

  return (
    <html lang="en">
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "antialiased overscroll-none select-none"
        )}
        suppressHydrationWarning
      >
        <OverscrollPrevent />
        <AssetsProvider assets={assetsResult}>{children}</AssetsProvider>
        <Analytics />
      </body>
    </html>
  );
}
