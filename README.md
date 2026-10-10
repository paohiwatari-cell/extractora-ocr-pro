# Extractora OCR Pro

Extensión portable para detectar imágenes de páginas web, extraer texto localmente y reconstruir tablas de talles/medidas sin depender de APIs externas.

## Objetivo

Esta versión inicial entrega una extensión funcional de base para Chrome Manifest V3 con:

- análisis de la página activa
- detección de imágenes visibles y de fondo
- filtrado por texto alternativo, URL y tipo
- selección por tabla probable
- procesamiento local de resultados
- almacenamiento local y exportación simple CSV/JSON
- datos de prueba de modelos de proveedor

## Limitaciones conocidas de esta primera versión

- El OCR local de producción se implementa como adapter con heurísticas locales y contexto visual/semántico. No reemplaza a Tesseract.js o a un OCR robusto completo.
- La extracción real de texto pixel a pixel requiere un motor OCR más completo y una carga local de librerías de reconocimiento.
- Si la imagen proviene de un dominio con CORS restrictivo, la lectura del contenido del canvas puede quedar limitada.
- Esta primera versión está orientada a una prueba funcional y a la arquitectura de la extensión, no a una solución de OCR industrial.

## Estructura del proyecto

```text
extractora-ocr-pro/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── background.js
├── content.js
├── libs/
│   └── ocr-engine.js
├── samples/
│   └── ejemplo-tablas.json
├── README.md
└── .gitignore
```

## Instalación en Chrome

1. Abrí Google Chrome.
2. Entrá en `chrome://extensions`.
3. Activá `Modo desarrollador`.
4. Hacé clic en `Cargar extensión sin empaquetar`.
5. Seleccioná la carpeta del proyecto.
6. La extensión quedará instalada y lista para usar.

## Uso básico

1. Abrí una página web con imágenes o tablas de medidas.
2. Ejecutá la extensión.
3. Haciendo click en `Analizar página`, la extensión detecta imágenes visibles, de fondo y URLs.
4. Usá `Tablas probables` para filtrar imágenes con alta posibilidad de contener medidas.
5. Seleccioná las imágenes a procesar.
6. Haciendo clic en `Procesar todo`, la extensión genera registros estructurados locales.
7. Podés exportar a CSV o JSON desde el panel.

## Soporte para OCR local

La idea es que esta extensión pueda usar un motor local real como Tesseract.js o un paquete local descargado en una etapa posterior. En esta versión inicial, el archivo `libs/ocr-engine.js` funciona como conector local para extracción basada en contexto y heurísticas, listo para ser reemplazado por un OCR más fuerte sin cambiar la interfaz.

## Datos de ejemplo

El archivo `samples/ejemplo-tablas.json` contiene un ejemplo de tablas de talles para señor as de proveedores.

## Recomendaciones para una segunda versión

- incorporar una copia local de Tesseract.js y un worker dedicado
- detectar filas/columnas por píxeles y análisis espacial
- permitir edición de tabla en un panel de revisión
- exportar XLSX/HTML/TXT con plantillas
- guardar historial extendido por origen y proveedor
- incluir posibilidad de seleccionar regiones específicas de la imagen

## Licencia

MIT o similar según preferencia del usuario. Si lo necesitás, puedo dejarla con una licencia explícita.

## Mantenimiento

La extensión funciona sin conexión una vez instalada. No transmite datos a terceros como parte de la lógica de extracción. Los resultados quedan en el almacenamiento local del navegador.
