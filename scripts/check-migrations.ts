import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

try {
  const directory = "prisma/migrations";
  const migrations = readdirSync(directory, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory(),
  );
  if (migrations.length === 0) throw new Error("No migrations found.");
  for (const migration of migrations) {
    if (!readFileSync(path.join(directory, migration.name, "migration.sql"), "utf8").trim()) {
      throw new Error("Empty migration.");
    }
  }
} catch {
  console.error(
    "DB 초기화에 필요한 마이그레이션 파일이 없거나 비어 있습니다. prisma/migrations를 복구한 뒤 npm run setup을 다시 실행해 주세요. DB를 초기화할 때 마이그레이션 파일은 삭제하지 마세요.",
  );
  process.exitCode = 1;
}
