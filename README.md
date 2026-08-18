# Comparador de precios — versión web

**Sitio publicado:** https://juaniessi.github.io/comparador-alimentos-mascota-web/

Versión web del [script de Python](../Comparador%20alimentos%20mascota/) que
compara precios de costo de alimento para mascotas entre proveedores. La
idea es que corra **100% en el navegador** (sin backend): subís los PDF,
se procesan ahí mismo, y descargás el Excel.

## Estado actual: funcionando de punta a punta

Se sube un PDF por proveedor (con estado visual de "ya cargado", nombre,
tamaño, reemplazar/quitar, y validación de que sea un PDF), y al tocar
"Generar comparativa" se parsean los PDF, se calcula el precio de costo de
cada uno, se arma la hoja Comparativa y se descarga el `.xlsx` — todo en el
navegador, sin subir nada a ningún servidor. No hace falta cargar los dos
proveedores: se procesa lo que se haya subido.

La lógica de negocio (parseo de cada PDF, fórmulas de costo por proveedor,
matching de la Comparativa, formato del Excel) es un puerto directo del
[script de Python](../Comparador%20alimentos%20mascota/) original — mismas
fórmulas, mismo criterio de matching, mismo formato de hoja. Está validado
contra los PDF de muestra: los precios de costo coinciden con los que ya
se habían confirmado a mano (código 117007 → $1577,01; Manada Adulto x
8kg → $6552,04).

## Cómo correrlo

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS, exportado como sitio
  estático (`output: "export"`) y publicado en GitHub Pages vía GitHub
  Actions (`.github/workflows/deploy.yml`).
- Todo client-side (`"use client"`): no hay ni va a haber backend propio.
- [`pdfjs-dist`](https://www.npmjs.com/package/pdfjs-dist) para leer los PDF
  en el navegador (texto posicionado + líneas de borde reales, para
  reconstruir tablas con celdas combinadas) y
  [`exceljs`](https://www.npmjs.com/package/exceljs) para generar el
  `.xlsx` con el mismo formato que el script original.

## Estructura

- `src/lib/proveedores.ts` — lista de proveedores conocidos (hoy: Nutribon,
  Insuga PetFood). Agregar uno nuevo acá es el primer paso para sumarlo a
  la pantalla (además de escribir su parser, ver abajo).
- `src/components/UploadSlot.tsx` — el cuadro de carga por proveedor
  (drag&drop + click, estado "ya cargado", reemplazar/quitar, validación
  de tipo de archivo).
- `src/app/page.tsx` — arma la pantalla, dispara el pipeline al tocar
  "Generar comparativa" y gatilla la descarga del Excel resultante.
- `src/lib/pdfExtract.ts` — wrapper de pdfjs-dist: extrae por página las
  palabras posicionadas (x/y) y las líneas horizontales reales del PDF.
- `src/lib/parseNutribon.ts` / `src/lib/parseInsuga.ts` — un parser por
  proveedor, puerto directo de `parse_nutribon.py` / `parse_insuga.py`.
- `src/lib/pricing.ts` — fórmulas de precio de costo por proveedor, puerto
  directo de `pricing.py`.
- `src/lib/compare.ts` — arma la hoja Comparativa, puerto directo de
  `compare.py`.
- `src/lib/buildExcel.ts` — genera el `.xlsx` con exceljs, puerto directo
  de `build_excel.py`.
- `scripts/copy-pdf-worker.mjs` — copia el worker de pdfjs-dist a
  `public/` (se corre solo, ver `predev`/`prebuild`/`postinstall` en
  `package.json`); ese archivo no se versiona porque se regenera solo.

## Agregar un proveedor nuevo

Igual que en el script de Python: no hay un parser genérico a propósito
(cada PDF de proveedor tiene su propio formato). Para sumar uno hay que
escribir su parser en `src/lib/` (siguiendo `parseInsuga.ts` como modelo
si el PDF no tiene bordes de tabla, o `parseNutribon.ts` si sí los tiene),
su fórmula de costo en `pricing.ts`, agregarlo a `proveedores.ts`, y
cablearlo en `page.tsx` y `buildExcel.ts`.
