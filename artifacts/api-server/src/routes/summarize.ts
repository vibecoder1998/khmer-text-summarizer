import { Router, type IRouter, type Request, type Response } from "express";
import { Client } from "@gradio/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SummarizeTextBody, SummarizeTextResponse } from "@workspace/api-zod";

const router: IRouter = Router();

type GradioModelId = "mt5-base" | "gemma-4-4b";
type ModelId = GradioModelId | "gemini";

const SPACES: Record<GradioModelId, string> = {
  "mt5-base": "lonewolf168/khmer-mt5-summarizer-demo",
  "gemma-4-4b": "lonewolf168/khmer-text-summarizer",
};

const GEMINI_MODEL = "gemini-2.0-flash";

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

function toMeetingMinutes(text: string, format: "paragraph" | "bullets"): string {
  const sentences = text
    .split(/(?<=[។?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const total = sentences.length;
  const q1 = Math.ceil(total * 0.4);
  const q2 = Math.ceil(total * 0.7);
  const q3 = Math.ceil(total * 0.85);

  const sections: [string, string[]][] = [
    ["ចំណុចពិភាក្សា", sentences.slice(0, q1)],
    ["សេចក្តីសម្រេចចិត្ត", sentences.slice(q1, q2)],
    ["ភារកិច្ចដែលត្រូវធ្វើ", sentences.slice(q2, q3)],
    ["ជំហានបន្ទាប់", sentences.slice(q3)],
  ].filter(([, items]) => (items as string[]).length > 0) as [string, string[]][];

  return sections
    .map(([heading, items]) => {
      const body =
        format === "bullets"
          ? (items as string[]).map((s) => `  - ${s}`).join("\n")
          : (items as string[]).join(" ");
      return `**${heading}**\n${body}`;
    })
    .join("\n\n");
}

const gradioCache = new Map<GradioModelId, Promise<Client>>();
function getGradioClient(model: GradioModelId): Promise<Client> {
  let p = gradioCache.get(model);
  if (!p) {
    p = Client.connect(SPACES[model]).catch((err) => {
      gradioCache.delete(model);
      throw err;
    });
    gradioCache.set(model, p);
  }
  return p;
}

function buildGeminiPrompt(
  text: string,
  format: "paragraph" | "bullets",
  length: "short" | "long",
  summarizeType: "general" | "meeting-minutes"
): string {
  const lengthInstruction =
    length === "short"
      ? "Keep the summary concise — around 100–150 words."
      : "Provide a detailed summary — around 300–400 words.";

  const formatInstruction =
    format === "bullets"
      ? "Format the output as a bullet list. Each bullet should be a clear, standalone point."
      : "Format the output as flowing paragraphs with no bullet points.";

  if (summarizeType === "meeting-minutes") {
    return `You are a professional meeting-minutes writer. Analyze the following text and produce structured meeting minutes entirely in Khmer.

Use exactly these section headings (Khmer only, no English translations or brackets):
- ចំណុចពិភាក្សា
- សេចក្តីសម្រេចចិត្ត
- ភារកិច្ចដែលត្រូវធ្វើ
- ជំហានបន្ទាប់

STRICT RULES:
- Write 100% in Khmer. Zero English words, zero English letters — not even in parentheses or brackets.
- Do NOT include any dates, metadata, or introductory lines unless they appear in the source text.
- Do NOT use any markdown formatting: no asterisks (*), no double asterisks (**), no hashes (#), no underscores.
- Section headings must appear on their own line as plain Khmer text followed by a colon.
- ${formatInstruction}
- ${lengthInstruction}

Text to process:
${text}`;
  }

  return `You are an expert Khmer-language summarizer. Summarize the following text accurately and naturally in Khmer.

${formatInstruction}
${lengthInstruction}
Write entirely in Khmer. Preserve the key facts, figures, and named entities from the source. Do not add information not present in the source text.

Text to summarize:
${text}`;
}

function cleanGeminiMeetingOutput(text: string, summarizeType: string): string {
  if (summarizeType !== "meeting-minutes") return text;
  return text
    .replace(/\*+/g, "")
    .replace(/\([^)]*[a-zA-Z][^)]*\)/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getGeminiClient(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: GEMINI_MODEL });
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
  const format = (data.format ?? "paragraph") as "paragraph" | "bullets";
  const length = (data.length ?? "short") as "short" | "long";
  const summarizeType = (data.summarizeType ?? "general") as "general" | "meeting-minutes";

  try {
    let summary = "";

    if (model === "mt5-base") {
      const client = await getGradioClient("mt5-base");
      const numBeams = data.numBeams ?? 4;
      const maxNewTokens = data.maxNewTokens ?? 256;
      const result = await client.predict("/summarize", {
        article: data.text,
        num_beams: numBeams,
        max_new_tokens: maxNewTokens,
      });
      const raw = result.data as unknown;
      if (Array.isArray(raw) && typeof raw[0] === "string") {
        summary = raw[0].trim();
      } else if (typeof raw === "string") {
        summary = (raw as string).trim();
      }
      if (summarizeType === "meeting-minutes") {
        summary = toMeetingMinutes(summary, format);
      } else if (format === "bullets") {
        summary = toBullets(summary);
      }
    } else if (model === "gemma-4-4b") {
      const client = await getGradioClient("gemma-4-4b");
      const maxLength = length === "short" ? 512 : 1024;
      const job = client.submit("/summarize", {
        text: data.text,
        max_length: maxLength,
      });
      for await (const output of job) {
        const raw = (output as { data: unknown }).data;
        if (Array.isArray(raw) && typeof raw[0] === "string") {
          summary = (raw[0] as string).trim();
        } else if (typeof raw === "string") {
          summary = (raw as string).trim();
        }
      }
    } else {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(503).json({
          error: "gemini_not_configured",
          message: "GEMINI_API_KEY is not set. Please add it in the project secrets.",
        });
        return;
      }
      const geminiModel = getGeminiClient(apiKey);
      const prompt = buildGeminiPrompt(data.text, format, length, summarizeType);
      const gemResult = await geminiModel.generateContent(prompt);
      summary = cleanGeminiMeetingOutput(gemResult.response.text().trim(), summarizeType);
    }

    if (!summary) {
      req.log.error({ model }, "Empty summary returned by model");
      res.status(502).json({
        error: "empty_summary",
        message: "The model did not return a summary. Please try again.",
      });
      return;
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

router.post("/summarize/stream", async (req: Request, res: Response) => {
  const startedAt = Date.now();

  const parseResult = SummarizeTextBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "invalid_request",
      message: parseResult.error.issues[0]?.message ?? "Invalid request body.",
    });
    return;
  }

  const data = parseResult.data;
  const model: ModelId = (data.model ?? "mt5-base") as ModelId;
  const format = (data.format ?? "paragraph") as "paragraph" | "bullets";
  const length = (data.length ?? "short") as "short" | "long";
  const summarizeType = (data.summarizeType ?? "general") as "general" | "meeting-minutes";

  if (model !== "gemma-4-4b" && model !== "gemini") {
    res.status(400).json({ error: "streaming_not_supported", message: "Streaming is only supported for gemma-4-4b and gemini." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (payload: object) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    let summary = "";

    if (model === "gemma-4-4b") {
      const client = await getGradioClient("gemma-4-4b");
      const maxLength = length === "short" ? 512 : 1024;
      const job = client.submit("/summarize", {
        text: data.text,
        max_length: maxLength,
      });
      for await (const output of job) {
        const raw = (output as { data: unknown }).data;
        if (Array.isArray(raw) && typeof raw[0] === "string") {
          summary = (raw[0] as string).trim();
          send({ chunk: summary });
        } else if (typeof raw === "string") {
          summary = (raw as string).trim();
          send({ chunk: summary });
        }
      }
    } else {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        send({ error: "gemini_not_configured", message: "GEMINI_API_KEY is not set." });
        res.end();
        return;
      }
      const geminiModel = getGeminiClient(apiKey);
      const prompt = buildGeminiPrompt(data.text, format, length, summarizeType);
      const streamResult = await geminiModel.generateContentStream(prompt);
      for await (const chunk of streamResult.stream) {
        summary += chunk.text();
        send({ chunk: cleanGeminiMeetingOutput(summary, summarizeType) });
      }
    }

    if (!summary) {
      send({ error: "empty_summary", message: "The model did not return a summary. Please try again." });
      res.end();
      return;
    }

    const sourceWordCount = countWords(data.text);
    const summaryWordCount = countWords(summary);
    const compressionRatio = sourceWordCount > 0 ? Number((summaryWordCount / sourceWordCount).toFixed(4)) : 0;
    const durationMs = Date.now() - startedAt;

    send({ done: true, summary, format, model, sourceWordCount, summaryWordCount, compressionRatio, durationMs });
    res.end();
  } catch (err) {
    req.log.error({ err }, "Streaming summarization failed");
    send({ error: "summarization_failed", message: err instanceof Error ? err.message : "Failed to generate a summary." });
    res.end();
  }
});

export default router;
