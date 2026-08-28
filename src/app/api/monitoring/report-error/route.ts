import { NextResponse } from "next/server";
import { z } from "zod";
import { reportError } from "@/lib/monitoring/report-error";

const reportErrorSchema = z.object({
  message: z.string().min(1),
  name: z.string().optional(),
  stack: z.string().optional(),
  context: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = reportErrorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const error = new Error(parsed.data.message);
  if (parsed.data.name) error.name = parsed.data.name;
  if (parsed.data.stack) error.stack = parsed.data.stack;

  await reportError(error, { ...parsed.data.context, runtime: "client" });
  return NextResponse.json({ ok: true });
}
