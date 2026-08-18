/**
 * Arma la tabla comparativa Nutribon vs Insuga.
 *
 * Criterio de match (en orden de preferencia):
 *   1) Misma especie + mismo % de proteína + mismo peso (kg)  -> "Proteina"
 *   2) Misma especie + misma etapa + mismo peso (kg)          -> "Especie+Etapa"
 * Si un producto no tiene equivalente del otro proveedor con el mismo peso,
 * igual aparece en la comparativa con las columnas del otro lado vacías.
 */
import type { FilaComparativa, FilaInsuga, FilaNutribon } from "./types";

function pesoKey(peso: number | null): number | null {
  if (peso === null) return null;
  return Math.round(peso);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function filaComparativa(
  n: FilaNutribon | null,
  i: FilaInsuga | null,
  criterio: FilaComparativa["criterioMatch"]
): FilaComparativa {
  const nCostoKg = n ? n.precioCostoPorKg : null;
  const iCostoKg = i ? i.precioCostoPorKg : null;

  let diferencia: number | null = null;
  let diferenciaPct: number | null = null;
  if (nCostoKg !== null && iCostoKg !== null) {
    diferencia = round2(nCostoKg - iCostoKg);
    if (iCostoKg) {
      diferenciaPct = Math.round((diferencia / iCostoKg) * 100 * 10) / 10;
    }
  }

  return {
    criterioMatch: criterio,
    especie: (n ?? i)!.especie,
    pesoKg: (n ?? i)!.pesoUnitarioKg,
    nutribonMarca: n ? n.marca : null,
    nutribonCategoria: n ? n.categoria : null,
    nutribonPctProteina: n ? n.pctProteina : null,
    nutribonCodigo: n ? n.codigo : null,
    nutribonCosto: n ? n.precioCosto : null,
    nutribonCostoPorKg: nCostoKg,
    insugaProducto: i ? i.producto : null,
    insugaPctProteina: i ? i.pctProteina : null,
    insugaCosto: i ? i.precioCosto : null,
    insugaCostoPorKg: iCostoKg,
    diferenciaPorKg: diferencia,
    diferenciaPct,
  };
}

export function armarComparativa(
  nutribonRows: FilaNutribon[],
  insugaRows: FilaInsuga[]
): FilaComparativa[] {
  const nUsados = new Set<number>();
  const iUsados = new Set<number>();
  const resultado: FilaComparativa[] = [];

  // 1) Match por % de proteína (cuando ambos lo tienen)
  nutribonRows.forEach((n, ni) => {
    if (n.pctProteina === null) return;
    insugaRows.forEach((i, ii) => {
      if (iUsados.has(ii) || nUsados.has(ni)) return;
      if (
        n.especie === i.especie &&
        i.pctProteina !== null &&
        n.pctProteina === i.pctProteina &&
        pesoKey(n.pesoUnitarioKg) === pesoKey(i.pesoUnitarioKg)
      ) {
        resultado.push(filaComparativa(n, i, "Proteina"));
        nUsados.add(ni);
        iUsados.add(ii);
      }
    });
  });

  // 2) Match por especie + etapa (fallback) para lo que quedó sin emparejar
  nutribonRows.forEach((n, ni) => {
    if (nUsados.has(ni) || !n.etapa) return;
    for (let ii = 0; ii < insugaRows.length; ii++) {
      if (iUsados.has(ii)) continue;
      const i = insugaRows[ii];
      if (
        n.especie === i.especie &&
        n.etapa === i.etapa &&
        pesoKey(n.pesoUnitarioKg) === pesoKey(i.pesoUnitarioKg)
      ) {
        resultado.push(filaComparativa(n, i, "Especie+Etapa"));
        nUsados.add(ni);
        iUsados.add(ii);
        break;
      }
    }
  });

  // 3) Lo que quedó sin pareja: se muestra igual, con el otro lado vacío
  nutribonRows.forEach((n, ni) => {
    if (!nUsados.has(ni)) resultado.push(filaComparativa(n, null, "Sin equivalente"));
  });
  insugaRows.forEach((i, ii) => {
    if (!iUsados.has(ii)) resultado.push(filaComparativa(null, i, "Sin equivalente"));
  });

  return resultado;
}
