import {
  VerifySoftwareTokenCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { cognito, COGNITO_CLIENT_ID, secretHash } from "@/lib/auth/cognito";
import { handleAuthResult } from "@/lib/auth/flow";
import { authErrorResponse } from "@/lib/auth/error";

export const runtime = "nodejs";

/**
 * First-time TOTP registration: verify the code against the freshly associated
 * software token, then complete the MFA_SETUP challenge to get a session.
 */
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
    const verified = await cognito.send(
      new VerifySoftwareTokenCommand({ Session: session, UserCode: code }),
    );
    if (verified.Status !== "SUCCESS" || !verified.Session) {
      return Response.json({ error: "Could not verify that code." }, { status: 401 });
    }
    const res = await cognito.send(
      new RespondToAuthChallengeCommand({
        ChallengeName: "MFA_SETUP",
        ClientId: COGNITO_CLIENT_ID,
        Session: verified.Session,
        ChallengeResponses: { USERNAME: email, SECRET_HASH: secretHash(email) },
      }),
    );
    return Response.json(await handleAuthResult(res, email));
  } catch (err) {
    return authErrorResponse(err);
  }
}
