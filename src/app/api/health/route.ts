import { auth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { llm } from "@/lib/llm";

/** Liveness + adapter introspection. Used by load balancers and `docker compose`. */
export function GET() {
  return Response.json({
    status: "ok",
    adapters: {
      auth: auth.name,
      storage: storage.name,
      llm: llm.enabled ? llm.name : "disabled",
    },
  });
}
