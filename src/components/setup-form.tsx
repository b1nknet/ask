"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function SetupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const data = new FormData(event.currentTarget);
    const body = {
      username: String(data.get("username")),
      password: String(data.get("password")),
      confirmPassword: String(data.get("confirmPassword")),
    };
    if (body.password !== body.confirmPassword) {
      setError("비밀번호와 비밀번호 확인이 일치하지 않아요.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const result = await response.json();
        setError(result.error ?? "계정을 만들지 못했어요. 다시 시도해 주세요.");
        if (response.status === 409) {
          router.replace("/admin/login");
          router.refresh();
        }
        return;
      }
      router.replace("/admin/login?created=1");
      router.refresh();
    } catch {
      setError("연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="username" className="mb-2 block text-sm font-medium">
          아이디
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_.]+"
          aria-describedby="username-help"
          className="field"
          required
          disabled={pending}
        />
        <p id="username-help" className="mt-2 text-xs leading-5 text-muted">
          영문, 숫자, 밑줄(_), 마침표(.)로 3~30자. 대소문자는 구분하지 않아요.
        </p>
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="field"
          required
          disabled={pending}
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">
          비밀번호 확인
        </label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="field"
          required
          disabled={pending}
        />
      </div>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <button className="button w-full" type="submit" disabled={pending}>
        {pending ? "만드는 중…" : "계정 만들기"}
      </button>
    </form>
  );
}
