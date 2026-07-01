import { RespondToAuthChallengeCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognito, COGNITO_CLIENT_ID, secretHash } from "@/lib/auth/cognito";
import { handleAuthResult } from "@/lib/auth/flow";
import { authErrorResponse } from "@/lib/auth/error";

export const runtime = "nodejs";

/** Second factor: verify the TOTP code (SOFTWARE_TOKEN_MFA challenge). */
export async function POST(request: Request) {
  let body: { email?: string; session?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const { email, session, code } = body;
  if (!email || !session || !code) {
    return Response.json({ error: "Missing fields." }, { status: 400 });
  }

  try {
    const res = await cognito.send(
      new RespondToAuthChallengeCommand({
        ChallengeName: "SOFTWARE_TOKEN_MFA",
        ClientId: COGNITO_CLIENT_ID,
        Session: session,
        ChallengeResponses: { USERNAME: email, SOFTWARE_TOKEN_MFA_CODE: code, SECRET_HASH: secretHash(email) },
      }),
    );
    return Response.json(await handleAuthResult(res, email));
  } catch (err) {
    return authErrorResponse(err);
  }
}
