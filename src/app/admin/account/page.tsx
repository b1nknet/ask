import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin-header";
import { ChangePasswordForm } from "@/components/change-password-form";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "계정 · ASK",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireAdmin();

  return (
    <section className="pt-10">
      <AdminHeader page="account" />
      <section aria-labelledby="password-heading" className="card">
        <h2 id="password-heading" className="text-lg font-semibold">
          비밀번호 변경
        </h2>
        <p className="mb-7 mt-2 text-sm leading-6 text-muted">
          현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다. 변경하면 다른 기기에서는
          로그아웃됩니다.
        </p>
        <ChangePasswordForm username={session.user.username ?? ""} />
      </section>
    </section>
  );
}
