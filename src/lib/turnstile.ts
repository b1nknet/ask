import { HttpError } from "@/lib/http";

export async function verifyTurnstile(token: string | undefined) {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!siteKey && !secretKey) return;

  const unavailable = "보안 확인을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
  if (!siteKey || !secretKey) throw new HttpError(503, unavailable);
  if (!token?.trim() || token.length > 2048) {
    throw new HttpError(400, "보안 확인을 완료해 주세요.");
  }

  let result: { success?: boolean; action?: string } | null;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: secretKey, response: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Turnstile unavailable");
    result = (await response.json()) as typeof result;
  } catch {
    throw new HttpError(503, unavailable);
  }

  if (result?.success !== true || result.action !== "question") {
    throw new HttpError(400, "보안 확인이 만료되었거나 실패했어요. 다시 확인해 주세요.");
  }
}
