import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://studiodesk.riava.cl";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "StudioDesk — Reproducción multipista profesional en vivo",
    template: "%s | StudioDesk",
  },
  description:
    "StudioDesk es la plataforma profesional para reproducir y controlar pistas multipista en vivo: mezcla en tiempo real, control independiente por instrumento y repertorios listos para el escenario.",
  keywords: [
    "multitrack playback",
    "reproducción multipista",
    "pistas para iglesia",
    "mixer en vivo",
    "backing tracks",
    "click track",
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "StudioDesk",
    title: "StudioDesk — Reproducción multipista profesional en vivo",
    description:
      "Controla cada instrumento de tu canción en tiempo real. La plataforma multipista para músicos, bandas e iglesias.",
    locale: "es_CL",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudioDesk — Reproducción multipista profesional en vivo",
    description:
      "Controla cada instrumento de tu canción en tiempo real. La plataforma multipista para músicos, bandas e iglesias.",
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
