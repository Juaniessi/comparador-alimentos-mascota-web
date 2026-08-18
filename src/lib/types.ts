export type Especie = "Perro" | "Gato" | null;
export type Etapa = "Cachorro" | "Senior" | "Criador" | "Adulto" | null;

export type FilaNutribon = {
  proveedor: "Nutribon";
  marca: string;
  categoria: string;
  especie: Especie;
  etapa: Etapa;
  especieEtapaInferida: boolean;
  pctProteina: number | null;
  codigo: string;
  pesoUnitarioKg: number | null;
  unidadesPorBulto: number | null;
  precioListaPorBultoSinIva: number | null;
  precioListaPorUnidadSinIva: number | null;
  precioCosto: number | null;
  precioCostoPorKg: number | null;
};

export type FilaInsuga = {
  proveedor: "Insuga PetFood";
  lista: string;
  producto: string;
  grupo: string;
  tipo: string;
  especie: Especie;
  etapa: Etapa;
  especieEtapaInferida: boolean;
  pctProteina: number | null;
  pesoUnitarioKg: number | null;
  precioListaSinIva: number | null;
  precioCosto: number | null;
  precioCostoPorKg: number | null;
};

export type CriterioMatch = "Proteina" | "Especie+Etapa" | "Sin equivalente";

export type FilaComparativa = {
  criterioMatch: CriterioMatch;
  especie: Especie;
  pesoKg: number | null;
  nutribonMarca: string | null;
  nutribonCategoria: string | null;
  nutribonPctProteina: number | null;
  nutribonCodigo: string | null;
  nutribonCosto: number | null;
  nutribonCostoPorKg: number | null;
  insugaProducto: string | null;
  insugaPctProteina: number | null;
  insugaCosto: number | null;
  insugaCostoPorKg: number | null;
  diferenciaPorKg: number | null;
  diferenciaPct: number | null;
};

export type ResultadoInsuga = {
  filas: FilaInsuga[];
  avisoLista: string | null;
  numeroDetectado: number | null;
};
