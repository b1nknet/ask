import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";
import { getPrisma } from "@/lib/prisma";

// Deduplicate within a request only; pages and preview images always recheck visibility.
export const getPublicQuestion = cache(async (id: string) => {
  const question = await getPrisma().question.findUnique({
    where: { id, status: "PUBLISHED", answer: { not: null } },
    select: { id: true, content: true, answer: true, publishedAt: true },
  });
  if (!question?.answer?.trim()) notFound();
  return { ...question, answer: question.answer };
});
