"use client";

import { SectionHeading } from "@/components/ui/primitives";
import { useDictation } from "./use-dictation";
import { cn } from "@/lib/cn";

/**
 * [9] Your Notes — free-text space for the user's own interpretation, ideas,
 * and sentiment about the selected chart.
 *
 * Prop-driven and controlled by the parent. Held in memory only for now (no
 * persistence) — it will become part of the stored Memory in a later milestone.
 *
 * Speech-to-text is offered as progressive enhancement via the browser-native
 * Web Speech API: the mic button appears only where the API is supported, and
 * dictated text is appended to the notes.
 */
export function NotesPanel({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { supported, listening, start, stop } = useDictation((chunk) => {
    onChange(value.trim() ? `${value.trim()} ${chunk}` : chunk);
  });
  const showMic = supported && !disabled;

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        index={9}
        title="Your Notes"
        subtitle="Your ideas, opinions, and sentiment on this chart."
      />

      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={5}
          placeholder={
            disabled
              ? "Upload a chart to add your notes."
              : "Write your interpretation, ideas, or sentiment about this chart…"
          }
          className={cn(
            "w-full resize-y rounded-xl border p-4 text-[13.5px] leading-relaxed text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-light)] focus:border-[var(--violet-border)] disabled:opacity-50",
            showMic && "pr-14",
          )}
          style={{ background: "var(--panel)", borderColor: "var(--panel-border)" }}
        />

        {showMic ? (
          <button
            type="button"
            onClick={listening ? stop : start}
            aria-pressed={listening}
            aria-label={listening ? "Stop dictation" : "Dictate with microphone"}
            title={listening ? "Stop dictation" : "Dictate with microphone"}
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
            style={
              listening
                ? { color: "var(--danger)", background: "var(--danger-bg)", borderColor: "var(--danger-border)" }
                : { color: "var(--violet)", background: "var(--violet-bg)", borderColor: "var(--violet-border)" }
            }
          >
            <MicIcon />
          </button>
        ) : null}
      </div>

      {listening ? (
        <p className="flex items-center gap-2 text-[12px] text-[var(--danger)]">
          <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--danger)" }} />
          Listening… speak your notes.
        </p>
      ) : null}
    </section>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
