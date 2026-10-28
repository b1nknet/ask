import { getClientKey, questionLimiter } from "@/lib/rate-limit";
import { getPrisma } from "@/lib/prisma";
import { handleError, json, readJson, requireSameOrigin } from "@/lib/http";
import { questionSchema } from "@/lib/validation";
import { verifyTurnstile } from "@/lib/turnstile";
import { getClientIp } from "@/lib/client-ip";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const parsed = questionSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
    if (parsed.data.website) return json({ success: true }, 201);

    const limit = questionLimiter.consume(getClientKey(request.headers));
    if (!limit.allowed) {
      return json({ error: "질문을 조금 빠르게 보내고 있어요. 잠시 후 다시 보내 주세요." }, 429, {
        "Retry-After": String(limit.retryAfter),
      });
    }

    await verifyTurnstile(parsed.data.turnstileToken);
    await getPrisma().question.create({
      data: { content: parsed.data.content, ipAddress: getClientIp(request.headers) },
    });
    return json({ success: true }, 201);
  } catch (error) {
    return handleError(error);
  }
}
