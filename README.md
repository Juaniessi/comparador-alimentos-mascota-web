# Comparador de precios — versión web

Versión web del [script de Python](../Comparador%20alimentos%20mascota/) que
compara precios de costo de alimento para mascotas entre proveedores. La
idea es que corra **100% en el navegador** (sin backend): subís los PDF,
se procesan ahí mismo, y descargás el Excel.

## Estado actual: solo la pantalla de carga

Por ahora **no hay procesamiento conectado**. Lo que existe es la pantalla
donde se sube un PDF por proveedor, con estado visual claro de "ya
cargado" (nombre, tamaño, reemplazar/quitar) y validación de que el
archivo sea un PDF. El botón "Generar comparativa" solo muestra un aviso
de que el procesamiento todavía no está implementado.

Se construyó así a propósito: primero validar que la experiencia de carga
sea clara y funcione bien, antes de portar toda la lógica de Python
(parseo de PDF, fórmulas de costo, comparativa) al navegador.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS.
- Todo client-side (`"use client"`) porque eventualmente todo el
  procesamiento va a correr en el navegador — no hay ni va a haber un
  backend propio.

## Estructura

- `src/lib/proveedores.ts` — lista de proveedores conocidos (hoy: Nutribon,
  Insuga PetFood). Agregar uno nuevo acá es el primer paso para sumarlo a
  la pantalla.
- `src/components/UploadSlot.tsx` — el cuadro de carga por proveedor
  (drag&drop + click, estado "ya cargado", reemplazar/quitar, validación
  de tipo de archivo).
- `src/app/page.tsx` — arma la pantalla con un `UploadSlot` por proveedor
  y el botón de generar (todavía sin conectar).

## Próximos pasos (no implementado todavía)

1. Correr Python en el navegador vía **Pyodide** (WebAssembly) para
   reutilizar tal cual la lógica ya escrita y probada en el script de
   Python (`parse_nutribon.py`, `parse_insuga.py`, `pricing.py`,
   `compare.py`, `build_excel.py`) en vez de reescribirla en JS.
2. Al tocar "Generar comparativa": pasarle los `File` subidos a Pyodide,
   correr el pipeline, y ofrecer el `.xlsx` resultante para descargar
   (con un blob URL, sin subir nada a ningún servidor).
3. Advertencia de carga inicial: Pyodide + las librerías Python (pdfplumber,
   pandas, openpyxl) pesan varios MB — la primera carga de la página va a
   tardar. El usuario ya confirmó que esto no es un problema.
4. Portar la función de detectar "carpeta sin parser" del script de Python:
   acá no hay carpetas, pero el equivalente sería permitir subir un PDF de
   un proveedor no listado en `proveedores.ts` y mostrar el mismo tipo de
   aviso en vez de fallar en silencio.
