import "dotenv/config";
import { randomUUID } from "node:crypto";
import { input, password } from "@inquirer/prompts";
import { z } from "zod";
import { Prisma } from "../src/generated/prisma/client";
import { createAuth } from "../src/lib/auth-config";
import { getPrisma } from "../src/lib/prisma";
import { usernameSchema } from "../src/lib/username";

async function main() {
  const prisma = getPrisma();
  const interactive = Boolean(process.stdin.isTTY);
  const username = usernameSchema.parse(
    process.argv[2] ?? (interactive ? await input({ message: "관리자 아이디" }) : ""),
  );
  if (await prisma.user.findUnique({ where: { username } })) {
    throw new Error("This administrator already exists. No account or password was changed.");
  }

  // Keep the credential hash and user ID when converting the former administrator.
  const legacyEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (legacyEmail) {
    const legacy = await prisma.user.findUnique({ where: { email: legacyEmail } });
    if (legacy?.username) {
      throw new Error("기존 관리자 계정을 찾지 못했습니다. ADMIN_EMAIL 설정을 확인해 주세요.");
    }
    if (legacy) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: legacy.id },
          data: {
            username,
            name: username,
            email: `${randomUUID()}@ask.invalid`,
            emailVerified: false,
          },
        }),
        prisma.session.deleteMany({ where: { userId: legacy.id } }),
      ]);
      console.log(
        `Administrator converted: ${username}. The password was kept. Remove ADMIN_EMAIL.`,
      );
      return;
    }
  }

  const secret =
    process.env.ADMIN_PASSWORD ??
    (interactive ? await password({ message: "관리자 비밀번호", mask: "*" }) : "");
  const parsed = z
    .object({
      password: z.string().min(1, "비밀번호를 입력해 주세요."),
    })
    .parse({ password: secret });

  await createAuth({ allowSignUp: true }).api.signUpEmail({
    body: {
      // Better Auth requires these core fields; no personal email or name is collected.
      email: `${randomUUID()}@ask.invalid`,
      name: username,
      username,
      password: parsed.password,
    },
  });
  console.log(`Administrator created: ${username}`);
}

try {
  await main();
} catch (error) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    console.error(
      "DB 테이블 또는 컬럼이 준비되지 않았습니다. npm run setup을 실행한 뒤 계정을 생성해 주세요. prisma/migrations 파일이 있는지도 확인해 주세요.",
    );
  } else {
    console.error(error instanceof Error ? error.message : "Could not create the administrator.");
  }
  process.exitCode = 1;
} finally {
  await getPrisma().$disconnect();
}
