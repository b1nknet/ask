import { getAuthSettings } from "@/lib/env";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== getAuthSettings().baseURL) {
    throw new HttpError(403, "허용되지 않은 요청이에요.");
  }
}

export async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new HttpError(415, "JSON 형식으로 요청해 주세요.");
  }

  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "입력 내용을 확인해 주세요.");

  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16_384) {
      await reader.cancel();
      throw new HttpError(413, "입력 내용이 너무 길어요.");
    }
    chunks.push(value);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new HttpError(400, "입력 내용을 확인해 주세요.");
  }
}

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "no-store");
  return Response.json(data, {
    status,
    headers: responseHeaders,
  });
}

export function handleError(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  // Do not log request bodies, SQL parameters, passwords, or question content.
  console.error("Request failed:", error instanceof Error ? error.name : "UnknownError");
  return json({ error: "처리하지 못했어요. 잠시 후 다시 시도해 주세요." }, 500);
}
