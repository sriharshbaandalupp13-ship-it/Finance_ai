import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Signal Studio",
  description: "AI-powered financial intelligence and stock prediction platform using Google Gemini, multi-source news ingestion, sentiment scoring, and workflow visualization.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
