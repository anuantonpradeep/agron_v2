import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Bias, Tone } from "@/lib/analysis-types";

/* ─── Section heading: violet numbered badge + title + optional subtitle ──── */

export function SectionHeading({
  index,
  title,
  subtitle,
  className,
}: {
  index: number;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-semibold"
        style={{
          background: "var(--violet-bg)",
          color: "var(--violet)",
          border: "1px solid var(--violet-border)",
        }}
      >
        {index}
      </span>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold leading-tight text-[var(--foreground)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-[13px] leading-snug text-[var(--muted)]">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Panel: bordered surface used to group section content ───────────────── */

export function Panel({
  children,
  className,
  tone,
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone | "danger";
}) {
  const toneStyle = panelToneStyle(tone);
  return (
    <div
      className={cn("rounded-xl border p-5", className)}
      style={{
        background: "var(--panel)",
        borderColor: "var(--panel-border)",
        ...toneStyle,
      }}
    >
      {children}
    </div>
  );
}

function panelToneStyle(tone?: Tone | "danger"): React.CSSProperties {
  switch (tone) {
    case "positive":
      return { background: "var(--accent-bg)", borderColor: "var(--accent-border)" };
    case "warning":
      return { background: "var(--warning-bg)", borderColor: "var(--warning-border)" };
    case "info":
      return { background: "var(--info-bg)", borderColor: "var(--info-border)" };
    case "danger":
      return { background: "var(--danger-bg)", borderColor: "var(--danger-border)" };
    default:
      return {};
  }
}

/* ─── Bias badge: BULLISH / BEARISH / NEUTRAL pill ────────────────────────── */

export function BiasBadge({ bias }: { bias: Bias }) {
  const style =
    bias === "BULLISH"
      ? { color: "var(--accent)", background: "var(--accent-bg)", borderColor: "var(--accent-border)" }
      : bias === "BEARISH"
        ? { color: "var(--danger)", background: "var(--danger-bg)", borderColor: "var(--danger-border)" }
        : { color: "var(--muted)", background: "rgba(255,255,255,0.05)", borderColor: "var(--panel-border)" };
  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide"
      style={style}
    >
      {bias}
    </span>
  );
}

/* ─── Tone chip: small labeled chip used for evidence / concepts ──────────── */

export function ToneChip({
  children,
  tone = "neutral",
  variant = "solid",
}: {
  children: ReactNode;
  tone?: Tone | "violet";
  variant?: "solid" | "outline";
}) {
  const style = chipToneStyle(tone, variant);
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-md border px-2.5 py-1 text-[12px] font-medium"
      style={style}
    >
      {children}
    </span>
  );
}

function chipToneStyle(tone: Tone | "violet", variant: "solid" | "outline"): React.CSSProperties {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    positive: { color: "var(--accent)", bg: "var(--accent-bg)", border: "var(--accent-border)" },
    warning: { color: "var(--warning)", bg: "var(--warning-bg)", border: "var(--warning-border)" },
    info: { color: "var(--info)", bg: "var(--info-bg)", border: "var(--info-border)" },
    violet: { color: "var(--violet)", bg: "var(--violet-bg)", border: "var(--violet-border)" },
    neutral: { color: "var(--foreground-secondary)", bg: "rgba(255,255,255,0.05)", border: "var(--panel-border)" },
  };
  const c = map[tone] ?? map.neutral;
  return variant === "outline"
    ? { color: c.color, background: "transparent", borderColor: c.border }
    : { color: c.color, background: c.bg, borderColor: c.border };
}

/* ─── Status dot ──────────────────────────────────────────────────────────── */

export function StatusDot({ tone = "positive" }: { tone?: Tone }) {
  const color =
    tone === "warning"
      ? "var(--warning)"
      : tone === "info"
        ? "var(--info)"
        : tone === "neutral"
          ? "var(--muted)"
          : "var(--accent)";
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />;
}

/* ─── Skeleton + empty helpers for loading / idle states ──────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <span className={cn("agron-skeleton block", className)} />;
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <p className="text-[13px] leading-relaxed text-[var(--muted-light)]">{children}</p>
  );
}

/* ─── Label / value pair used in metadata + context grids ─────────────────── */

export function Field({
  label,
  children,
  loading,
  empty,
}: {
  label: string;
  children?: ReactNode;
  loading?: boolean;
  empty?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(96px,40%)_1fr] items-baseline gap-3 py-2">
      <dt className="text-[13px] text-[var(--muted)]">{label}</dt>
      <dd className="text-[13px] font-medium text-[var(--foreground)]">
        {loading ? (
          <Skeleton className="h-3.5 w-24" />
        ) : empty ? (
          <span className="text-[var(--muted-light)]">—</span>
        ) : (
          children
        )}
      </dd>
    </div>
  );
}
