import { z } from "zod";
import { usernameSchema } from "@/lib/username";

export const setupSchema = z
  .object({
    username: usernameSchema,
    password: z.string().min(1, "비밀번호를 입력해 주세요."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "비밀번호와 비밀번호 확인이 일치하지 않아요.",
    path: ["confirmPassword"],
  });

export const questionSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "질문을 입력해 주세요.")
    .max(1000, "질문은 1,000자까지 쓸 수 있어요."),
  website: z.string().max(200).optional().default(""),
  turnstileToken: z.string().max(2048, "보안 확인을 다시 진행해 주세요.").optional(),
});

export const answerSchema = z
  .object({
    answer: z.string().trim().max(5000, "답변은 5,000자까지 쓸 수 있어요."),
    status: z.enum(["PENDING", "PUBLISHED", "ARCHIVED"]),
  })
  .refine((value) => value.status !== "PUBLISHED" || value.answer.length > 0, {
    message: "공개하려면 답변을 입력해 주세요.",
    path: ["answer"],
  });
