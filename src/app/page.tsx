import Link from "next/link";
import { redirect } from "next/navigation";
import { QuestionForm } from "@/components/question-form";
import { Icon } from "@/components/icon";
import { PublicAnswer } from "@/components/public-answer";
import { getPrisma } from "@/lib/prisma";
import { hasAdmin } from "@/lib/setup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const pageSize = 10;

export default async function Home({ searchParams }: PageProps<"/">) {
  if (!(await hasAdmin())) redirect("/setup");
  const params = await searchParams;
  const page = Math.min(10_000, Math.max(1, Number(params.page) || 1)) | 0;
  const questions = await getPrisma().question.findMany({
    where: { status: "PUBLISHED", answer: { not: null } },
    select: { id: true, content: true, answer: true, publishedAt: true },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  });

  return (
    <>
      <section aria-label="질문 작성" className="pt-10 sm:pt-14">
        <h1 className="sr-only">ASK</h1>
        <QuestionForm turnstileSiteKey={process.env.TURNSTILE_SITE_KEY?.trim() || null} />
      </section>
      <section aria-labelledby="answers-title" className="mt-12 sm:mt-14">
        <div className="mb-6 flex items-center gap-4">
          <h2 id="answers-title" className="shrink-0 text-base font-semibold tracking-tight">
            답변
          </h2>
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
        </div>
        {questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-accent-soft px-5 py-10 text-center">
            <Icon name="inbox" className="mx-auto mb-4 size-7 text-accent" />
            <p className="text-sm text-muted">아직 답변이 없어요.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {questions.slice(0, pageSize).map((question) => (
              <PublicAnswer key={question.id} question={question} />
            ))}
          </div>
        )}
        <nav aria-label="답변 페이지" className="mt-6 flex justify-between text-sm">
          {page > 1 ? (
            <Link href={`/?page=${page - 1}`} className="text-link py-3 hover:underline">
              ← 이전
            </Link>
          ) : (
            <span />
          )}
          {questions.length > pageSize && (
            <Link href={`/?page=${page + 1}`} className="text-link py-3 hover:underline">
              다음 →
            </Link>
          )}
        </nav>
      </section>
    </>
  );
}
