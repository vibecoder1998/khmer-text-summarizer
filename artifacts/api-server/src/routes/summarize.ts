import { Router, type IRouter, type Request, type Response } from "express";
import { Client } from "@gradio/client";
import { SummarizeTextBody, SummarizeTextResponse } from "@workspace/api-zod";

const router: IRouter = Router();

type ModelId = "mt5-base" | "gemma-4-4b";

const SPACES: Record<ModelId, string> = {
  "mt5-base": "taravirak/khmer-text-summarizer",
  "gemma-4-4b": "lonewolf168/khmer-text-summarizer",
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

const clientCache = new Map<ModelId, Promise<Client>>();
function getClient(model: ModelId): Promise<Client> {
  let p = clientCache.get(model);
  if (!p) {
    p = Client.connect(SPACES[model]).catch((err) => {
      clientCache.delete(model);
      throw err;
    });
    clientCache.set(model, p);
  }
  return p;
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
        "Invalid request body. Provide `text` (50-50000 chars) and optional model parameters.",
    });
    return;
  }

  const data = parseResult.data;
  const model: ModelId = (data.model ?? "mt5-base") as ModelId;
  const format = data.format ?? "paragraph";

  try {
    const client = await getClient(model);

    let result: { data: unknown };
    if (model === "mt5-base") {
      const numBeams = data.numBeams ?? 4;
      const maxNewTokens = data.maxNewTokens ?? 256;
      result = await client.predict("/summarize", {
        article: data.text,
        num_beams: numBeams,
        max_new_tokens: maxNewTokens,
      });
    } else {
      const maxLength = data.maxLength ?? 512;
      result = await client.predict("/summarize", {
        text: data.text,
        max_length: maxLength,
      });
    }

    const raw = result.data as unknown;
    let summary = "";
    if (Array.isArray(raw) && typeof raw[0] === "string") {
      summary = raw[0].trim();
    } else if (typeof raw === "string") {
      summary = raw.trim();
    }

    if (!summary) {
      req.log.error({ raw }, "Empty summary returned by model");
      res.status(502).json({
        error: "empty_summary",
        message: "The model did not return a summary. Please try again.",
      });
      return;
    }

    if (format === "bullets") {
      summary = toBullets(summary);
    }

    const sourceWordCount = countWords(data.text);
    const summaryWordCount = countWords(summary);
    const compressionRatio =
      sourceWordCount > 0
        ? Number((summaryWordCount / sourceWordCount).toFixed(4))
        : 0;
    const durationMs = Date.now() - startedAt;

    const payload = SummarizeTextResponse.parse({
      summary,
      format,
      model,
      sourceWordCount,
      summaryWordCount,
      compressionRatio,
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
