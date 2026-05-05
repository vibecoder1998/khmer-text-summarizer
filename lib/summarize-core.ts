import { Client } from "@gradio/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type GradioModelId = "mt5-base" | "gemma-4-4b";
export type ModelId = GradioModelId | "gemini";
export type Format = "paragraph" | "bullets";
export type Length = "short" | "long";
export type SummarizeType = "general" | "meeting-minutes";

export const SPACES: Record<GradioModelId, string> = {
  "mt5-base": "lonewolf168/khmer-mt5-summarizer-demo",
  "gemma-4-4b": "lonewolf168/khmer-text-summarizer",
};

export const GEMINI_MODEL = "gemini-2.0-flash";

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function toBullets(text: string): string {
  const sentences = text
    .split(/(?<=[។?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length <= 1) return text;
  return sentences.map((s) => `- ${s}`).join("\n");
}

export function toMeetingMinutes(text: string, format: Format): string {
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
export function getGradioClient(model: GradioModelId): Promise<Client> {
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

export function buildGeminiPrompt(
  text: string,
  format: Format,
  length: Length,
  summarizeType: SummarizeType,
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

export function cleanGeminiMeetingOutput(text: string, summarizeType: string): string {
  if (summarizeType !== "meeting-minutes") return text;
  return text
    .replace(/\*+/g, "")
    .replace(/\([^)]*[a-zA-Z][^)]*\)/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getGeminiClient(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: GEMINI_MODEL });
}
