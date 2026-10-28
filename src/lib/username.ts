import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "아이디는 3~30자로 입력해 주세요.")
  .max(30, "아이디는 3~30자로 입력해 주세요.")
  .regex(/^[a-zA-Z0-9_.]+$/, "아이디에는 영문, 숫자, 밑줄(_), 마침표(.)만 사용할 수 있습니다.")
  .transform((value) => value.toLowerCase());
