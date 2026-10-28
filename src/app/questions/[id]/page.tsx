import type { Metadata } from "next";
import Link from "next/link";
import { PublicAnswer } from "@/components/public-answer";
import { getAuthSettings } from "@/lib/env";
import { getPublicQuestion } from "@/lib/public-question";
import { getQuestionPath } from "@/lib/question-link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: PageProps<"/questions/[id]">): Promise<Metadata> {
  const { id } = await params;
  const question = await getPublicQuestion(id);
  const description = question.content.replace(/\s+/g, " ").trim();
  const characters = Array.from(description);
  const title = `${characters.slice(0, 64).join("")} | ASK`;
  const url = new URL(getQuestionPath(question.id), getAuthSettings().baseURL).href;
  const image = {
    url: `${url}/og`,
    width: 1200,
    height: 630,
    alt: characters.slice(0, 420).join(""),
  };

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "ASK",
      locale: "ko_KR",
      type: "article",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: characters.slice(0, 200).join(""),
      images: [image],
    },
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
