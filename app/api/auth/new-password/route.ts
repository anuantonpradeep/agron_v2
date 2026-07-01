import { RespondToAuthChallengeCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognito, COGNITO_CLIENT_ID, secretHash } from "@/lib/auth/cognito";
import { handleAuthResult } from "@/lib/auth/flow";
import { authErrorResponse } from "@/lib/auth/error";

export const runtime = "nodejs";

/** First-login step: set a permanent password (NEW_PASSWORD_REQUIRED challenge). */
export async function POST(request: Request) {
  let body: { email?: string; session?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const { email, session, newPassword } = body;
  if (!email || !session || !newPassword) {
    return Response.json({ error: "Missing fields." }, { status: 400 });
  }

  try {
    const res = await cognito.send(
      new RespondToAuthChallengeCommand({
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ClientId: COGNITO_CLIENT_ID,
        Session: session,
        ChallengeResponses: { USERNAME: email, NEW_PASSWORD: newPassword, SECRET_HASH: secretHash(email) },
      }),
    );
    return Response.json(await handleAuthResult(res, email));
  } catch (err) {
    return authErrorResponse(err);
  }
}
