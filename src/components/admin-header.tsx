import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export function AdminHeader({ page }: { page: "questions" | "account" }) {
  const links = [
    { page: "questions", href: "/admin", label: "질문 관리" },
    { page: "account", href: "/admin/account", label: "계정" },
  ] as const;

  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <h1 className="text-3xl font-bold tracking-tight">
        {page === "account" ? "계정" : "질문 관리"}
      </h1>
      <div className="flex flex-wrap items-start gap-4">
        <nav aria-label="관리자 메뉴" className="flex gap-4">
          {links.map((link) => (
            <Link
              key={link.page}
              href={link.href}
              aria-current={page === link.page ? "page" : undefined}
              className={`flex min-h-11 items-center text-sm transition-colors ${page === link.page ? "font-medium text-accent" : "text-link"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <LogoutButton />
      </div>
    </div>
  );
}
