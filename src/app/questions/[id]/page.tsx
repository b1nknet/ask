import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicAnswer } from "@/components/public-answer";
import { getAuthSettings } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";
import { getQuestionPath } from "@/lib/question-link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Deduplicate within a request only; always recheck visibility on the next request.
const getPublicQuestion = cache(async (id: string) => {
  const question = await getPrisma().question.findUnique({
    where: { id, status: "PUBLISHED", answer: { not: null } },
    select: { id: true, content: true, answer: true, publishedAt: true },
  });
  if (!question?.answer?.trim()) notFound();
  return { ...question, answer: question.answer };
});

export async function generateMetadata({
  params,
}: PageProps<"/questions/[id]">): Promise<Metadata> {
  const { id } = await params;
  const question = await getPublicQuestion(id);
  const title = `${question.content.replace(/\s+/g, " ").slice(0, 80)} | ASK`;
  const description = question.answer.replace(/\s+/g, " ").slice(0, 160);
  const url = new URL(getQuestionPath(question.id), getAuthSettings().baseURL).href;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "ASK", locale: "ko_KR", type: "article" },
    twitter: { card: "summary", title, description },
  };
}

export default async function QuestionPage({ params }: PageProps<"/questions/[id]">) {
  const { id } = await params;
  const question = await getPublicQuestion(id);

  return (
    <section aria-label="공개 질문과 답변" className="pt-10 sm:pt-14">
      <Link href="/" className="text-link mb-6 inline-flex min-h-11 items-center text-sm">
        ← 모든 답변 보기
      </Link>
      <PublicAnswer question={question} detail />
    </section>
  );
}
