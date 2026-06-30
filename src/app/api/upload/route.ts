import { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { requireAuth } from "@/lib/auth";
import { handleError, jsonResponse, errorResponse } from "@/lib/api";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 8 * 1024 * 1024;

// Files land in the project's public/ tree so Next.js serves them as static
// assets at /uploads/<name>. Requires a writable filesystem — fine for local
// dev and self-hosted; not viable on read-only serverless platforms.
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return errorResponse("No file provided in field 'file'", 400);
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return errorResponse(`Unsupported file type: ${file.type}. Allowed: JPG, PNG, WebP, GIF.`, 415);
    }
    if (file.size === 0) {
      return errorResponse("File is empty", 400);
    }
    if (file.size > MAX_BYTES) {
      return errorResponse(`File too large. Max ${MAX_BYTES / 1024 / 1024} MB.`, 413);
    }

    const ext = EXT_BY_MIME[file.type] ?? "bin";
    const name = `${crypto.randomUUID()}.${ext}`;
    const dest = path.join(process.cwd(), "public", "uploads", name);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, Buffer.from(await file.arrayBuffer()));

    return jsonResponse({ url: `/uploads/${name}` }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
