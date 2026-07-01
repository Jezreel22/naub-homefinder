import { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { handleError } from "@/lib/api";

/**
 * Serves a previously uploaded file. The /api/upload route writes files into
 * `public/uploads/` and returns a URL like `/uploads/<name>`. Next.js
 * production serves /public from a build-time snapshot, so runtime uploads
 * are not reachable that way; this route streams them on demand.
 *
 * Strict validation: the path component must be a UUID + one of the
 * extensions /api/upload emits (jpg/png/webp/gif). No traversal — if the
 * resolver ends up anywhere outside the uploads dir, we 404.
 */

const ALLOWED_EXT = new Set(["jpg", "png", "webp", "gif"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;

    const dot = name.lastIndexOf(".");
    if (dot < 1) return new Response("Not found", { status: 404 });
    const base = name.slice(0, dot);
    const ext = name.slice(dot + 1).toLowerCase();

    if (!ALLOWED_EXT.has(ext) || !UUID_RE.test(base)) {
      return new Response("Not found", { status: 404 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadsDir, name);
    const normalized = path.normalize(filePath);
    if (!normalized.startsWith(uploadsDir + path.sep)) {
      return new Response("Not found", { status: 404 });
    }

    const stat = await fs.stat(normalized).catch(() => null);
    if (!stat || !stat.isFile()) {
      return new Response("Not found", { status: 404 });
    }

    const data = await fs.readFile(normalized);
    // Weak ETag from file size + mtime so browsers cache aggressively.
    const etag = `W/"${stat.size.toString(36)}-${Math.floor(stat.mtimeMs).toString(36)}"`;

    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "content-type": MIME[ext] ?? "application/octet-stream",
        "content-length": String(stat.size),
        "cache-control": "public, max-age=31536000, immutable",
        etag,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}