import { EncryptJWT, jwtDecrypt } from "jose";

/**
 * App session: a small encrypted (JWE) cookie minted after Cognito verifies
 * password + TOTP. Edge-safe — depends only on `jose` and Web Crypto, so it can
 * be used from middleware. No AWS SDK imports here.
 */

export const SESSION_COOKIE = "agron_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionData {
  sub: string;
  email: string;
}

async function sessionKey(): Promise<Uint8Array> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET");
  // Derive a stable 32-byte key regardless of the secret's length/format.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return new Uint8Array(digest);
}

export async function encodeSession(data: SessionData): Promise<string> {
  return new EncryptJWT({ email: data.email })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setSubject(data.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .encrypt(await sessionKey());
}

export async function decodeSession(token: string | undefined | null): Promise<SessionData | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, await sessionKey());
    if (typeof payload.sub === "string" && typeof payload.email === "string") {
      return { sub: payload.sub, email: payload.email };
    }
    return null;
  } catch {
    return null;
  }
}
