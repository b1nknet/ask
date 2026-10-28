import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { hasAdmin } from "@/lib/setup";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (!(await hasAdmin())) redirect("/setup");
  if (await getAdminSession(await headers())) redirect("/admin");
  const params = await searchParams;
  return (
    <section className="mx-auto max-w-sm py-14 sm:py-20">
      <h1 className="mb-8 text-[1.75rem] font-semibold tracking-tight">로그인</h1>
      {params.created === "1" && (
        <p role="status" className="success-text mb-6">
          관리자 계정을 만들었어요. 설정한 아이디와 비밀번호로 로그인해 주세요.
        </p>
      )}
      <LoginForm />
    </section>
  );
}
