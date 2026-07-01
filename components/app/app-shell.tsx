"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartQueueProvider } from "@/components/providers/chart-queue-provider";

/**
 * App chrome: shared chart-queue provider + a slim top nav to switch between
 * the Analyze and Ask views.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <ChartQueueProvider>
      <nav
        className="sticky top-0 z-20 flex h-12 items-center gap-1 border-b px-6"
        style={{ background: "var(--background)", borderColor: "var(--panel-border)" }}
      >
        <span className="mr-4 text-[14px] font-semibold text-[var(--foreground)]">Agron</span>
        <NavLink href="/" active={pathname === "/"}>
          Analyze
        </NavLink>
        <NavLink href="/chat" active={pathname === "/chat"}>
          Ask
        </NavLink>
      </nav>
      {children}
    </ChartQueueProvider>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors"
      style={
        active
          ? { color: "var(--violet)", background: "var(--violet-bg)" }
          : { color: "var(--muted)" }
      }
    >
      {children}
    </Link>
  );
}
