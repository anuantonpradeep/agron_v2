import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognito, COGNITO_CLIENT_ID, secretHash } from "@/lib/auth/cognito";
import { handleAuthResult } from "@/lib/auth/flow";
import { authErrorResponse } from "@/lib/auth/error";

export const runtime = "nodejs";

/** Step 1: email + password → Cognito challenge (or session on success). */
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const res = await cognito.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: { USERNAME: email, PASSWORD: password, SECRET_HASH: secretHash(email) },
      }),
    );
    return Response.json(await handleAuthResult(res, email));
  } catch (err) {
    return authErrorResponse(err);
  }
}
