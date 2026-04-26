import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Finance Signal Studio",
  applicationName: "Finance Signal Studio",
  description: "AI-powered financial intelligence and stock prediction platform using Google Gemini, multi-source news ingestion, sentiment scoring, and workflow visualization.",
  icons: {
    icon: "/icon.jpg",
    shortcut: "/icon.jpg",
    apple: "/icon.jpg",
  },
  openGraph: {
    title: "Finance Signal Studio",
    description: "AI-powered financial intelligence and stock prediction platform for Indian markets.",
    images: ["/opengraph-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Finance Signal Studio",
    description: "AI-powered financial intelligence and stock prediction platform for Indian markets.",
    images: ["/twitter-image.jpg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${monoFont.variable} antialiased`}>{children}</body>
    </html>
  );
}
