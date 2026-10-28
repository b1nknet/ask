import Link from "next/link";
import { ShareLink } from "@/components/share-link";
import { getQuestionPath } from "@/lib/question-link";

type Question = {
  id: string;
  content: string;
  answer: string | null;
  publishedAt: Date | null;
};

export function PublicAnswer({
  question,
  detail = false,
}: {
  question: Question;
  detail?: boolean;
}) {
  const Heading = detail ? "h1" : "h3";
  const path = getQuestionPath(question.id);

  return (
    <article className="card">
      <Heading className="whitespace-pre-wrap break-words text-lg font-semibold leading-8">
        {detail ? (
          question.content
        ) : (
          <Link href={path} className="transition-colors hover:text-accent">
            {question.content}
          </Link>
        )}
      </Heading>
      <p className="mt-5 whitespace-pre-wrap break-words border-l-2 border-accent pl-4 text-sm leading-7 text-muted">
        {question.answer}
      </p>
      {question.publishedAt && (
        <time
          dateTime={question.publishedAt.toISOString()}
          className="mt-5 block text-xs text-subtle"
        >
          {question.publishedAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
        </time>
      )}
      <div className="mt-5 border-t border-line pt-4">
        <ShareLink path={path} />
      </div>
    </article>
  );
}
