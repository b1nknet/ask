import { isIP } from "node:net";

export function getClientIp(headers: Headers): string | null {
  if (process.env.TRUST_PROXY !== "true") return null;

  // Only trust the single address overwritten by our reverse proxy.
  const address = headers.get("x-real-ip");
  return address && isIP(address) ? address : null;
}
