import { cookies } from "next/headers";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session";
import { rebuildCatalog } from "@/lib/memories/catalog";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/memories/reindex — rebuild the caller's search catalog from their
 * saved memory.json files. Used once to backfill memories saved before the
 * catalog existed (or any time it drifts).
 */
export async function POST() {
  const store = await cookies();
  const session = await decodeSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const count = await rebuildCatalog(session.sub);
    return Response.json({ ok: true, count });
  } catch (err) {
    console.error("reindex failed", err);
    return Response.json({ error: "Reindex failed. Check AWS config and logs." }, { status: 502 });
  }
}
