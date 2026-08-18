import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

let workerConfigured = false;

function configurarWorker() {
  if (workerConfigured || typeof window === "undefined") return;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${basePath}/pdf.worker.min.mjs`;
  workerConfigured = true;
}

export type PdfWord = { x0: number; top: number; width: number; text: string };
export type PdfLine = { x0: number; x1: number; top: number };

export type PdfPageData = {
  width: number;
  height: number;
  words: PdfWord[];
  horizLines: PdfLine[];
};

// Códigos de los sub-comandos de trazado empaquetados dentro del buffer de
// constructPath (ver pdf.worker.mjs — no exportados públicamente por pdfjs-dist).
const DRAW_MOVE_TO = 0;
const DRAW_LINE_TO = 1;
const DRAW_CURVE_TO = 2;
const DRAW_QUADRATIC_CURVE_TO = 3;
const DRAW_CLOSE_PATH = 4;

function extraerLineasHorizontales(
  fnArray: number[],
  argsArray: unknown[][],
  pageHeight: number
): PdfLine[] {
  const horiz: PdfLine[] = [];
  const constructPathOp = pdfjsLib.OPS.constructPath;

  for (let i = 0; i < fnArray.length; i++) {
    if (fnArray[i] !== constructPathOp) continue;
    const args = argsArray[i] as [number, [Float32Array | null], unknown];
    const buf = args[1]?.[0];
    if (!buf) continue;

    let x = 0;
    let y = 0;
    let startX = 0;
    let startY = 0;
    let j = 0;
    while (j < buf.length) {
      const op = buf[j];
      if (op === DRAW_MOVE_TO) {
        x = buf[j + 1];
        y = buf[j + 2];
        startX = x;
        startY = y;
        j += 3;
      } else if (op === DRAW_LINE_TO) {
        const nx = buf[j + 1];
        const ny = buf[j + 2];
        if (Math.abs(ny - y) < 0.05 && Math.abs(nx - x) > 1) {
          horiz.push({ x0: Math.min(x, nx), x1: Math.max(x, nx), top: pageHeight - y });
        }
        x = nx;
        y = ny;
        j += 3;
      } else if (op === DRAW_CURVE_TO) {
        x = buf[j + 5];
        y = buf[j + 6];
        j += 7;
      } else if (op === DRAW_QUADRATIC_CURVE_TO) {
        x = buf[j + 3];
        y = buf[j + 4];
        j += 5;
      } else if (op === DRAW_CLOSE_PATH) {
        x = startX;
        y = startY;
        j += 1;
      } else {
        break;
      }
    }
  }
  return horiz;
}

export async function extraerPdf(file: File): Promise<PdfPageData[]> {
  configurarWorker();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;

  const paginas: PdfPageData[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const [content, opList] = await Promise.all([page.getTextContent(), page.getOperatorList()]);

    const words: PdfWord[] = content.items
      .filter((it): it is TextItem => "transform" in it && it.str.trim() !== "")
      .map((it) => ({
        x0: it.transform[4],
        top: viewport.height - it.transform[5],
        width: it.width,
        text: it.str,
      }));

    const horizLines = extraerLineasHorizontales(
      opList.fnArray,
      opList.argsArray as unknown[][],
      viewport.height
    );

    paginas.push({ width: viewport.width, height: viewport.height, words, horizLines });
  }
  return paginas;
}

/** Agrupa items (ya ordenados o no) por cercanía vertical de 'top'. */
export function clusterPorFila<T extends { top: number }>(items: T[], gap: number): T[][] {
  const ordenados = [...items].sort((a, b) => a.top - b.top);
  const clusters: T[][] = [];
  let actual: T[] = [];
  let topAnterior: number | null = null;
  for (const it of ordenados) {
    if (topAnterior !== null && it.top - topAnterior > gap) {
      clusters.push(actual);
      actual = [];
    }
    actual.push(it);
    topAnterior = it.top;
  }
  if (actual.length) clusters.push(actual);
  return clusters;
}
