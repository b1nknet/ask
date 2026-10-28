"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div className="text-right">
      <button
        className="button-secondary"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          try {
            const result = await authClient.signOut();
            if (result.error) throw new Error("Sign out failed");
            router.replace("/admin/login");
            router.refresh();
          } catch {
            setError("로그아웃하지 못했어요. 다시 시도해 주세요.");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "로그아웃 중…" : "로그아웃"}
      </button>
      {error && (
        <p className="error-text mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
