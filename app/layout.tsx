import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agron — Chart Analysis",
  description: "AI-powered trading memory. Upload a chart and review its structured analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
