import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getPublicQuestion } from "@/lib/public-question";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const font = await readFile(join(process.cwd(), "public/fonts/Pretendard-Regular.woff"));

export async function GET(_request: Request, { params }: RouteContext<"/questions/[id]/og">) {
  const { id } = await params;
  const question = await getPublicQuestion(id);
  const text = Array.from(question.content.replace(/\s+/g, " ").trim());
  const preview = text.length > 140 ? `${text.slice(0, 139).join("")}…` : text.join("");

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "56px 64px",
        background: "#181818",
        color: "#f3f0f7",
        fontFamily: "Pretendard",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 24,
          borderBottom: "1px solid #484848",
        }}
      >
        <span style={{ color: "#c8b4f0", fontSize: 36 }}>ASK</span>
        <span style={{ color: "#b3afb9", fontSize: 24 }}>익명 질문</span>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          padding: "24px 0",
        }}
      >
        <div
          style={{
            fontSize: text.length > 80 ? 40 : 52,
            lineHeight: 1.4,
            wordBreak: "break-all",
          }}
        >
          {preview}
        </div>
      </div>
      <div style={{ display: "flex", color: "#c8b4f0", fontSize: 24 }}>
        질문과 답변을 확인해 보세요.
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Pretendard", data: font, weight: 400, style: "normal" }],
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}
