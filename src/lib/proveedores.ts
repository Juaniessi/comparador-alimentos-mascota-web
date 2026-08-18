export type Proveedor = {
  id: string;
  nombre: string;
  descripcion: string;
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
  },
  {
    id: "insuga",
    nombre: "Insuga PetFood",
    descripcion: 'Lista "Puesto en Planta Puerto Tirol"',
  },
];
