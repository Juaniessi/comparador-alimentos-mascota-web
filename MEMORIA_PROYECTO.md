# Memoria del proyecto — versión web

Este documento es el equivalente, para esta versión web, del
`MEMORIA_PROYECTO.md` del [script de Python original](../Comparador%20alimentos%20mascota/MEMORIA_PROYECTO.md).
Ahí está la historia de cómo se validaron las fórmulas de costo con el
usuario; acá está **cómo está armado el parseo en el navegador** y qué
hacer cuando haga falta tocarlo — porque no es obvio con solo leer el
código, y perderlo de vista significa tener que re-derivarlo desde cero
cada vez.

## Qué hace esto y por qué existe

Es un puerto directo a TypeScript del script de Python, para que corra
100% en el navegador (subís los PDF, se procesan ahí mismo, descargás el
Excel) y así se pueda hostear gratis y sin backend en GitHub Pages. Mismas
fórmulas, mismo criterio de matching de la Comparativa, mismo formato de
Excel que el script original — la única parte realmente nueva es **cómo se
lee cada PDF**, porque `pdfjs-dist` (la librería de PDF que corre en el
navegador) no trae nada parecido a la detección de tablas de `pdfplumber`
(la librería que usaba el script de Python). Hubo que reconstruir eso a
mano, y esa es la parte no obvia de todo el proyecto.

## Pipeline y dónde vive cada cosa

```
PDF subido (File)
  → src/lib/pdfExtract.ts       (pdfjs-dist: texto posicionado x/y + líneas de borde reales)
  → src/lib/parseNutribon.ts    o   src/lib/parseInsuga.ts   (un parser por proveedor)
  → src/lib/pricing.ts          (fórmula de costo del proveedor)
  → src/lib/compare.ts          (arma la hoja Comparativa)
  → src/lib/buildExcel.ts       (exceljs: genera el .xlsx con el mismo formato de siempre)
  → src/app/page.tsx            (dispara todo esto al click y gatilla la descarga)
```

`src/lib/proveedores.ts` es la lista de proveedores que la pantalla sabe
pedir — un provider ahí necesita **logo, pasos de la fórmula (para el
panel del sitio) y un parser cableado en `page.tsx` y `buildExcel.ts`**
para funcionar de punta a punta (ver "Agregar un proveedor nuevo" abajo).

## Cómo diagnosticar el layout de un PDF (el método, no solo el resultado)

Cuando haya que leer un PDF nuevo — sea porque cambió el formato de un
proveedor existente o porque se suma uno nuevo — el punto de partida
siempre es el mismo: **volcar la posición real de cada palabra y de cada
línea de borde del PDF**, y mirar los números a mano antes de escribir
ninguna regla. No hay forma de adivinar esto de memoria porque depende
100% del PDF concreto.

Los dos scripts de exploración que se usaron para esto (no están commiteados
— vivían en `scratch/`, que está en `.gitignore` a propósito porque son
descartables) son fáciles de recrear con `pdfjs-dist` ya instalado:

**1. Volcar palabras con posición** (equivalente a lo que hace
`pdfExtract.ts` internamente, pero impreso para poder mirarlo):

```js
import { readFile } from "node:fs/promises";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const data = new Uint8Array(await readFile(process.argv[2]));
const doc = await pdfjsLib.getDocument({ data }).promise;
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const items = content.items
    .filter((it) => it.str.trim() !== "")
    .map((it) => ({ x0: it.transform[4], top: viewport.height - it.transform[5], text: it.str }));
  items.sort((a, b) => a.top - b.top || a.x0 - b.x0);
  console.log(`=== PAGE ${p} ===`);
  items.forEach((it) => console.log(`x0=${it.x0.toFixed(1)}\ttop=${it.top.toFixed(1)}\t"${it.text}"`));
}
```

Se corre con `npx tsx ese-script.mjs "ruta al PDF.pdf"` (o `node` a secas
si no importa nada de `src/`). Con esto ya se ve, para cada palabra, en
qué columna (`x0`) y en qué fila (`top`, distancia al borde superior de la
página) cae — eso es todo lo que hace falta para un PDF sin bordes de
tabla, como Insuga.

**2. Volcar líneas de borde reales** (solo hace falta si el PDF tiene una
tabla con bordes de verdad, como Nutribon — ver el porqué en la sección de
abajo). La lógica exacta para decodificar el buffer de trazado vectorial
de pdf.js ya está en `src/lib/pdfExtract.ts` (`extraerLineasHorizontales`)
— para explorar un PDF nuevo, la forma más rápida es llamar
`extraerPdf(file)` desde un script suelto y mirar el array `horizLines` de
cada página.

Con esos dos volcados en la mano, el proceso es: mirar dónde caen las
columnas de verdad (no asumirlas), mirar si las filas están a distancia
constante entre sí (lo estaban en los dos PDF de muestra — ayuda mucho),
y para el caso con bordes, mirar qué líneas horizontales "cruzan" hacia la
columna de la izquierda (esas son los límites de celda combinada) contra
cuáles solo separan filas de datos (esas arrancan más a la derecha).

## Parser de Insuga — sin bordes de tabla, todo por posición

El PDF de Insuga no tiene ruling lines: el texto está solo posicionado.
`parseInsuga.ts` agrupa palabras por cercanía vertical ("clustering") en
vez de por bordes. Constantes actuales (definidas al tope del archivo,
tuneadas contra `L 301 Puesto en Planta Puerto Tirol.pdf`):

- `X_PRODUCTO_MAX = 370` / `X_PORCENTAJE_MAX = 460` — límites de columna.
- `GAP_NUEVA_FILA = 25` — separación vertical (pt) que indica fila nueva.
- `TOP_MIN = 130` / `TOP_MAX = 650` — recorte para no agarrar encabezado
  ni el bloque de "CONSIDERACIONES GENERALES" al pie.
- `LISTA_ESPERADA = 301` — si el PDF dice otro número de lista, no falla,
  pero marca `avisoLista` (banner rojo en el Excel) porque la fórmula de
  costo fue validada específicamente contra la lista 301.

## Parser de Nutribon — tabla con bordes reales, sin ayuda de pdfjs

Este es el que hay que entender bien antes de tocarlo. El PDF de Nutribon
sí tiene una tabla con bordes, y la celda "PRODUCTO" viene combinada
(merge) para todas las filas de un mismo grupo — pdfplumber, en el script
de Python, resolvía esto solo. pdf.js no tiene ese concepto.

La solución (`parseNutribon.ts`) fue reconstruirlo a mano a partir de las
líneas de borde reales que el PDF dibuja como vectores:

1. `pdfExtract.ts` decodifica el buffer de trazado de cada `constructPath`
   del PDF (moveTo/lineTo/closePath — los códigos exactos están en
   `DrawOPS` dentro de `pdfExtract.ts`, no son públicos en `pdfjs-dist`) y
   devuelve todos los segmentos horizontales de la página.
2. `limitesCategoria()` se queda solo con los que **cruzan hacia la
   columna PRODUCTO** (`x0 < X_LINEA_CATEGORIA_MAX = 50`) — esas son las
   únicas que marcan un límite real de celda combinada. Las que separan
   filas de datos sueltas (CÓDIGO, PESO, etc.) arrancan más a la derecha
   (`x0 ≈ 98` en el PDF de muestra) y se ignoran a propósito.
3. Esas líneas vienen duplicadas/casi-duplicadas (el PDF las dibuja más de
   una vez con 1-2pt de diferencia) — `clusterizarLimites()` las agrupa
   con tolerancia `TOLERANCIA_CLUSTER_LINEA = 3` y promedia.
4. Para cada fila de datos (identificada por su celda CÓDIGO, que sí es
   única por fila), `textoCategoriaParaFila()` busca el par de límites
   consecutivos que la encierran y junta todo el texto de la columna
   PRODUCTO que cae en ese rango — eso reconstruye el forward-fill del
   merge sin necesitar detectar la tabla como tal.
5. Separado de eso, `marcasDePagina()` decide Nutribon / Nutribon XQ /
   Matute buscando cuántas veces aparece la palabra "PRODUCTO" (encabezado
   de tabla) en la página: página 1 con 2 apariciones → Nutribon arriba,
   Nutribon XQ abajo; página 2 en adelante → todo Matute (ahí adentro hay
   en realidad dos "tablas" de pdfplumber, pero como las dos mapean a la
   misma marca "Matute", no hace falta distinguirlas).

Límites de columna (`X_CATEGORIA_MAX`, `X_CODIGO_MAX`, etc. al tope del
archivo) están tuneados igual que los de Insuga: a mano, contra el PDF de
muestra, dejando margen de sobra entre columnas porque no cambian de PDF a
PDF (es una plantilla).

## Qué hacer si un PDF existente cambia de formato

Va a pasar tarde o temprano (cambia el layout de la plantilla del
proveedor). Señales de que pasó: la cantidad de filas cae a 0 o baja
mucho, aparecen categorías vacías o con texto pegado raro, o
`especieEtapaInferida` se dispara en filas que antes no lo tenían.

1. Volcar el PDF nuevo con el script de la sección de arriba y compararlo
   a ojo contra un volcado del PDF viejo (si no guardaste uno, cualquier
   PDF viejo del proveedor sirve para sacar uno).
2. Si cambiaron las posiciones (x0) de las columnas pero la estructura es
   la misma: solo hay que retocar las constantes `X_*` del parser
   correspondiente.
3. Si cambió la cantidad de líneas de la categoría, el espaciado entre
   filas, o el proveedor pasó de "sin bordes" a "con bordes" (o viceversa):
   hay que repetir el análisis de la sección del parser correspondiente
   (Insuga vs Nutribon) desde cero — no sirve parchear constantes sueltas.
4. Los dos PDF de muestra que se usaron para validar todo esto están en
   `../Comparador alimentos mascota/input/` (fuera de este repo, en la
   carpeta del script original) — son el punto de referencia para probar
   que no se rompió nada viejo al ajustar algo.
5. Volver a correr la validación manual: código Nutribon `117007` → costo
   `$1577,01`; Insuga "Manada Adulto x 8kg" → costo `$6552,04` (son los
   valores que el usuario confirmó a mano, ver el `MEMORIA_PROYECTO.md`
   del script original).

## Agregar un proveedor nuevo

A propósito no hay un parser genérico (mismo criterio que el script de
Python: cada PDF tiene su propio formato, y generalizar sin conocer el PDF
real es adivinar). Pasos:

1. Conseguir un PDF real del proveedor y volcarlo con el método de arriba
   para decidir si es "sin bordes" (seguir el modelo de `parseInsuga.ts`)
   o "con bordes de tabla real" (seguir el modelo de `parseNutribon.ts`).
2. Escribir `src/lib/parse<Proveedor>.ts` devolviendo filas con la forma
   que corresponda (ver `src/lib/types.ts` — puede hacer falta un tipo de
   fila nuevo si las columnas no calzan con `FilaNutribon`/`FilaInsuga`).
3. Sumar su fórmula de costo en `src/lib/pricing.ts` (y validarla a mano
   con el usuario contra al menos un producto conocido, como se hizo con
   los dos proveedores actuales — no asumir el signo de un paso, ver la
   advertencia en `pricing.ts` sobre el error de tipeo de Insuga original).
4. Sumarlo a `PROVEEDORES` en `src/lib/proveedores.ts`: `logo` (archivo en
   `public/logos/`, ver el gotcha de `basePath` más abajo),
   `logoWidth`/`logoHeight` (dimensiones **reales** del archivo — si no
   coinciden, next/image tira un warning de aspect ratio y en algunos
   casos puede distorsionar el logo), y `pasosCosto` (array de strings,
   un paso por factor de la fórmula, para el panel "¿Cómo se calcula el
   costo?" del sitio).
5. Cablearlo en `src/app/page.tsx` (parsearlo + calcular costo si se subió
   su archivo) y en `src/lib/buildExcel.ts` (su propia hoja en el Excel,
   siguiendo `hojaNutribon`/`hojaInsuga` como modelo) y en
   `src/lib/compare.ts` si tiene que entrar en el matching de la
   Comparativa.
6. Probar subiendo el PDF real en el sitio (local o el deploy) y
   confirmando visualmente que la cantidad de filas y algún valor de costo
   puntual dan lo esperado — no alcanza con que compile.

## Gotchas de GitHub Pages / `output: export` (ya nos mordieron una vez)

- **`basePath` no se agrega solo a un `src` de texto plano.** El sitio se
  sirve bajo `/comparador-alimentos-mascota-web/` en GitHub Pages. Con
  `images.unoptimized: true` (necesario para `output: export`),
  `next/image` **no** le agrega el `basePath` a un `src` string (sí lo
  hace automático con imports estáticos, o con el optimizador activado).
  Por eso los logos daban 404 en producción pero andaban bien en
  `localhost` (ahí no hay `basePath`). El patrón para cualquier asset
  nuevo que se referencie por string (no por import) es prependear
  `process.env.NEXT_PUBLIC_BASE_PATH` a mano — ver cómo lo hacen
  `proveedores.ts` (logos) y `pdfExtract.ts` (worker de pdfjs).
- **El worker de pdfjs no se commitea.** `public/pdf.worker.min.mjs` lo
  copia `scripts/copy-pdf-worker.mjs` (se corre solo via
  `predev`/`prebuild`/`postinstall` en `package.json`) para que siempre
  coincida con la versión de `pdfjs-dist` instalada — un worker
  desincronizado de la versión del paquete rompe en silencio.
- **Probar siempre contra un build con `basePath` real antes de dar algo
  por cerrado**, no alcanza con `next dev` (que no tiene `basePath`). Para
  simular GitHub Pages en local: `GITHUB_ACTIONS=true npm run build`,
  copiar `out/` a `<carpeta>/comparador-alimentos-mascota-web/` y servir
  `<carpeta>` (ej. `npx serve <carpeta>`), así las rutas con el prefijo
  resuelven igual que en producción.

## Cómo probarlo de punta a punta

No hay suite de tests automatizada — la validación es manual pero real
(subir los PDF de muestra y mirar el resultado), porque lo que importa acá
es que el número de costo sea el correcto, no que el código compile.
`playwright` no es una dependencia del proyecto (se instala temporal con
`npm install --no-save playwright` cuando hace falta, y se desinstala
después) — se usó para automatizar exactamente ese flujo: subir los PDF,
click en "Generar comparativa", chequear que no haya errores de consola,
y confirmar la cantidad de filas y algún valor de costo puntual contra los
esperados (ver la sección anterior).

## Limitaciones conocidas (heredadas del script de Python, sin resolver a propósito)

- Cuando una categoría genérica de Nutribon podría matchear con más de una
  línea distinta de Insuga al mismo %+peso, la Comparativa solo empareja
  automáticamente la primera que encuentra y deja la otra como "Sin
  equivalente" — conviene revisar esos casos a mano en el Excel.
- Especie/etapa de Matute que no vienen explícitas en el nombre (Duke,
  Tito, Matu) se infieren por convención de nombres, no por dato explícito
  del PDF, y quedan marcadas como "inferida" (fila amarilla) para que se
  revisen.
