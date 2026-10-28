import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetupForm } from "@/components/setup-form";
import { hasAdmin } from "@/lib/setup";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SetupPage() {
  if (await hasAdmin()) redirect("/admin/login");
  return (
    <section className="mx-auto max-w-sm py-14 sm:py-20">
      <h1 className="mb-3 text-[1.75rem] font-semibold tracking-tight">관리자 계정 만들기</h1>
      <p className="mb-8 text-sm leading-6 text-muted">
        질문함을 처음 열었어요. 질문을 관리할 아이디와 비밀번호를 설정해 주세요. 계정을 만들면 초기
        설정은 닫힙니다.
      </p>
      <SetupForm />
    </section>
  );
}
