import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { getAuthSettings } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";

// The CLI uses allowSignUp only for a direct server-side call, never an HTTP route.
export function createAuth({ allowSignUp = false } = {}) {
  const { secret, baseURL } = getAuthSettings();

  return betterAuth({
    appName: "Ask",
    secret,
    baseURL,
    trustedOrigins: [baseURL],
    telemetry: { enabled: false },
    database: prismaAdapter(getPrisma(), { provider: "sqlite", transaction: true }),
    plugins: [username({ displayUsername: false })],
    disabledPaths: ["/sign-in/email", "/update-user", "/change-email"],
    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowSignUp,
      // Omitted values restore Better Auth's defaults. Require a value without a length cap.
      minPasswordLength: 1,
      maxPasswordLength: Number.POSITIVE_INFINITY,
      autoSignIn: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      storage: "memory",
      window: 60,
      max: 30,
      customRules: { "/sign-in/username": { window: 60, max: 5 } },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: process.env.TRUST_PROXY === "true" ? ["x-real-ip"] : [],
      },
    },
  });
}
