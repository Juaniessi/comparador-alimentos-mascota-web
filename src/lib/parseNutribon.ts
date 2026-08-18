/**
 * Parser de listas de precios Nutribon (nutribon / nutribon XQ / matute).
 *
 * El PDF de origen es una tabla con bordes reales (a diferencia de Insuga).
 * pdf.js no expone detección de tablas como pdfplumber, así que replicamos
 * lo mismo que hacía extract_tables() + forward-fill del merge de la celda
 * PRODUCTO, pero a partir de las líneas de borde reales dibujadas en el PDF:
 * las líneas horizontales que "cruzan" hacia la columna PRODUCTO marcan el
 * límite real de cada celda combinada; las filas de datos entre dos límites
 * consecutivos comparten la misma categoría. Puerto de parse_nutribon.py —
 * ver MEMORIA_PROYECTO.md del script original para el detalle del formato.
 */
import { extraerPdf, type PdfPageData, type PdfWord } from "./pdfExtract";
import { detectarEspecieEtapa, parseNumber } from "./numeroArgentino";
import type { FilaNutribon } from "./types";

// Límites de columna (x0), determinados a partir del layout del PDF: PRODUCTO
// (celda combinada) | CÓDIGO | PESO UNITARIO | UNIDADES POR BULTO |
// PRECIO LISTA POR BULTO | PRECIO LISTA POR UNIDAD.
const X_CATEGORIA_MAX = 100;
const X_CODIGO_MAX = 160;
const X_PESO_MAX = 210;
const X_UNIDADES_MAX = 260;
const X_BULTO_MAX = 320;

// Las líneas de borde que delimitan una celda PRODUCTO combinada arrancan
// bien a la izquierda (dentro de esa columna); las que solo separan filas de
// datos empiezan recién en la columna CÓDIGO.
const X_LINEA_CATEGORIA_MAX = 50;
const TOLERANCIA_CLUSTER_LINEA = 3;

const PROTEINA_RE = /(\d{1,2})\s*%\s*PROTEINAS?/i;

function limpiarCategoria(texto: string): string {
  const sinProteina = texto.replace(PROTEINA_RE, " ");
  return sinProteina.replace(/\s+/g, " ").trim();
}

function clusterizarLimites(tops: number[], tolerancia: number): number[] {
  const ordenados = [...tops].sort((a, b) => a - b);
  const grupos: number[][] = [];
  for (const t of ordenados) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && t - ultimo[ultimo.length - 1] <= tolerancia) {
      ultimo.push(t);
    } else {
      grupos.push([t]);
    }
  }
  return grupos.map((g) => g.reduce((a, b) => a + b, 0) / g.length);
}

function limitesCategoria(pagina: PdfPageData): number[] {
  const tops = pagina.horizLines
    .filter((l) => l.x0 < X_LINEA_CATEGORIA_MAX && l.x1 - l.x0 > 20)
    .map((l) => l.top);
  return clusterizarLimites(tops, TOLERANCIA_CLUSTER_LINEA);
}

function textoCategoriaParaFila(
  palabrasCategoria: PdfWord[],
  limites: number[],
  filaTop: number
): string {
  let lo = -Infinity;
  let hi = Infinity;
  for (const l of limites) {
    if (l <= filaTop && l > lo) lo = l;
    if (l > filaTop && l < hi) hi = l;
  }
  return palabrasCategoria
    .filter((w) => w.top > lo && w.top < hi)
    .sort((a, b) => a.top - b.top || a.x0 - b.x0)
    .map((w) => w.text)
    .join(" ");
}

function tomarUnaColumna(palabras: PdfWord[], filaTop: number, tolerancia = 2): string {
  return palabras
    .filter((w) => Math.abs(w.top - filaTop) <= tolerancia)
    .sort((a, b) => a.x0 - b.x0)
    .map((w) => w.text)
    .join("");
}

function marcasDePagina(cantidadHeaders: number, esPaginaMatute: boolean): string[] {
  if (esPaginaMatute) return ["Matute"];
  if (cantidadHeaders >= 2) return ["Nutribon", "Nutribon XQ"];
  return ["Nutribon"];
}

function procesarPagina(pagina: PdfPageData, esPaginaMatute: boolean): FilaNutribon[] {
  const headers = pagina.words
    .filter((w) => w.text === "PRODUCTO" && w.x0 < 60)
    .sort((a, b) => a.top - b.top);
  if (headers.length === 0) return [];

  const marcas = marcasDePagina(headers.length, esPaginaMatute);
  const limites = limitesCategoria(pagina);
  const categoriaWords = pagina.words.filter((w) => w.x0 < X_CATEGORIA_MAX);
  const codigoWords = pagina.words.filter(
    (w) => w.x0 >= X_CATEGORIA_MAX && w.x0 < X_CODIGO_MAX && /^\d+$/.test(w.text)
  );
  const pesoWords = pagina.words.filter((w) => w.x0 >= X_CODIGO_MAX && w.x0 < X_PESO_MAX);
  const unidadesWords = pagina.words.filter((w) => w.x0 >= X_PESO_MAX && w.x0 < X_UNIDADES_MAX);
  const bultoWords = pagina.words.filter((w) => w.x0 >= X_UNIDADES_MAX && w.x0 < X_BULTO_MAX);
  const unidadPrecioWords = pagina.words.filter((w) => w.x0 >= X_BULTO_MAX);

  const filas: FilaNutribon[] = [];
  for (const codigoWord of codigoWords) {
    const filaTop = codigoWord.top;

    let marca = marcas[marcas.length - 1];
    for (let i = headers.length - 1; i >= 0; i--) {
      if (filaTop > headers[i].top) {
        marca = marcas[Math.min(i, marcas.length - 1)];
        break;
      }
    }

    const categoriaCruda = textoCategoriaParaFila(categoriaWords, limites, filaTop);
    const categoriaLimpia = limpiarCategoria(categoriaCruda);
    const m = PROTEINA_RE.exec(categoriaCruda);
    const pctProteina = m ? Number(m[1]) : null;

    const deteccion = detectarEspecieEtapa(categoriaLimpia);
    const { etapa, inferido } = deteccion;
    let especie = deteccion.especie;
    if (especie === null) {
      // Nombres de línea de Matute sin palabra clave explícita de especie:
      // se infieren por convención de nombres (Perro), salvo TUTE ("Gato",
      // ya detectado por palabra clave explícita más arriba).
      const catUp = categoriaLimpia.toUpperCase();
      if (catUp.includes("RAZA") || catUp.includes("TITO") || catUp.includes("DUKE")) {
        especie = "Perro";
      }
    }

    const peso = parseNumber(tomarUnaColumna(pesoWords, filaTop));
    const unidadesBulto = parseNumber(tomarUnaColumna(unidadesWords, filaTop));
    const precioBulto = parseNumber(tomarUnaColumna(bultoWords, filaTop));
    const precioUnidad = parseNumber(tomarUnaColumna(unidadPrecioWords, filaTop));

    filas.push({
      proveedor: "Nutribon",
      marca,
      categoria: categoriaLimpia,
      especie,
      etapa,
      especieEtapaInferida: inferido,
      pctProteina,
      codigo: codigoWord.text,
      pesoUnitarioKg: peso,
      unidadesPorBulto: unidadesBulto,
      precioListaPorBultoSinIva: precioBulto,
      precioListaPorUnidadSinIva: precioUnidad,
      precioCosto: null,
      precioCostoPorKg: null,
    });
  }
  return filas;
}

export async function parsearNutribon(file: File): Promise<FilaNutribon[]> {
  const paginas = await extraerPdf(file);
  const filas: FilaNutribon[] = [];
  paginas.forEach((pagina, idx) => {
    // página 1 -> Nutribon / Nutribon XQ; página 2 en adelante -> Matute.
    filas.push(...procesarPagina(pagina, idx > 0));
  });
  return filas;
}
