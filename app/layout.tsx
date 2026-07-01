import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app/app-shell";

export const metadata: Metadata = {
  title: "Agron — Chart Analysis",
  description: "AI-powered trading memory. Upload a chart and review its structured analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
