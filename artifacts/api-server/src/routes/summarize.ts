import { Router, type IRouter, type Request, type Response } from "express";
import { Client } from "@gradio/client";
import { SummarizeTextBody, SummarizeTextResponse } from "@workspace/api-zod";

const router: IRouter = Router();

type SummarizeBody = {
  text: string;
  length?: "short" | "medium" | "long";
  format?: "paragraph" | "bullets";
  tone?: "neutral" | "formal" | "casual" | "academic";
};

const HF_SPACE = "lonewolf168/khmer-text-summarizer";
const MODEL = `hf:${HF_SPACE}`;

const LENGTH_TO_MAX_TOKENS: Record<NonNullable<SummarizeBody["length"]>, number> = {
  short: 128,
  medium: 256,
  long: 512,
};

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function toBullets(text: string): string {
  const sentences = text
    .split(/(?<=[។?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length <= 1) return text;
  return sentences.map((s) => `- ${s}`).join("\n");
}

let clientPromise: Promise<Client> | null = null;
function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = Client.connect(HF_SPACE).catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

router.post("/summarize", async (req: Request, res: Response) => {
  const startedAt = Date.now();

  const parseResult = SummarizeTextBody.safeParse(req.body);
  if (!parseResult.success) {
    req.log.warn({ issues: parseResult.error.issues }, "Invalid summarize request");
    res.status(400).json({
      error: "invalid_request",
      message:
        parseResult.error.issues[0]?.message ??
        "Invalid request body. Provide `text` (50-50000 chars) and optional `length`, `format`, `tone`.",
    });
    return;
  }

  const body: Required<SummarizeBody> = {
    text: parseResult.data.text,
    length: parseResult.data.length ?? "medium",
    format: parseResult.data.format ?? "paragraph",
    tone: parseResult.data.tone ?? "neutral",
  };

  const maxLength = LENGTH_TO_MAX_TOKENS[body.length];

  try {
    const client = await getClient();
    const result = await client.predict("/summarize", {
      text: body.text,
      max_length: maxLength,
    });

    const data = result.data as unknown;
    let summary = "";
    if (Array.isArray(data) && typeof data[0] === "string") {
      summary = data[0].trim();
    } else if (typeof data === "string") {
      summary = data.trim();
    }

    if (!summary) {
      req.log.error({ data }, "Empty summary returned by model");
      res.status(502).json({
        error: "empty_summary",
        message: "The model did not return a summary. Please try again.",
      });
      return;
    }

    if (body.format === "bullets") {
      summary = toBullets(summary);
    }

    const sourceWordCount = countWords(body.text);
    const summaryWordCount = countWords(summary);
    const compressionRatio =
      sourceWordCount > 0
        ? Number((summaryWordCount / sourceWordCount).toFixed(4))
        : 0;
    const durationMs = Date.now() - startedAt;

    const payload = SummarizeTextResponse.parse({
      summary,
      format: body.format,
      length: body.length,
      tone: body.tone,
      sourceWordCount,
      summaryWordCount,
      compressionRatio,
      model: MODEL,
      durationMs,
    });

    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "Summarization failed");
    res.status(502).json({
      error: "summarization_failed",
      message:
        err instanceof Error
          ? err.message
          : "Failed to generate a summary. Please try again.",
    });
  }
});

export default router;
