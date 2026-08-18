/**
 * Fórmulas de precio de costo por proveedor. Cada paso se redondea a 2
 * decimales (validado contra los ejemplos del usuario: Nutribon 117007 ->
 * 1577 y Manada Adulto x 8kg -> 6552). Ver MEMORIA_PROYECTO.md del script
 * original para el detalle y la validación con el usuario.
 */

export const NUTRIBON_EXPLICACION =
  "Costo Nutribon = Precio lista por unidad (sin IVA)  x0,80 (-20%)  " +
  "x0,91 (-9%)  x1,105 (IVA 10,5%)  x0,97 (-3%).  Cada paso se redondea a 2 decimales.";

export const INSUGA_EXPLICACION =
  "Costo Insuga = Precio lista (sin IVA)  x0,75 (-25%, desc. por Equipo)  " +
  'x(10/11) si es Manada ["10+1"] o x(10/12) si es Seguidor ["10+2"]  ' +
  "x1,105 (IVA 10,5%)  x1,015 (+1,5%).  Cada paso se redondea a 2 decimales.";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function costoNutribon(precioUnidadSinIva: number | null): number | null {
  if (precioUnidadSinIva === null) return null;
  const p1 = round2(precioUnidadSinIva * 0.8);
  const p2 = round2(p1 * 0.91);
  const p3 = round2(p2 * 1.105);
  const p4 = round2(p3 * 0.97);
  return p4;
}

export function costoInsuga(precioListaSinIva: number | null, grupo: string | null): number | null {
  if (precioListaSinIva === null) return null;
  const grupoNorm = (grupo ?? "").trim().toLowerCase();
  let divisor: number;
  if (grupoNorm === "manada") divisor = 11;
  else if (grupoNorm === "seguidor") divisor = 12;
  else return null;

  const p1 = round2(precioListaSinIva * 0.75);
  const p2 = round2((p1 * 10) / divisor);
  const p3 = round2(p2 * 1.105);
  const p4 = round2(p3 * 1.015);
  return p4;
}

export function costoPorKg(costo: number | null, pesoKg: number | null): number | null {
  if (costo === null || !pesoKg) return null;
  return round2(costo / pesoKg);
}
