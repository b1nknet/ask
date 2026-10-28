import { createFirstAdmin, hasAdmin } from "@/lib/setup";
import { handleError, json, readJson, requireSameOrigin } from "@/lib/http";
import { getClientKey, setupLimiter } from "@/lib/rate-limit";
import { setupSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (await hasAdmin()) {
      return json({ error: "이미 관리자 계정이 있어요. 로그인해 주세요." }, 409);
    }
    const limit = setupLimiter.consume(getClientKey(request.headers));
    if (!limit.allowed) {
      return json({ error: "잠시 후 다시 시도해 주세요." }, 429, {
        "Retry-After": String(limit.retryAfter),
      });
    }
    const parsed = setupSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
    await createFirstAdmin(parsed.data.username, parsed.data.password);
    return json({ success: true }, 201);
  } catch (error) {
    return handleError(error);
  }
}
