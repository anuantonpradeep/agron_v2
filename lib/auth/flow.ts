import { AssociateSoftwareTokenCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cookies } from "next/headers";
import { cognito, claimsFromIdToken } from "./cognito";
import { encodeSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from "./session";

/**
 * Shared handling of a Cognito auth/challenge result. Turns it into a small
 * JSON step for the client, and sets the session cookie when authentication
 * fully completes. Node runtime only (uses next/headers + AWS SDK).
 */

export type FlowResult =
  | { step: "DONE" }
  | { step: "NEW_PASSWORD"; session: string; email: string }
  | { step: "SETUP_MFA"; session: string; email: string; secret: string; otpauthUri: string }
  | { step: "MFA"; session: string; email: string };

/** Cognito auth/challenge response shape we care about. */
interface AuthResult {
  AuthenticationResult?: { IdToken?: string };
  ChallengeName?: string;
  Session?: string;
}

async function finalize(idToken: string, email: string): Promise<FlowResult> {
  const claims = claimsFromIdToken(idToken);
  const token = await encodeSession({ sub: claims.sub, email: claims.email || email });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return { step: "DONE" };
}

export async function handleAuthResult(res: AuthResult, email: string): Promise<FlowResult> {
  if (res.AuthenticationResult?.IdToken) {
    return finalize(res.AuthenticationResult.IdToken, email);
  }
  if (res.ChallengeName === "NEW_PASSWORD_REQUIRED") {
    return { step: "NEW_PASSWORD", session: res.Session!, email };
  }
  if (res.ChallengeName === "SOFTWARE_TOKEN_MFA") {
    return { step: "MFA", session: res.Session!, email };
  }
  if (res.ChallengeName === "MFA_SETUP") {
    const assoc = await cognito.send(new AssociateSoftwareTokenCommand({ Session: res.Session }));
    const secret = assoc.SecretCode ?? "";
    const otpauthUri = `otpauth://totp/Agron:${encodeURIComponent(email)}?secret=${secret}&issuer=Agron`;
    return { step: "SETUP_MFA", session: assoc.Session!, email, secret, otpauthUri };
  }
  throw new Error(`Unsupported challenge: ${res.ChallengeName ?? "unknown"}`);
}
