type ExplicacionCostoProps = {
  pasos: string[];
  nota?: string;
  className?: string;
};

function ListaPasos({ pasos, nota }: { pasos: string[]; nota?: string }) {
  return (
    <>
      <ol className="space-y-2">
        {pasos.map((paso, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
              {i + 1}
            </span>
            <span>{paso}</span>
          </li>
        ))}
      </ol>
      {nota && <p className="mt-3 text-xs italic text-slate-400">{nota}</p>}
    </>
  );
}

/**
 * Siempre visible en pantallas sm+ (al costado del drag&drop); en mobile
 * queda plegada detrás de un <details> para no empujar el resto de la
 * pantalla (no hay forma de que un <details> esté cerrado en mobile y
 * forzado abierto en desktop solo con CSS, así que se renderiza dos veces
 * y cada versión se oculta en el breakpoint que no le corresponde).
 */
export default function ExplicacionCosto({ pasos, nota, className = "" }: ExplicacionCostoProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 ${className}`}
    >
      <details className="sm:hidden">
        <summary className="cursor-pointer font-medium text-slate-700">
          ¿Cómo se calcula el costo?
        </summary>
        <div className="mt-3">
          <ListaPasos pasos={pasos} nota={nota} />
        </div>
      </details>
      <div className="hidden sm:block">
        <p className="mb-3 font-medium text-slate-700">¿Cómo se calcula el costo?</p>
        <ListaPasos pasos={pasos} nota={nota} />
      </div>
    </div>
  );
}
