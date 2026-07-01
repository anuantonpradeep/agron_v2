"use client";

import { useState, type FormEvent } from "react";

type Step = "credentials" | "new_password" | "setup_mfa" | "mfa";

interface FlowState {
  step: Step;
  email: string;
  session: string;
  secret?: string;
  otpauthUri?: string;
}

function nextUrl(): string {
  if (typeof window === "undefined") return "/";
  return new URLSearchParams(window.location.search).get("next") || "/";
}

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data;
}

export function LoginFlow() {
  const [flow, setFlow] = useState<FlowState>({ step: "credentials", email: "", session: "" });
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function advance(data: { step: string; session?: string; email?: string; secret?: string; otpauthUri?: string }) {
    if (data.step === "DONE") {
      window.location.href = nextUrl();
      return;
    }
    setCode("");
    setError(null);
    setFlow((prev) => ({
      step: data.step === "NEW_PASSWORD" ? "new_password" : data.step === "SETUP_MFA" ? "setup_mfa" : "mfa",
      email: data.email ?? prev.email,
      session: data.session ?? prev.session,
      secret: data.secret,
      otpauthUri: data.otpauthUri,
    }));
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const onCredentials = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => advance(await post("/api/auth/login", { email: flow.email, password })));
  };
  const onNewPassword = (e: FormEvent) => {
    e.preventDefault();
    void run(async () =>
      advance(await post("/api/auth/new-password", { email: flow.email, session: flow.session, newPassword })),
    );
  };
  const onVerifySetup = (e: FormEvent) => {
    e.preventDefault();
    void run(async () =>
      advance(await post("/api/auth/verify-setup", { email: flow.email, session: flow.session, code })),
    );
  };
  const onVerify = (e: FormEvent) => {
    e.preventDefault();
    void run(async () =>
      advance(await post("/api/auth/verify", { email: flow.email, session: flow.session, code })),
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-6">
      <div
        className="w-full max-w-sm rounded-2xl border p-7"
        style={{ background: "var(--panel)", borderColor: "var(--panel-border)" }}
      >
        <h1 className="text-[18px] font-semibold text-[var(--foreground)]">Agron</h1>
        <p className="mt-1 text-[13px] text-[var(--muted)]">{subtitle(flow.step)}</p>

        {error ? (
          <div
            className="mt-4 rounded-lg border px-3 py-2 text-[12.5px]"
            style={{ background: "var(--danger-bg)", borderColor: "var(--danger-border)", color: "var(--danger)" }}
          >
            {error}
          </div>
        ) : null}

        {flow.step === "credentials" ? (
          <form onSubmit={onCredentials} className="mt-5 flex flex-col gap-3">
            <Field label="Email" type="email" value={flow.email} autoComplete="username"
              onChange={(v) => setFlow((p) => ({ ...p, email: v }))} />
            <Field label="Password" type="password" value={password} autoComplete="current-password"
              onChange={setPassword} />
            <Submit busy={busy} label="Continue" />
          </form>
        ) : null}

        {flow.step === "new_password" ? (
          <form onSubmit={onNewPassword} className="mt-5 flex flex-col gap-3">
            <p className="text-[12.5px] text-[var(--muted)]">Set a new password to finish setting up your account.</p>
            <Field label="New password" type="password" value={newPassword} autoComplete="new-password"
              onChange={setNewPassword} />
            <Submit busy={busy} label="Set password" />
          </form>
        ) : null}

        {flow.step === "setup_mfa" ? (
          <form onSubmit={onVerifySetup} className="mt-5 flex flex-col gap-3">
            <p className="text-[12.5px] leading-relaxed text-[var(--muted)]">
              Add this key to your authenticator app (Google Authenticator, 1Password, Authy…), then enter the
              6-digit code it shows.
            </p>
            <code
              className="select-all break-all rounded-lg border px-3 py-2 text-[12px] text-[var(--foreground)]"
              style={{ background: "var(--surface, rgba(255,255,255,0.03))", borderColor: "var(--panel-border)" }}
            >
              {flow.secret}
            </code>
            <CodeField value={code} onChange={setCode} />
            <Submit busy={busy} label="Verify & continue" />
          </form>
        ) : null}

        {flow.step === "mfa" ? (
          <form onSubmit={onVerify} className="mt-5 flex flex-col gap-3">
            <p className="text-[12.5px] text-[var(--muted)]">Enter the 6-digit code from your authenticator app.</p>
            <CodeField value={code} onChange={setCode} />
            <Submit busy={busy} label="Verify" />
          </form>
        ) : null}
      </div>
    </div>
  );
}

function subtitle(step: Step): string {
  switch (step) {
    case "credentials":
      return "Sign in to continue.";
    case "new_password":
      return "One-time setup.";
    case "setup_mfa":
      return "Set up two-factor authentication.";
    case "mfa":
      return "Two-factor verification.";
  }
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] text-[var(--muted)]">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        required
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border px-3 py-2 text-[13.5px] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--violet-border)]"
        style={{ background: "var(--background)", borderColor: "var(--panel-border)" }}
      />
    </label>
  );
}

function CodeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      value={value}
      required
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      placeholder="123456"
      className="rounded-lg border px-3 py-2 text-center text-[16px] tracking-[0.3em] text-[var(--foreground)] outline-none transition-colors focus:border-[var(--violet-border)]"
      style={{ background: "var(--background)", borderColor: "var(--panel-border)" }}
    />
  );
}

function Submit({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-1 rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50"
      style={{ background: "var(--accent)", color: "var(--accent-foreground, #0a1a12)" }}
    >
      {busy ? "Please wait…" : label}
    </button>
  );
}
