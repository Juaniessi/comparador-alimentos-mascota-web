import type { Especie, Etapa } from "./types";

/** Parsea números en formato argentino: "." separador de miles, "," decimal. */
export function parseNumber(valor: string | null | undefined): number | null {
  if (valor == null) return null;
  let s = String(valor).replace(/\s/g, "").replace("$", "").trim();
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  } else {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const ESPECIE_KEYWORDS: [RegExp, Especie][] = [
  [/\bGATOS?\b/, "Gato"],
  [/\bPERROS?\b/, "Perro"],
];

const ETAPA_KEYWORDS: [RegExp, Etapa][] = [
  [/\bCACHORROS?\b/, "Cachorro"],
  [/\bSENIOR\b/, "Senior"],
  [/\bCRIADOR\b/, "Criador"],
  [/\bADULTOS?\b/, "Adulto"],
];

/** Busca especie/etapa por palabra clave en el texto. inferido=true si falta alguna. */
export function detectarEspecieEtapa(texto: string): {
  especie: Especie;
  etapa: Etapa;
  inferido: boolean;
} {
  const up = texto.toUpperCase();
  let especie: Especie = null;
  let etapa: Etapa = null;
  for (const [pat, val] of ESPECIE_KEYWORDS) {
    if (pat.test(up)) {
      especie = val;
      break;
    }
  }
  for (const [pat, val] of ETAPA_KEYWORDS) {
    if (pat.test(up)) {
      etapa = val;
      break;
    }
  }
  return { especie, etapa, inferido: especie === null || etapa === null };
}
