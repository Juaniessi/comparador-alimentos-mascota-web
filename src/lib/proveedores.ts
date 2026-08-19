import { INSUGA_PASOS, NOTA_REDONDEO, NUTRIBON_PASOS } from "./pricing";

// En GitHub Pages el sitio se sirve bajo /<repo>/, y next/image no le
// agrega ese prefijo solo a un src de texto plano cuando images.unoptimized
// está activado (sí lo hace automático con imports estáticos, pero no vale
// la pena mover los logos fuera de public/ solo por eso) — ver también
// pdfExtract.ts, mismo motivo para el worker de pdfjs.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type Proveedor = {
  id: string;
  nombre: string;
  descripcion: string;
  logo: string;
  logoWidth: number;
  logoHeight: number;
  /** Clase Tailwind de fondo para logos con letras claras / fondo transparente. */
  logoFondo?: string;
  pasosCosto: string[];
  notaCosto: string;
};

// Lista de proveedores que el sitio sabe pedir. Se amplía a mano cuando se
// suma un proveedor nuevo (y se conecta su lector correspondiente) — a
// propósito no es una lista "abierta", ver MEMORIA_PROYECTO.md del script
// original para el motivo.
export const PROVEEDORES: Proveedor[] = [
  {
    id: "nutribon",
    nombre: "Nutribon",
    descripcion: "Incluye nutribon, nutribon XQ y matute",
    logo: `${BASE_PATH}/logos/nutribon.png`,
    logoWidth: 161,
    logoHeight: 48,
    pasosCosto: NUTRIBON_PASOS,
    notaCosto: NOTA_REDONDEO,
  },
  {
    id: "insuga",
    nombre: "Insuga PetFood",
    descripcion: 'Lista "Puesto en Planta Puerto Tirol"',
    logo: `${BASE_PATH}/logos/insuga.png`,
    logoWidth: 998,
    logoHeight: 305,
    logoFondo: "bg-neutral-900",
    pasosCosto: INSUGA_PASOS,
    notaCosto: NOTA_REDONDEO,
  },
];
