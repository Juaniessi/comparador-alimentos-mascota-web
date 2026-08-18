/**
 * Parser de la lista de precios Insuga PetFood ("Puesto en Planta Puerto
 * Tirol"). El PDF no tiene bordes de tabla: el texto está solo posicionado
 * por columnas (x0). Se reconstruyen las filas agrupando palabras por
 * cercanía vertical ("clustering" por la columna de PRODUCTO, la más ancha)
 * y luego se asigna cada token de % y $ a la fila de producto más cercana.
 * Puerto directo de parse_insuga.py — ver MEMORIA_PROYECTO.md del script
 * original.
 */
import { clusterPorFila, extraerPdf, type PdfWord } from "./pdfExtract";
import { detectarEspecieEtapa, parseNumber } from "./numeroArgentino";
import type { FilaInsuga, ResultadoInsuga } from "./types";

const LISTA_ESPERADA = 301;

const X_PRODUCTO_MAX = 370;
const X_PORCENTAJE_MAX = 460;
const GAP_NUEVA_FILA = 25;
const TOP_MIN = 130;
const TOP_MAX = 650;

const PESO_RE = /(\d+(?:[.,]\d+)?)\s*kg/i;

function detectarNumeroLista(words: PdfWord[]): number | null {
  if (words.length === 0) return null;
  const minTop = Math.min(...words.map((w) => w.top));
  const primeraLinea = words
    .filter((w) => w.top <= minTop + 3)
    .sort((a, b) => a.x0 - b.x0)
    .map((w) => w.text)
    .join(" ");
  const m = /N.?\s*(\d+)/.exec(primeraLinea);
  return m ? Number(m[1]) : null;
}

function asignarAFila(word: PdfWord, rangos: [number, number][]): number | null {
  let mejorI: number | null = null;
  let mejorD = Infinity;
  rangos.forEach(([lo, hi], i) => {
    let d: number;
    if (lo - 15 <= word.top && word.top <= hi + 5) {
      d = 0;
    } else {
      d = Math.min(Math.abs(word.top - lo), Math.abs(word.top - hi));
    }
    if (d < mejorD) {
      mejorD = d;
      mejorI = i;
    }
  });
  return mejorI;
}

function separarProducto(texto: string): { grupo: string; tipo: string; peso: number | null } {
  const m = PESO_RE.exec(texto);
  const peso = m ? parseNumber(m[1]) : null;
  let resto = m ? texto.slice(0, m.index) : texto;
  resto = resto.replace(/\bx\.?\s*$/i, "").trim();
  resto = resto.replace(/\.+$/, "").trim();
  const partes = resto.split(/\s+([\s\S]*)/).filter((p) => p !== undefined);
  const grupo = partes[0] ?? resto;
  const tipo = partes[1] ?? "";
  return { grupo, tipo, peso };
}

export async function parsearInsuga(file: File): Promise<ResultadoInsuga> {
  const paginas = await extraerPdf(file);
  const filas: FilaInsuga[] = [];

  const numeroDetectado = paginas.length > 0 ? detectarNumeroLista(paginas[0].words) : null;
  let avisoLista: string | null = null;
  if (numeroDetectado !== LISTA_ESPERADA) {
    avisoLista =
      `ATENCION: se esperaba la Lista ${LISTA_ESPERADA} y el PDF ` +
      `dice Lista ${numeroDetectado}. Los precios de este archivo ` +
      `pueden no corresponder a la fórmula validada.`;
  }
  const lista = numeroDetectado ? `L${numeroDetectado}` : "L?";

  for (const pagina of paginas) {
    const dataWords = pagina.words.filter((w) => w.top > TOP_MIN && w.top < TOP_MAX);
    const prodWords = dataWords.filter((w) => w.x0 < X_PRODUCTO_MAX);
    const porcWords = dataWords.filter((w) => w.x0 >= X_PRODUCTO_MAX && w.x0 < X_PORCENTAJE_MAX);
    const precioWords = dataWords.filter((w) => w.x0 >= X_PORCENTAJE_MAX);

    const prodClusters = clusterPorFila(prodWords, GAP_NUEVA_FILA);
    const rangos: [number, number][] = prodClusters.map((c) => [
      Math.min(...c.map((w) => w.top)),
      Math.max(...c.map((w) => w.top)),
    ]);

    const porcPorFila = new Map<number, string[]>();
    for (const w of porcWords) {
      const i = asignarAFila(w, rangos);
      if (i === null) continue;
      if (!porcPorFila.has(i)) porcPorFila.set(i, []);
      porcPorFila.get(i)!.push(w.text);
    }

    const precioPorFila = new Map<number, string[]>();
    for (const w of precioWords) {
      const i = asignarAFila(w, rangos);
      if (i === null) continue;
      if (!precioPorFila.has(i)) precioPorFila.set(i, []);
      precioPorFila.get(i)!.push(w.text);
    }

    prodClusters.forEach((cluster, i) => {
      const texto = [...cluster]
        .sort((a, b) => a.top - b.top || a.x0 - b.x0)
        .map((w) => w.text)
        .join(" ");
      const pctTxt = (porcPorFila.get(i) ?? []).join("");
      const precioTxt = (precioPorFila.get(i) ?? []).join(" ");

      const pct = parseNumber(pctTxt.replace("%", ""));
      const precio = parseNumber(precioTxt.replace("$", ""));
      const { grupo, tipo, peso } = separarProducto(texto);

      const deteccion = detectarEspecieEtapa(`${grupo} ${tipo}`);
      const { etapa, inferido } = deteccion;
      let especie = deteccion.especie;
      if (especie === null) {
        // Esta lista de Insuga es exclusivamente de perros (Seguidor/Manada).
        especie = "Perro";
      }

      filas.push({
        proveedor: "Insuga PetFood",
        lista,
        producto: texto,
        grupo,
        tipo,
        especie,
        etapa,
        especieEtapaInferida: inferido,
        pctProteina: pct,
        pesoUnitarioKg: peso,
        precioListaSinIva: precio,
        precioCosto: null,
        precioCostoPorKg: null,
      });
    });
  }

  return { filas, avisoLista, numeroDetectado };
}
