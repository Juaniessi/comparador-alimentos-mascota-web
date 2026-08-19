import { INSUGA_PASOS, NOTA_REDONDEO, NUTRIBON_PASOS } from "./pricing";

export type Proveedor = {
  id: string;
  nombre: string;
  descripcion: string;
  logo: string;
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
    logo: "/logos/nutribon.png",
    pasosCosto: NUTRIBON_PASOS,
    notaCosto: NOTA_REDONDEO,
  },
  {
    id: "insuga",
    nombre: "Insuga PetFood",
    descripcion: 'Lista "Puesto en Planta Puerto Tirol"',
    logo: "/logos/insuga.png",
    logoFondo: "bg-neutral-900",
    pasosCosto: INSUGA_PASOS,
    notaCosto: NOTA_REDONDEO,
  },
];
