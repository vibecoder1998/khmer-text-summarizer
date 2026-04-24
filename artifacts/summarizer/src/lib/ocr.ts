import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createWorker, type Worker } from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type ProgressFn = (info: { phase: string; progress: number }) => void;

let workerPromise: Promise<Worker> | null = null;

async function getKhmerWorker(onProgress?: ProgressFn): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("khm", 1, {
      logger: (m: { status: string; progress: number }) => {
        if (onProgress) onProgress({ phase: m.status, progress: m.progress ?? 0 });
      },
    }).catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

export async function ocrImage(file: File | Blob, onProgress?: ProgressFn): Promise<string> {
  const worker = await getKhmerWorker(onProgress);
  const url = URL.createObjectURL(file);
  try {
    const { data } = await worker.recognize(url);
    return (data.text ?? "").trim();
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function renderPdfPageToCanvas(
  page: pdfjsLib.PDFPageProxy,
  scale = 2,
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to acquire 2D context");
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}

export async function extractTextFromPdf(
  file: File,
  onProgress?: ProgressFn,
): Promise<string> {
  const buf = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buf });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  const textParts: string[] = [];
  let directTextChars = 0;

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.({ phase: `extracting page ${i}/${pageCount}`, progress: i / pageCount });
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) {
      textParts.push(pageText);
      directTextChars += pageText.length;
    }
  }

  const directText = textParts.join("\n\n").trim();
  const directTextDensity = pageCount > 0 ? directTextChars / pageCount : 0;

  if (directTextDensity >= 100) {
    return directText;
  }

  const ocrParts: string[] = directText ? [directText] : [];
  for (let i = 1; i <= pageCount; i++) {
    onProgress?.({ phase: `OCR page ${i}/${pageCount}`, progress: i / pageCount });
    const page = await pdf.getPage(i);
    const canvas = await renderPdfPageToCanvas(page, 2);
    const blob = await canvasToBlob(canvas);
    const text = await ocrImage(blob, (m) =>
      onProgress?.({ phase: `OCR page ${i}/${pageCount}: ${m.phase}`, progress: m.progress }),
    );
    if (text) ocrParts.push(text);
  }

  return ocrParts.join("\n\n").trim();
}
