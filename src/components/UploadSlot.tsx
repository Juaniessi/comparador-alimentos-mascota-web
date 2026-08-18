"use client";

import { useRef, useState } from "react";
import type { Proveedor } from "@/lib/proveedores";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadSlotProps = {
  proveedor: Proveedor;
  file: File | null;
  onFileSelected: (file: File) => void;
  onRemove: () => void;
};

export default function UploadSlot({
  proveedor,
  file,
  onFileSelected,
  onRemove,
}: UploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const procesarArchivo = (candidato: File | undefined) => {
    if (!candidato) return;
    const esPdf =
      candidato.type === "application/pdf" ||
      candidato.name.toLowerCase().endsWith(".pdf");
    if (!esPdf) {
      setError("Ese archivo no es un PDF. Probá con el PDF de la lista de precios.");
      return;
    }
    setError(null);
    onFileSelected(candidato);
  };

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="font-semibold text-slate-900">{proveedor.nombre}</h3>
        <p className="text-sm text-slate-500">{proveedor.descripcion}</p>
      </div>

      {file ? (
        <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-emerald-900">
              Archivo cargado: {file.name}
            </p>
            <p className="text-xs text-emerald-700">{formatBytes(file.size)}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
            >
              Reemplazar
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            procesarArchivo(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            arrastrando
              ? "border-slate-500 bg-slate-100"
              : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-slate-400"
          >
            <path d="M12 16V4m0 0L7 9m5-5l5 5" />
            <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
          </svg>
          <span className="text-sm text-slate-600">
            Arrastrá el PDF de {proveedor.nombre} acá, o hacé click para elegirlo
          </span>
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          procesarArchivo(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
