import { cookies } from "next/headers";
import { putObject } from "@/lib/aws/s3";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";
export const maxDuration = 30;

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

/**
 * POST /api/memories  (multipart: "image" File + "memory" JSON string)
 *
 * Persists one Memory to S3, scoped to the authenticated user:
 *   users/{userId}/memories/{id}/original.<ext>   — the uploaded image
 *   users/{userId}/memories/{id}/memory.json      — JSON.stringify(memory)
 *
 * The memory JSON is serialized generically — this route never enumerates the
 * analysis fields, so new analysis sections persist automatically. Notes are
 * already nested inside `memory.analysis` by the client.
 */
export async function POST(request: Request) {
  const store = await cookies();
  const session = await decodeSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.sub;

  let image: File | null = null;
  let memory: Record<string, unknown> | null = null;
  try {
    const form = await request.formData();
    const f = form.get("image");
    if (f instanceof File) image = f;
    const m = form.get("memory");
    if (typeof m === "string") memory = JSON.parse(m);
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  if (!image) return Response.json({ error: "Missing image" }, { status: 400 });
  if (!memory || typeof memory.id !== "string") {
    return Response.json({ error: "Missing or invalid memory" }, { status: 400 });
  }
  const ext = EXT[image.type];
  if (!ext) return Response.json({ error: "Unsupported image type" }, { status: 415 });

  const id = memory.id;
  const prefix = `users/${userId}/memories/${id}`;
  const imageKey = `${prefix}/original.${ext}`;
  const savedAt = new Date().toISOString();

  const doc = {
    ...memory,
    savedAt,
    image: {
      ...(typeof memory.image === "object" && memory.image ? memory.image : {}),
      key: imageKey,
      contentType: image.type,
    },
  };

  try {
    const bytes = new Uint8Array(await image.arrayBuffer());
    await putObject({ key: imageKey, body: bytes, contentType: image.type });
    await putObject({
      key: `${prefix}/memory.json`,
      body: JSON.stringify(doc, null, 2),
      contentType: "application/json",
    });
    return Response.json({ id, savedAt, imageKey });
  } catch (err) {
    console.error("save memory failed", err);
    return Response.json(
      { error: "Save failed. Check AWS credentials / bucket and server logs." },
      { status: 502 },
    );
  }
}
