"use client";

import { useState } from "react";

export function ShareLink({ path }: { path: string }) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  async function copy() {
    const url = new URL(path, window.location.origin).href;
    setPending(true);
    setCopied(false);
    setFallbackUrl(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setFallbackUrl(url);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" className="button-secondary" onClick={copy} disabled={pending}>
          {pending ? "복사 중…" : "링크 복사"}
        </button>
        <p role="status" className="text-xs text-accent">
          {copied ? "링크를 복사했어요." : ""}
        </p>
      </div>
      {fallbackUrl && (
        <label className="block space-y-2 text-sm text-muted">
          <span>자동으로 복사하지 못했어요. 아래 링크를 직접 복사해 주세요.</span>
          <input
            type="text"
            readOnly
            value={fallbackUrl}
            className="field"
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      )}
    </div>
  );
}
