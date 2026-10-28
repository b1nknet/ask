"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function ChangePasswordForm({ username }: { username: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword"));
    setNotice(null);

    if (newPassword !== data.get("confirmPassword")) {
      setNotice({ error: true, message: "새 비밀번호와 비밀번호 확인이 일치하지 않아요." });
      return;
    }

    setPending(true);
    try {
      const result = await authClient.changePassword({
        currentPassword: String(data.get("currentPassword")),
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        let message = "비밀번호를 변경하지 못했어요. 다시 시도해 주세요.";
        if (result.error.code === "INVALID_PASSWORD") {
          message = "현재 비밀번호를 확인해 주세요.";
        } else if (result.error.code === "SESSION_NOT_FRESH") {
          message = "로그아웃한 뒤 다시 로그인해 비밀번호를 변경해 주세요.";
        } else if (result.error.status === 401) {
          message = "로그인이 만료됐어요. 다시 로그인해 주세요.";
          router.replace("/admin/login");
          router.refresh();
        } else if (result.error.status === 429) {
          message = "잠시 후 다시 시도해 주세요.";
        }
        setNotice({ error: true, message });
        return;
      }
      form.reset();
      setNotice({
        error: false,
        message: "비밀번호를 변경했어요. 다른 기기에서는 로그아웃됐어요.",
      });
      router.refresh();
    } catch {
      setNotice({ error: true, message: "연결하지 못했어요. 잠시 후 다시 시도해 주세요." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-5">
      <div>
        <label htmlFor="account-username" className="mb-2 block text-sm font-medium">
          아이디
        </label>
        <input
          id="account-username"
          name="username"
          type="text"
          autoComplete="username"
          value={username}
          readOnly
          className="field text-muted"
        />
      </div>
      <div>
        <label htmlFor="current-password" className="mb-2 block text-sm font-medium">
          현재 비밀번호
        </label>
        <input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          className="field"
          required
          disabled={pending}
        />
      </div>
      <div>
        <label htmlFor="new-password" className="mb-2 block text-sm font-medium">
          새 비밀번호
        </label>
        <input
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          className="field"
          required
          disabled={pending}
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">
          새 비밀번호 확인
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
      {notice && (
        <p
          className={notice.error ? "error-text" : "success-text"}
          role={notice.error ? "alert" : "status"}
        >
          {notice.message}
        </p>
      )}
      <button type="submit" className="button" disabled={pending}>
        {pending ? "변경하는 중…" : "비밀번호 변경"}
      </button>
    </form>
  );
}
