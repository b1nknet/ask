import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { AnswerEditor } from "@/components/answer-editor";
import { AdminHeader } from "@/components/admin-header";
import type { QuestionStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const filters = [
  { status: "PENDING", label: "받은 질문" },
  { status: "PUBLISHED", label: "공개 답변" },
  { status: "ARCHIVED", label: "보관함" },
] as const;

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const params = await searchParams;
  const status: QuestionStatus =
    filters.find((filter) => filter.status === params.status)?.status ?? "PENDING";
  const page = Math.min(10_000, Math.max(1, Number(params.page) || 1)) | 0;
  const questions = await getPrisma().question.findMany({
    where: { status },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * 20,
    take: 21,
  });
  return (
    <section className="pt-10">
      <AdminHeader page="questions" />
      <nav aria-label="질문 상태" className="mb-7 flex gap-2 border-b border-line">
        {filters.map((filter) => (
          <Link
            key={filter.status}
            href={`/admin?status=${filter.status}`}
            aria-current={status === filter.status ? "page" : undefined}
            className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${status === filter.status ? "border-accent text-accent" : "border-transparent text-muted hover:text-accent"}`}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
      <div className="space-y-5">
        {questions.length === 0 ? (
          <p className="card py-14 text-center text-sm text-muted">질문이 없어요.</p>
        ) : (
          questions.slice(0, 20).map((question) => (
            <AnswerEditor
              key={question.id}
              question={{
                id: question.id,
                content: question.content,
                ipAddress: question.ipAddress,
                answer: question.answer,
                status: question.status,
                createdAt: question.createdAt.toISOString(),
              }}
            />
          ))
        )}
      </div>
      <nav aria-label="질문 페이지" className="mt-6 flex justify-between text-sm">
        {page > 1 ? (
          <Link href={`/admin?status=${status}&page=${page - 1}`} className="text-link py-3">
            ← 이전
          </Link>
        ) : (
          <span />
        )}
        {questions.length > 20 && (
          <Link href={`/admin?status=${status}&page=${page + 1}`} className="text-link py-3">
            다음 →
          </Link>
        )}
      </nav>
    </section>
  );
}
