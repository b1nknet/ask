"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "dark";
      size: "flexible" | "compact";
      language: "ko";
      "response-field": false;
      "refresh-expired": "auto";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      "timeout-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function Turnstile({
  siteKey,
  onVerify,
}: {
  siteKey: string;
  onVerify: (token: string | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = window.turnstile;
    if (!ready || !api || !container.current) return;

    const widgetId = api.render(container.current, {
      sitekey: siteKey,
      action: "question",
      theme: "dark",
      // The flexible widget has a 300px minimum width.
      size: container.current.clientWidth < 300 ? "compact" : "flexible",
      language: "ko",
      "response-field": false,
      "refresh-expired": "auto",
      callback: (token) => {
        setError(null);
        onVerify(token);
      },
      "expired-callback": () => onVerify(null),
      "error-callback": () => {
        onVerify(null);
        setError("보안 확인에 실패했어요. 자동으로 다시 시도합니다.");
      },
      "timeout-callback": () => onVerify(null),
    });

    return () => api.remove(widgetId);
  }, [ready, siteKey, onVerify]);

  return (
    <div className="space-y-2">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
        onError={() => {
          onVerify(null);
          setError("보안 확인을 불러오지 못했어요. 페이지를 새로고침해 주세요.");
        }}
      />
      <div ref={container} aria-label="보안 확인" className="min-h-[65px]" />
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
    </div>
  );
}
