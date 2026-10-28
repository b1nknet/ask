"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="py-20 text-center">
      <h1 className="mb-6 text-2xl font-bold">연결할 수 없어요.</h1>
      <button className="button" onClick={reset}>
        다시 시도
      </button>
    </section>
  );
}
