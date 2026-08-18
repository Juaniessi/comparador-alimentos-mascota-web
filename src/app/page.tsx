"use client";

import { useState } from "react";
import UploadSlot from "@/components/UploadSlot";
import { PROVEEDORES } from "@/lib/proveedores";

export default function Home() {
  const [archivos, setArchivos] = useState<Record<string, File | null>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cantidadCargados = Object.values(archivos).filter(Boolean).length;
  const hayAlguno = cantidadCargados > 0;

  const handleGenerar = () => {
    setMensaje(
      "El procesamiento todavía no está conectado en esta versión — por ahora esta pantalla solo valida la carga de archivos."
    );
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
          disabled={!hayAlguno}
          onClick={handleGenerar}
          className="rounded-xl bg-slate-900 px-5 py-2.5 font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Generar comparativa
        </button>
        {mensaje && (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {mensaje}
          </p>
        )}
      </section>
    </main>
  );
}
