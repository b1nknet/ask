import Link from "next/link";
import { Icon } from "@/components/icon";

export function SiteHeader() {
  return (
    <header className="page-container">
      <div className="flex items-center justify-between border-b border-line py-6 sm:py-7">
        <Link href="/" className="flex items-center gap-3 text-base font-semibold tracking-tight">
          <span className="flex size-10 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft text-accent">
            <Icon name="message" className="size-5" />
          </span>
          ASK
        </Link>
        <Link href="/admin" className="text-link flex min-h-11 items-center gap-2 text-xs">
          관리
        </Link>
      </div>
    </header>
  );
}
