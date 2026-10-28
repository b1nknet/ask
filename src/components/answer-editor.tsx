"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { QuestionStatus } from "@/generated/prisma/client";

type Question = {
  id: string;
  content: string;
  ipAddress: string | null;
  answer: string | null;
  status: QuestionStatus;
  createdAt: string;
};

export function AnswerEditor({ question }: { question: Question }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await update("PATCH", { answer: data.get("answer"), status: data.get("status") });
  }

  async function update(method: "PATCH" | "DELETE", body?: unknown) {
    setPending(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/questions/${question.id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "저장하지 못했어요.");
      setNotice({ error: false, message: method === "DELETE" ? "삭제했어요." : "저장했어요." });
      router.refresh();
    } catch (error) {
      setNotice({
        error: true,
        message: error instanceof Error ? error.message : "다시 시도해 주세요.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="card">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
        <time dateTime={question.createdAt}>
          {new Date(question.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
        </time>
        <p className="min-w-0 break-all">
          질문자 IP: <span className="font-mono">{question.ipAddress ?? "확인 불가"}</span>
        </p>
      </div>
      <h2 className="mb-5 mt-3 whitespace-pre-wrap break-words font-semibold leading-7">
        {question.content}
      </h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor={`answer-${question.id}`} className="mb-2 block text-sm font-medium">
            답변
          </label>
          <textarea
            id={`answer-${question.id}`}
            name="answer"
            className="field min-h-32 resize-y"
            maxLength={5000}
            defaultValue={question.answer ?? ""}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor={`status-${question.id}`} className="mb-2 block text-sm font-medium">
            상태
          </label>
          <select
            id={`status-${question.id}`}
            name="status"
            className="field"
            defaultValue={question.status}
            disabled={pending}
          >
            <option value="PENDING">비공개</option>
            <option value="PUBLISHED">공개</option>
            <option value="ARCHIVED">보관 (비공개)</option>
          </select>
        </div>
        {notice && (
          <p
            className={notice.error ? "error-text" : "success-text"}
            role={notice.error ? "alert" : "status"}
          >
            {notice.message}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <button type="submit" className="button" disabled={pending}>
            {pending ? "처리 중…" : "저장"}
          </button>
          <button
            type="button"
            className="px-2 py-3 text-sm text-danger disabled:opacity-50"
            disabled={pending}
            onClick={() => {
              if (window.confirm("이 질문과 답변을 영구 삭제할까요?")) void update("DELETE");
            }}
          >
            영구 삭제
          </button>
        </div>
      </form>
    </article>
  );
}
