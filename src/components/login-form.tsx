"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await authClient.signIn.username({
        username: String(data.get("username")).trim(),
        password: String(data.get("password")),
      });
      if (result.error) {
        setError(
          result.error.status === 429
            ? "잠시 후 다시 로그인해 주세요."
            : "아이디와 비밀번호를 확인해 주세요.",
        );
        return;
      }
      router.replace("/admin");
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
          className="field"
          required
          disabled={pending}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {pending ? "확인하는 중…" : "로그인"}
      </button>
    </form>
  );
}
