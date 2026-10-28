import { getAdminSession } from "@/lib/auth";
import { handleError, json, readJson, requireSameOrigin } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { getQuestionPath } from "@/lib/question-link";
import { answerSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    if (!(await getAdminSession(request.headers)))
      return json({ error: "로그인이 필요해요." }, 401);
    requireSameOrigin(request);
    const parsed = answerSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);

    const { id } = await params;
    const prisma = getPrisma();
    const question = await prisma.question.findUnique({
      where: { id },
      select: { publishedAt: true },
    });
    if (!question) return json({ error: "질문을 찾을 수 없어요." }, 404);

    await prisma.question.update({
      where: { id },
      data: {
        answer: parsed.data.answer || null,
        status: parsed.data.status,
        publishedAt:
          parsed.data.status === "PUBLISHED" ? (question.publishedAt ?? new Date()) : null,
      },
    });

    return json({
      success: true,
      sharePath: parsed.data.status === "PUBLISHED" ? getQuestionPath(id) : null,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    if (!(await getAdminSession(request.headers)))
      return json({ error: "로그인이 필요해요." }, 401);
    requireSameOrigin(request);
    const { id } = await params;
    const { count } = await getPrisma().question.deleteMany({ where: { id } });
    if (!count) return json({ error: "질문을 찾을 수 없어요." }, 404);
    return json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
