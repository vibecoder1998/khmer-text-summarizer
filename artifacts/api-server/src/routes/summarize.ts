import { Router, type IRouter, type Request, type Response } from "express";
import { SummarizeTextBody, SummarizeTextResponse } from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

type SummarizeBody = {
  text: string;
  length?: "short" | "medium" | "long";
  format?: "paragraph" | "bullets";
  tone?: "neutral" | "formal" | "casual" | "academic";
};

const MODEL = "claude-sonnet-4-6";

const LENGTH_GUIDANCE: Record<NonNullable<SummarizeBody["length"]>, string> = {
  short:
    "Aim for roughly 10-15% of the original length. Distill to the absolute essentials in 1-3 sentences (paragraph) or 2-3 bullets.",
  medium:
    "Aim for roughly 20-30% of the original length. Capture the main ideas and the most important supporting points in 4-6 sentences (paragraph) or 3-5 bullets.",
  long:
    "Aim for roughly 35-50% of the original length. Preserve nuance, key arguments, and important supporting details in 7-12 sentences (paragraph) or 5-8 bullets.",
};

const TONE_GUIDANCE: Record<NonNullable<SummarizeBody["tone"]>, string> = {
  neutral: "Use a clear, neutral, journalistic register.",
  formal:
    "Use a formal, professional register suitable for business or executive readers. Avoid contractions and colloquialisms.",
  casual:
    "Use a casual, friendly, conversational register. Plain language. Light contractions are fine.",
  academic:
    "Use a precise, academic register. Favor exact terminology, hedged claims where appropriate, and impersonal phrasing.",
};

function buildPrompt(body: Required<SummarizeBody>): string {
  const lengthGuidance = LENGTH_GUIDANCE[body.length];
  const toneGuidance = TONE_GUIDANCE[body.tone];
  const formatGuidance =
    body.format === "bullets"
      ? "Output the summary as a Markdown bullet list using `- ` for each bullet. Each bullet should be a complete, standalone idea. Do not include any heading, intro, or outro — only the bullet list."
      : "Output the summary as one or more flowing paragraphs of clean prose. Do not use bullet points, headings, or lists. Do not include an intro like 'Here is the summary' — just the summary itself.";

  return [
    "You are a precise text summarizer. Your job is to produce a faithful, well-written summary of the user's text.",
    "",
    "Rules:",
    "- Be faithful to the source. Do not invent facts, names, numbers, or claims that are not present in the text.",
    "- Preserve the original meaning, key arguments, and important entities.",
    "- Do not add commentary, opinion, or meta-text about the summarization process.",
    `- ${lengthGuidance}`,
    `- ${toneGuidance}`,
    `- ${formatGuidance}`,
    "- Write in the same language as the source text.",
    "",
    "Source text (delimited by <text> tags):",
    "<text>",
    body.text,
    "</text>",
    "",
    "Return only the summary. No preamble.",
  ].join("\n");
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
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

  const prompt = buildPrompt(body);

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const summary = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    if (!summary) {
      req.log.error({ message }, "Empty summary returned by model");
      res.status(500).json({
        error: "empty_summary",
        message: "The model did not return a summary. Please try again.",
      });
      return;
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
    const status =
      err && typeof err === "object" && "status" in err && typeof (err as { status: unknown }).status === "number"
        ? ((err as { status: number }).status >= 400 && (err as { status: number }).status < 600
          ? (err as { status: number }).status
          : 500)
        : 500;
    res.status(status).json({
      error: "summarization_failed",
      message:
        err instanceof Error
          ? err.message
          : "Failed to generate a summary. Please try again.",
    });
  }
});

export default router;
