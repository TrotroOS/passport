import OpenAI from "openai";
import { getAIConfig } from "@/lib/ai/provider";
import { sentryAICall } from "@/lib/sentry";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildHsSuggestSystemPrompt,
  buildHsSuggestUserPrompt,
  buildHsVerifySystemPrompt,
  buildHsVerifyUserPrompt,
  HS_PROMPT_VERSION,
} from "./prompts";
import type { Locale } from "@/i18n/config";
import {
  hsSuggestResponseSchema,
  hsVerifyResponseSchema,
  type HsSuggestResponse,
  type HsVerifyResponse,
} from "./schemas";

const INPUT_COST_PER_1M = 2.5;
const OUTPUT_COST_PER_1M = 10.0;

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * INPUT_COST_PER_1M +
    (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M
  );
}

function parseJsonContent(content: string): unknown {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI response did not contain valid JSON");
  }
  return JSON.parse(jsonMatch[0]) as unknown;
}

async function logAiCall(
  params: {
    organizationId: string;
    userId?: string;
    productId: string;
    operation: string;
    provider: string;
    model: string;
  },
  logResult: {
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
    latencyMs: number;
    status: "success" | "error" | "rate_limited";
    errorMessage?: string;
  }
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("ai_provider_logs").insert({
    organization_id: params.organizationId,
    user_id: params.userId ?? null,
    document_id: null,
    product_id: params.productId,
    operation: params.operation,
    provider: params.provider,
    model: params.model,
    prompt_version: HS_PROMPT_VERSION,
    input_tokens: logResult.inputTokens ?? null,
    output_tokens: logResult.outputTokens ?? null,
    cost: logResult.cost ?? null,
    latency_ms: logResult.latencyMs,
    status: logResult.status,
    error_message: logResult.errorMessage ?? null,
  });
}

export async function callHsSuggestAI(
  input: Parameters<typeof buildHsSuggestUserPrompt>[0] & {
    organizationId: string;
    userId?: string;
    productId: string;
    targetLanguage?: Locale | string;
  }
): Promise<HsSuggestResponse> {
  const config = getAIConfig();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = config.model;

  const result = await sentryAICall(
    async () => {
      const start = Date.now();
      const response = await client.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: buildHsSuggestSystemPrompt(input.targetLanguage),
          },
          { role: "user", content: buildHsSuggestUserPrompt(input) },
        ],
        max_tokens: 2048,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from OpenAI");

      const parsed = hsSuggestResponseSchema.safeParse(parseJsonContent(content));
      if (!parsed.success) {
        throw new Error(
          `HS suggest response failed validation: ${parsed.error.errors[0]?.message}`
        );
      }

      const inputTokens = response.usage?.prompt_tokens ?? 0;
      const outputTokens = response.usage?.completion_tokens ?? 0;

      return {
        ...parsed.data,
        usage: {
          inputTokens,
          outputTokens,
          cost: estimateCost(inputTokens, outputTokens),
          latencyMs: Date.now() - start,
          model,
        },
      };
    },
    (logResult) =>
      logAiCall(
        {
          organizationId: input.organizationId,
          userId: input.userId,
          productId: input.productId,
          operation: "hs_suggest",
          provider: "openai",
          model,
        },
        logResult
      ),
    {
      organizationId: input.organizationId,
      userId: input.userId,
      productId: input.productId,
      provider: "openai",
      model,
      promptVersion: HS_PROMPT_VERSION,
    }
  );

  if (result.error || !result.data) {
    throw result.error ?? new Error("HS suggest AI call failed");
  }

  return result.data;
}

export async function callHsVerifyAI(
  input: Parameters<typeof buildHsVerifyUserPrompt>[0] & {
    organizationId: string;
    userId?: string;
    productId: string;
    targetLanguage?: Locale | string;
  }
): Promise<HsVerifyResponse> {
  const config = getAIConfig();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = config.model;

  const result = await sentryAICall(
    async () => {
      const start = Date.now();
      const response = await client.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: buildHsVerifySystemPrompt(input.targetLanguage),
          },
          { role: "user", content: buildHsVerifyUserPrompt(input) },
        ],
        max_tokens: 1024,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from OpenAI");

      const parsed = hsVerifyResponseSchema.safeParse(parseJsonContent(content));
      if (!parsed.success) {
        throw new Error(
          `HS verify response failed validation: ${parsed.error.errors[0]?.message}`
        );
      }

      const inputTokens = response.usage?.prompt_tokens ?? 0;
      const outputTokens = response.usage?.completion_tokens ?? 0;

      return {
        ...parsed.data,
        usage: {
          inputTokens,
          outputTokens,
          cost: estimateCost(inputTokens, outputTokens),
          latencyMs: Date.now() - start,
          model,
        },
      };
    },
    (logResult) =>
      logAiCall(
        {
          organizationId: input.organizationId,
          userId: input.userId,
          productId: input.productId,
          operation: "hs_verify",
          provider: "openai",
          model,
        },
        logResult
      ),
    {
      organizationId: input.organizationId,
      userId: input.userId,
      productId: input.productId,
      provider: "openai",
      model,
      promptVersion: HS_PROMPT_VERSION,
    }
  );

  if (result.error || !result.data) {
    throw result.error ?? new Error("HS verify AI call failed");
  }

  return result.data;
}
