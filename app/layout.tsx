import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Signal Studio",
  description:
    "Interactive company intelligence dashboard with market signals, connected stocks, and multi-source news.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
