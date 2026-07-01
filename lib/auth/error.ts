/** Map Cognito SDK errors to safe HTTP responses, surfacing the real reason. */
export function authErrorResponse(err: unknown): Response {
  const name = (err as { name?: string })?.name ?? "";
  const rawMessage = (err as { message?: string })?.message;

  const statusByName: Record<string, number> = {
    NotAuthorizedException: 401,
    UserNotFoundException: 401,
    CodeMismatchException: 401,
    EnableSoftwareTokenMFAException: 401,
    ExpiredCodeException: 401,
    InvalidPasswordException: 400,
    InvalidParameterException: 400,
    TooManyRequestsException: 429,
    LimitExceededException: 429,
  };

  const status = statusByName[name];
  if (!status) {
    console.error("auth error", err);
    return Response.json({ error: "Authentication failed. Please try again." }, { status: 500 });
  }

  // Cognito's own messages are user-safe and far more useful than a generic
  // string (e.g. distinguishing an expired challenge session from a bad code).
  const message = rawMessage && rawMessage.length <= 200 ? rawMessage : "Authentication failed.";
  return Response.json({ error: message }, { status });
}
