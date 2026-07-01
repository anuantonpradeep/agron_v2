import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "crypto";
import { decodeJwt } from "jose";

/** Server-side Cognito primitives (Node runtime only). */

export const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET ?? "";

export const cognito = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION || process.env.AWS_REGION,
});

/** Cognito requires SECRET_HASH on confidential (with-secret) app clients. */
export function secretHash(username: string): string {
  return createHmac("sha256", CLIENT_SECRET).update(username + COGNITO_CLIENT_ID).digest("base64");
}

/** Read sub/email from a Cognito id token (received directly from Cognito). */
export function claimsFromIdToken(idToken: string): { sub: string; email: string } {
  const claims = decodeJwt(idToken);
  return { sub: String(claims.sub ?? ""), email: typeof claims.email === "string" ? claims.email : "" };
}
