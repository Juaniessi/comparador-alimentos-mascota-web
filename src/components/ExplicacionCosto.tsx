type ExplicacionCostoProps = {
  texto: string;
  className?: string;
};

/**
 * Siempre visible en pantallas sm+ (al costado del drag&drop); en mobile
 * queda plegada detrás de un <details> para no empujar el resto de la
 * pantalla (no hay forma de que un <details> esté cerrado en mobile y
 * forzado abierto en desktop solo con CSS, así que se renderiza dos veces
 * y cada versión se oculta en el breakpoint que no le corresponde).
 */
export default function ExplicacionCosto({ texto, className = "" }: ExplicacionCostoProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 ${className}`}
    >
      <details className="sm:hidden">
        <summary className="cursor-pointer font-medium text-slate-700">
          ¿Cómo se calcula el costo?
        </summary>
        <p className="mt-2">{texto}</p>
      </details>
      <div className="hidden sm:block">
        <p className="mb-1 font-medium text-slate-700">¿Cómo se calcula el costo?</p>
        <p>{texto}</p>
      </div>
    </div>
  );
}
