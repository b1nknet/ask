"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { Turnstile } from "@/components/turnstile";

export function QuestionForm({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileAttempt, setTurnstileAttempt] = useState(0);
  const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || (turnstileSiteKey && !turnstileToken)) return;
    setPending(true);
    setNotice(null);
    const form = event.currentTarget;
    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          website: new FormData(form).get("website"),
          turnstileToken: turnstileToken ?? undefined,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "질문을 보내지 못했어요.");
      setContent("");
      form.reset();
      setNotice({ error: false, message: "질문을 보냈어요." });
    } catch (error) {
      setNotice({
        error: true,
        message: error instanceof Error ? error.message : "다시 시도해 주세요.",
      });
    } finally {
      // Tokens are single-use, including when a later step of submission fails.
      setTurnstileToken(null);
      setTurnstileAttempt((attempt) => attempt + 1);
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4" aria-busy={pending}>
      <label htmlFor="question" className="block text-sm font-semibold">
        질문
      </label>
      <textarea
        id="question"
        name="content"
        className="field min-h-40 resize-y sm:min-h-44"
        placeholder="질문을 남겨 주세요."
        value={content}
        onChange={(event) => setContent(event.target.value)}
        maxLength={1000}
        required
        disabled={pending}
        aria-describedby="question-help question-count"
      />
      <div className="absolute -left-[10000px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex items-start justify-between gap-4 text-xs leading-6 text-subtle">
        <p id="question-help">익명으로 보내며, 답변 시 공개될 수 있어요.</p>
        <span id="question-count" className="shrink-0 tabular-nums">
          {content.length} / 1,000
        </span>
      </div>
      {turnstileSiteKey && (
        <Turnstile key={turnstileAttempt} siteKey={turnstileSiteKey} onVerify={setTurnstileToken} />
      )}
      {notice && (
        <p
          role={notice.error ? "alert" : "status"}
          className={notice.error ? "error-text" : "success-text"}
        >
          {notice.message}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          className="button w-full shrink-0 sm:w-auto"
          disabled={pending || !content.trim() || Boolean(turnstileSiteKey && !turnstileToken)}
        >
          {pending ? "보내는 중…" : "보내기"}
          <Icon name="send" className="size-4" />
        </button>
      </div>
    </form>
  );
}
