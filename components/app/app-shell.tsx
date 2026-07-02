"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartQueueProvider } from "@/components/providers/chart-queue-provider";
import { clearQueue } from "@/lib/upload/queue-storage";
import { clearChat } from "@/lib/chat/chat-storage";

/**
 * App chrome: shared chart-queue provider + a slim top nav to switch between
 * the Analyze and Ask views.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The login page has its own full-screen layout — no app nav.
  if (pathname === "/login") return <>{children}</>;

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
        <SignOut />
      </nav>
      {children}
    </ChartQueueProvider>
  );
}

function SignOut() {
  async function signOut() {
    await clearQueue().catch(() => {});
    clearChat();
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }
  return (
    <button
      type="button"
      onClick={signOut}
      className="ml-auto rounded-md px-3 py-1.5 text-[13px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
    >
      Sign out
    </button>
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
