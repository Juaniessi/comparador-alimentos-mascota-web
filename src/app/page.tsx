"use client";

import { useState } from "react";
import UploadSlot from "@/components/UploadSlot";
import { PROVEEDORES } from "@/lib/proveedores";
import { parsearNutribon } from "@/lib/parseNutribon";
import { parsearInsuga } from "@/lib/parseInsuga";
import { costoInsuga, costoNutribon, costoPorKg } from "@/lib/pricing";
import { armarComparativa } from "@/lib/compare";
import { generarExcel } from "@/lib/buildExcel";
import type { FilaInsuga, FilaNutribon } from "@/lib/types";

type Estado = "idle" | "procesando" | "error";

export default function Home() {
  const [archivos, setArchivos] = useState<Record<string, File | null>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>("idle");

  const cantidadCargados = Object.values(archivos).filter(Boolean).length;
  const hayAlguno = cantidadCargados > 0;

  const handleGenerar = async () => {
    setEstado("procesando");
    setMensaje(null);
    try {
      let nutribonFilas: FilaNutribon[] = [];
      let insugaFilas: FilaInsuga[] = [];
      let avisoLista: string | null = null;

      const archivoNutribon = archivos["nutribon"];
      if (archivoNutribon) {
        nutribonFilas = await parsearNutribon(archivoNutribon);
        for (const f of nutribonFilas) {
          f.precioCosto = costoNutribon(f.precioListaPorUnidadSinIva);
          f.precioCostoPorKg = costoPorKg(f.precioCosto, f.pesoUnitarioKg);
        }
      }

      const archivoInsuga = archivos["insuga"];
      if (archivoInsuga) {
        const resultado = await parsearInsuga(archivoInsuga);
        insugaFilas = resultado.filas;
        avisoLista = resultado.avisoLista;
        for (const f of insugaFilas) {
          f.precioCosto = costoInsuga(f.precioListaSinIva, f.grupo);
          f.precioCostoPorKg = costoPorKg(f.precioCosto, f.pesoUnitarioKg);
        }
      }

      const comparativa = armarComparativa(nutribonFilas, insugaFilas);
      const blob = await generarExcel(nutribonFilas, insugaFilas, avisoLista, comparativa);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Comparativa_Precios_Costo.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setEstado("idle");
      setMensaje(
        `Comparativa generada: ${nutribonFilas.length} filas de Nutribon, ${insugaFilas.length} de Insuga, ${comparativa.length} en la hoja Comparativa.` +
          (avisoLista ? ` ${avisoLista}` : "")
      );
    } catch (err) {
      console.error(err);
      setEstado("error");
      setMensaje(
        `Ocurrió un error al procesar los PDF: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">
          Comparador de precios de costo
        </h1>
        <p className="text-slate-600">
          Subí la lista de precios en PDF de cada proveedor y generá la
          comparativa de costos. No hace falta subir todos: se procesa lo
          que hayas cargado.
        </p>
      </header>

      <section className="flex flex-col gap-6">
        {PROVEEDORES.map((proveedor) => (
          <UploadSlot
            key={proveedor.id}
            proveedor={proveedor}
            file={archivos[proveedor.id] ?? null}
            onFileSelected={(file) =>
              setArchivos((prev) => ({ ...prev, [proveedor.id]: file }))
            }
            onRemove={() =>
              setArchivos((prev) => ({ ...prev, [proveedor.id]: null }))
            }
          />
        ))}
      </section>

      <section className="flex flex-col items-start gap-3 border-t border-slate-200 pt-6">
        <p className="text-sm text-slate-500">
          {cantidadCargados} de {PROVEEDORES.length} proveedores cargados
        </p>
        <button
          type="button"
          disabled={!hayAlguno || estado === "procesando"}
          onClick={handleGenerar}
          className="rounded-xl bg-slate-900 px-5 py-2.5 font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {estado === "procesando" ? "Generando…" : "Generar comparativa"}
        </button>
        {mensaje && (
          <p
            className={`rounded-lg px-4 py-3 text-sm ${
              estado === "error"
                ? "bg-red-50 text-red-800"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {mensaje}
          </p>
        )}
      </section>
    </main>
  );
}
