import { z } from "zod";

export const sendGridInboundFieldSchema = z.object({
  from: z.string().min(1),
  subject: z.string().optional(),
  text: z.string().optional(),
  html: z.string().optional(),
  to: z.string().optional(),
});

export const twilioInboundSchema = z.object({
  From: z.string().min(1),
  To: z.string().optional(),
  Body: z.string().optional(),
  NumMedia: z.string().optional(),
  MessageSid: z.string().optional(),
});

export function parseTwilioNumMedia(numMedia: string | undefined): number {
  const n = parseInt(numMedia ?? "0", 10);
  return Number.isFinite(n) ? n : 0;
}
