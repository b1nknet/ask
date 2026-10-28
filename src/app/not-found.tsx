import Link from "next/link";

export default function NotFound() {
  return (
    <section className="py-20 text-center">
      <h1 className="mb-6 text-2xl font-bold">페이지를 찾을 수 없어요.</h1>
      <Link href="/" className="button">
        홈으로
      </Link>
    </section>
  );
}
