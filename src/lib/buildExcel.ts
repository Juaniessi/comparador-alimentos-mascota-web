import ExcelJS from "exceljs";
import { NUTRIBON_EXPLICACION, INSUGA_EXPLICACION } from "./pricing";
import type { FilaComparativa, FilaInsuga, FilaNutribon } from "./types";

const ORANGE_NUTRIBON = "FFED7D31";
const GREEN_INSUGA = "FF538135";
const NEUTRAL_HEADER = "FF1F4E78";

const WHITE_BASE = "FFFFFFFF";
const WHITE_DARK = "FFCCCCCC";
const YELLOW_BASE = "FFFFF2CC";
const YELLOW_DARK = "FFCCC2A3";

const WARN_FILL = "FFFFC7CE";
const WARN_FONT_COLOR = "FF9C0006";

const MONEY_FORMAT = '"$" #,##0.00';
const PERCENT_FORMAT = "0%";
const PERCENT_DECIMAL_FORMAT = "0.0%";
const INT_FORMAT = "0";
const NUM_FORMAT = "0.##";

type TipoFormato = "money" | "percent" | "percent1" | "int" | "num";

type ColumnaDef<T> = {
  nombre: string;
  campo: keyof T;
  formato?: TipoFormato;
  colorHeader?: string;
};

function fill(color: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: color } };
}

function escribirTabla<T extends Record<string, unknown>>(
  ws: ExcelJS.Worksheet,
  startRow: number,
  columnas: ColumnaDef<T>[],
  filas: T[],
  opciones: {
    flagCampo?: keyof T;
    columnasBorde?: string[];
  } = {}
): number {
  columnas.forEach((col, idx) => {
    const cell = ws.getCell(startRow, idx + 1);
    cell.value = col.nombre;
    cell.fill = fill(col.colorHeader ?? NEUTRAL_HEADER);
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    cell.alignment = { wrapText: true, vertical: "middle" };
    ws.getColumn(idx + 1).width = 18;
  });

  filas.forEach((filaData, idx) => {
    const r = startRow + 1 + idx;
    const resaltar = Boolean(opciones.flagCampo && filaData[opciones.flagCampo]);
    const base = resaltar ? YELLOW_BASE : WHITE_BASE;
    const oscuro = resaltar ? YELLOW_DARK : WHITE_DARK;
    const colorFila = idx % 2 === 1 ? oscuro : base;

    columnas.forEach((col, idx2) => {
      let valor = filaData[col.campo] as unknown;
      if (col.formato === "percent" || col.formato === "percent1") {
        if (typeof valor === "number") valor = valor / 100;
      } else if (col.formato === "int") {
        if (valor !== null && valor !== undefined && valor !== "") {
          valor = Math.round(Number(valor));
        }
      }
      const cell = ws.getCell(r, idx2 + 1);
      cell.value = valor as ExcelJS.CellValue;
      cell.fill = fill(colorFila);
      if (col.formato === "money") cell.numFmt = MONEY_FORMAT;
      else if (col.formato === "percent") cell.numFmt = PERCENT_FORMAT;
      else if (col.formato === "percent1") cell.numFmt = PERCENT_DECIMAL_FORMAT;
      else if (col.formato === "int") cell.numFmt = INT_FORMAT;
      else if (col.formato === "num") cell.numFmt = NUM_FORMAT;
    });
  });

  ws.views = [{ state: "frozen", ySplit: startRow }];

  const lastRow = startRow + filas.length;
  const blackBorder: ExcelJS.Border = { style: "medium", color: { argb: "FF000000" } };
  for (const nombreBorde of opciones.columnasBorde ?? []) {
    const colIdx = columnas.findIndex((c) => c.nombre === nombreBorde);
    if (colIdx === -1) continue;
    for (let r = startRow; r <= lastRow; r++) {
      const cell = ws.getCell(r, colIdx + 1);
      cell.border = {
        left: blackBorder,
        right: blackBorder,
        top: r === startRow ? blackBorder : undefined,
        bottom: r === lastRow ? blackBorder : undefined,
      };
    }
  }

  return lastRow;
}

function hojaNutribon(wb: ExcelJS.Workbook, filas: FilaNutribon[]) {
  const ws = wb.addWorksheet("Nutribon");
  ws.getCell(1, 1).value = "Cálculo del precio de costo";
  ws.getCell(1, 1).font = { bold: true, size: 12 };
  ws.getCell(2, 1).value = NUTRIBON_EXPLICACION;
  ws.getCell(2, 1).font = { italic: true, color: { argb: "FF444444" } };
  ws.mergeCells(2, 1, 2, 8);
  ws.getCell(3, 1).value =
    "Filas resaltadas en amarillo: Especie y/o Etapa no venían explícitas en el nombre del producto; se infirieron.";
  ws.getCell(3, 1).font = { italic: true, color: { argb: "FF444444" } };

  const columnasBase: Omit<ColumnaDef<FilaNutribon>, "colorHeader">[] = [
    { nombre: "Marca", campo: "marca" },
    { nombre: "Categoria", campo: "categoria" },
    { nombre: "Especie", campo: "especie" },
    { nombre: "Etapa", campo: "etapa" },
    { nombre: "% Proteina", campo: "pctProteina", formato: "percent" },
    { nombre: "Codigo", campo: "codigo", formato: "int" },
    { nombre: "Peso unitario (kg)", campo: "pesoUnitarioKg", formato: "num" },
    { nombre: "Unidades por bulto", campo: "unidadesPorBulto", formato: "int" },
    { nombre: "Precio lista por unidad sin IVA", campo: "precioListaPorUnidadSinIva", formato: "money" },
    { nombre: "Precio costo", campo: "precioCosto", formato: "money" },
    { nombre: "Precio costo por kg", campo: "precioCostoPorKg", formato: "money" },
  ];
  const columnas: ColumnaDef<FilaNutribon>[] = columnasBase.map((c) => ({
    ...c,
    colorHeader: ORANGE_NUTRIBON,
  }));

  escribirTabla(ws, 4, columnas, filas, {
    flagCampo: "especieEtapaInferida",
    columnasBorde: ["Categoria"],
  });
}

function hojaInsuga(wb: ExcelJS.Workbook, filas: FilaInsuga[], avisoLista: string | null) {
  const ws = wb.addWorksheet("Insuga PetFood");
  let row = 1;
  if (avisoLista) {
    ws.getCell(row, 1).value = avisoLista;
    ws.getCell(row, 1).font = { bold: true, color: { argb: WARN_FONT_COLOR } };
    ws.getCell(row, 1).fill = fill(WARN_FILL);
    ws.mergeCells(row, 1, row, 8);
    row += 1;
  }

  ws.getCell(row, 1).value = "Cálculo del precio de costo";
  ws.getCell(row, 1).font = { bold: true, size: 12 };
  row += 1;
  ws.getCell(row, 1).value = INSUGA_EXPLICACION;
  ws.getCell(row, 1).font = { italic: true, color: { argb: "FF444444" } };
  ws.mergeCells(row, 1, row, 8);
  row += 1;
  ws.getCell(row, 1).value =
    "Filas resaltadas en amarillo: Especie y/o Etapa no venían explícitas en el nombre del producto; se infirieron.";
  ws.getCell(row, 1).font = { italic: true, color: { argb: "FF444444" } };
  row += 2;

  const columnasBase: Omit<ColumnaDef<FilaInsuga>, "colorHeader">[] = [
    { nombre: "Lista", campo: "lista" },
    { nombre: "Producto", campo: "producto" },
    { nombre: "Grupo", campo: "grupo" },
    { nombre: "Tipo", campo: "tipo" },
    { nombre: "Peso unitario (kg)", campo: "pesoUnitarioKg", formato: "num" },
    { nombre: "Especie", campo: "especie" },
    { nombre: "Etapa", campo: "etapa" },
    { nombre: "% Proteina", campo: "pctProteina", formato: "percent" },
    { nombre: "Precio lista sin IVA", campo: "precioListaSinIva", formato: "money" },
    { nombre: "Precio costo", campo: "precioCosto", formato: "money" },
    { nombre: "Precio costo por kg", campo: "precioCostoPorKg", formato: "money" },
  ];
  const columnas: ColumnaDef<FilaInsuga>[] = columnasBase.map((c) => ({
    ...c,
    colorHeader: GREEN_INSUGA,
  }));

  const filaTabla = row;
  const ultima = escribirTabla(ws, filaTabla, columnas, filas, {
    flagCampo: "especieEtapaInferida",
    columnasBorde: ["Producto"],
  });

  if (avisoLista) {
    const colIdx: Record<string, number> = {};
    columnas.forEach((c, i) => (colIdx[c.nombre] = i + 1));
    for (let r = filaTabla + 1; r <= ultima; r++) {
      for (const nombre of ["Precio lista sin IVA", "Precio costo", "Precio costo por kg"]) {
        ws.getCell(r, colIdx[nombre]).font = { color: { argb: "FFCC0000" }, bold: true };
      }
    }
  }
}

function hojaComparativa(wb: ExcelJS.Workbook, filasComp: FilaComparativa[]) {
  const ws = wb.addWorksheet("Comparativa");
  ws.getCell(1, 1).value = "Comparativa de precio de costo por kg — Nutribon vs Insuga PetFood";
  ws.getCell(1, 1).font = { bold: true, size: 12 };
  ws.getCell(2, 1).value =
    "Se empareja primero por % de proteína + peso; si algún producto no tiene % " +
    "informado se empareja por especie+etapa (ej. Cachorro) + peso. " +
    'Filas con "Sin equivalente" no tienen contraparte del mismo peso en el otro proveedor.';
  ws.getCell(2, 1).font = { italic: true, color: { argb: "FF444444" } };
  ws.mergeCells(2, 1, 2, 8);

  const columnasBase: ColumnaDef<FilaComparativa>[] = [
    { nombre: "Criterio de match", campo: "criterioMatch" },
    { nombre: "Especie", campo: "especie" },
    { nombre: "Peso (kg)", campo: "pesoKg", formato: "num" },
    { nombre: "Nutribon - Marca", campo: "nutribonMarca" },
    { nombre: "Nutribon - Categoria", campo: "nutribonCategoria" },
    { nombre: "Nutribon - % Proteina", campo: "nutribonPctProteina", formato: "percent" },
    { nombre: "Nutribon - Codigo", campo: "nutribonCodigo", formato: "int" },
    { nombre: "Nutribon - Costo", campo: "nutribonCosto", formato: "money" },
    { nombre: "Nutribon - Costo x kg", campo: "nutribonCostoPorKg", formato: "money" },
    { nombre: "Insuga - Producto", campo: "insugaProducto" },
    { nombre: "Insuga - % Proteina", campo: "insugaPctProteina", formato: "percent" },
    { nombre: "Insuga - Costo", campo: "insugaCosto", formato: "money" },
    { nombre: "Insuga - Costo x kg", campo: "insugaCostoPorKg", formato: "money" },
    { nombre: "Diferencia $/kg (Nutribon - Insuga)", campo: "diferenciaPorKg", formato: "money" },
    { nombre: "Diferencia % (vs Insuga)", campo: "diferenciaPct", formato: "percent1" },
  ];
  const nutribonCols = new Set(columnasBase.slice(3, 9).map((c) => c.nombre));
  const insugaCols = new Set(columnasBase.slice(9, 13).map((c) => c.nombre));
  const columnas = columnasBase.map((c) => ({
    ...c,
    colorHeader: nutribonCols.has(c.nombre)
      ? ORANGE_NUTRIBON
      : insugaCols.has(c.nombre)
        ? GREEN_INSUGA
        : NEUTRAL_HEADER,
  }));

  const filasMarcadas = filasComp.map((f) => ({
    ...f,
    _sinEquiv: f.criterioMatch === "Sin equivalente",
  }));

  escribirTabla(ws, 4, columnas, filasMarcadas, {
    flagCampo: "_sinEquiv" as keyof FilaComparativa,
    columnasBorde: ["Nutribon - Categoria", "Insuga - Producto"],
  });
}

function hojaPendiente(wb: ExcelJS.Workbook, nombreCarpeta: string, usados: Set<string>) {
  const invalidos = new Set(["[", "]", ":", "*", "?", "/", "\\"]);
  let limpio =
    [...nombreCarpeta].filter((c) => !invalidos.has(c)).join("").trim() || "Proveedor";
  limpio = limpio.slice(0, 31);
  const base = limpio;
  let i = 2;
  while (usados.has(limpio)) {
    const sufijo = ` (${i})`;
    limpio = base.slice(0, 31 - sufijo.length) + sufijo;
    i += 1;
  }
  usados.add(limpio);

  const ws = wb.addWorksheet(limpio);
  ws.getCell(1, 1).value = `Carpeta "${nombreCarpeta}"`;
  ws.getCell(1, 1).font = { bold: true, size: 12 };
  const cell = ws.getCell(2, 1);
  cell.value =
    `No se encontro un lector (parser) definido para la carpeta "${nombreCarpeta}". ` +
    "No se realizaron tareas para este proveedor todavia — hay que programar como leer sus PDF.";
  cell.font = { bold: true, color: { argb: WARN_FONT_COLOR } };
  cell.fill = fill(WARN_FILL);
  cell.alignment = { wrapText: true, vertical: "top" };
  ws.getColumn(1).width = 100;
  ws.getRow(2).height = 30;
}

export async function generarExcel(
  nutribonFilas: FilaNutribon[],
  insugaFilas: FilaInsuga[],
  avisoLista: string | null,
  comparativaFilas: FilaComparativa[],
  carpetasSinParser: string[] = []
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const usados = new Set(["Nutribon", "Insuga PetFood", "Comparativa"]);
  hojaNutribon(wb, nutribonFilas);
  hojaInsuga(wb, insugaFilas, avisoLista);
  hojaComparativa(wb, comparativaFilas);
  for (const nombreCarpeta of carpetasSinParser) {
    hojaPendiente(wb, nombreCarpeta, usados);
  }
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
