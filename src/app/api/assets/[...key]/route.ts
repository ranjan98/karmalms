import { storage } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * Serves uploaded branding assets from the storage adapter. Scoped to the
 * `branding/` prefix so it can never be used to read other objects (e.g.
 * future course materials) out of the bucket.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const path = key.join("/");

  if (!path.startsWith("branding/")) {
    return new Response("Forbidden", { status: 403 });
  }

  const ext = path.split(".").pop()?.toLowerCase() ?? "";

  try {
    const bytes = await storage.get(path);
    // storage.get yields a Uint8Array; the cast satisfies the strict BodyInit
    // lib typing — the runtime value is a valid response body.
    return new Response(bytes as unknown as BodyInit, {
      headers: {
        "content-type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
