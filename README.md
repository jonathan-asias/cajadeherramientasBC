# Caja de Herramientas — Bancolombia

Sitio web estático de accesibilidad digital para Bancolombia. Las herramientas y el contenido de cada guía se cargan desde archivos JSON; **no requiere backend ni PHP**.

---

## Tecnologías utilizadas

| Área | Tecnología |
|------|------------|
| Estructura | HTML5 semántico |
| Estilos | CSS3 (variables en `css/variables.css`, diseño responsive) |
| Lógica | JavaScript vanilla (ES6+), sin frameworks |
| Animaciones | [GSAP 3](https://gsap.com/) (`js/libs/gsap.min.js` + `js/animaciones.js`) |
| Datos | JSON (`data/herramientas.json`) |
| Tipografía e iconos | Google Fonts (Open Sans), Material Icons Outlined |
| Layout | `fetch` para partials (`partials/header.html`, `partials/footer.html`) |
| Accesibilidad | Panel configurable (contraste, modo oscuro, espaciado, desaturado, tamaño de fuente), `prefers-reduced-motion`, patrones ARIA en modales, carruseles y pestañas |

**Despliegue:** archivos estáticos. Compatible con cualquier servidor HTTP (IIS con `web.config`, GitHub Pages, Netlify, `npx serve`, etc.).

---

## Clonar el repositorio

### Requisitos previos

| Herramienta | Para qué |
|-------------|----------|
| [Git](https://git-scm.com/) | Clonar y versionar el código |
| [Git LFS](https://git-lfs.github.com/) | Descargar los GIF de las herramientas (ver abajo) |
| [Node.js](https://nodejs.org/) | Servidor local de desarrollo (`npx serve`) |
| Navegador moderno | Probar el sitio |

### Por qué hace falta Git LFS

Varios pasos de las herramientas usan **GIF muy pesados** (algunos superan 100 MB). GitHub no permite subirlos como archivos normales en Git, así que en este repositorio están en **Git Large File Storage (LFS)**.

En `.gitattributes` está definido:

```gitattributes
img/herramientas/**/*.gif filter=lfs
```

Si clonas **sin** Git LFS instalado, en tu disco verás archivos `.gif` diminutos (punteros de texto), no las animaciones reales, y **los pasos con GIF no se verán en el sitio**.

### Pasos para clonar (recomendado)

**1. Instala Git LFS** (solo una vez por equipo):

- Windows: descarga desde [git-lfs.github.com](https://git-lfs.github.com/) o `winget install GitHub.GitLFS`
- macOS: `brew install git-lfs`

**2. Activa LFS en Git** (solo una vez por equipo):

```bash
git lfs install
```

**3. Clona el repositorio:**

```bash
git clone https://github.com/jonathan-asias/cajadeherramientasBC.git
cd cajadeherramientasBC
```

Si Git LFS está instalado y configurado, los GIF se descargan automáticamente durante el `clone`.

**4. Si ya clonaste sin LFS** (o faltan GIF), dentro de la carpeta del repo:

```bash
git lfs install
git lfs pull
```

**5. Comprueba que los GIF son reales** (opcional): un archivo como `img/herramientas/2/GIFs/paso6.gif` debe pesar decenas o cientos de MB, no unos pocos KB.

### Ejecutar en local

No abras el proyecto con `file://`: el navegador puede bloquear `fetch` al cargar JSON y partials (CORS).

Desde la **raíz del repositorio** (donde está `index.html`):

```bash
npx serve .
```

Abre la URL que muestre la terminal (por ejemplo `http://localhost:3000`).

### Añadir o cambiar un GIF en el repo

Si vas a **commitear** GIF nuevos en `img/herramientas/`, asegúrate de tener LFS activo (`git lfs install`) antes de `git add`. Git usará LFS automáticamente por `.gitattributes`. Luego haz `git push` con normalidad; los archivos grandes se suben al almacenamiento LFS de GitHub.

---

## Características principales

- **Inicio (`index.html`):** tarjetas de herramientas, filtros rápidos por rol y propósito y modal de guía de uso.
- **Listado (`herramientas.html`):** catálogo completo con los mismos filtros.
- **Detalle (`herramienta.html?id={id}`):** guía paso a paso con imágenes, GIF, video, carruseles internos, enlaces, plantillas descargables y bloques “Recuerda que”.
- **Guía de uso (`guias-uso.html`):** contenido formativo con pestañas accesibles.
- **Contacto (`contacto.html`):** canales de comunicación.
- **Accesibilidad global:** panel lateral en todas las páginas principales (`js/accesibilidad.js`).
- **SEO:** `sitemap.xml` y `robots.txt` (ajusta las URLs si cambias el dominio de publicación).

---

## Cómo crear o editar herramientas

Toda la información visible en tarjetas y en la página de detalle proviene de **`data/herramientas.json`**. Es un **array** de objetos; cada objeto es una herramienta.

### 1. Asignar un `id` único

Usa el siguiente número entero disponible (las herramientas actuales van del `1` al `7`). Ese `id` define la carpeta de imágenes y la URL de detalle:

`herramienta.html?id=8`

### 2. Crear la carpeta de medios

```
img/herramientas/{id}/
  principal.png          ← imagen de la tarjeta y cabecera del detalle
  paso1.png, paso2.png … ← capturas de cada paso
  GIFs/                  ← opcional (.gif)
  Videos/                ← opcional (.mp4)
  documentos/            ← opcional (.pdf, .xlsx, etc.)
```

**Importante:** en servidores Linux los nombres de archivo distinguen mayúsculas y minúsculas. Las rutas en el JSON deben coincidir **exactamente** con el nombre del archivo (por ejemplo `paso1.png`, no `Paso1.png`).

### 3. Campos obligatorios (mínimo para listar y filtrar)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | número | Identificador único |
| `titulo` | string | Nombre de la herramienta |
| `imagen` | string | Ruta a `principal.png` |
| `categoria` | string | Ej.: `"Diagnostico"` (afecta el color en detalle) |
| `descripcion` | string | Texto de la tarjeta y resumen |
| `usuarios` | string[] | Roles para filtros: `"Diseñador"`, `"Desarrollador"`, `"Content"`, etc. |
| `uso` | string[] | Propósito: `"Diagnóstico"`, `"Diseño"`, `"Creación de contenido"`, etc. |
| `tipo` | string[] | Tipo de recurso: `"Guías"`, `"Manual de uso"`, etc. |

### 4. Secciones opcionales del detalle

Copia la estructura de una herramienta similar y adapta los textos.

| Campo | Uso |
|-------|-----|
| `tituloAntesDeEmpezar` + `antesDeEmpezar` | Lista de cards previas al paso a paso (`titulo`, `descripcion`) |
| `recuerdaQue1`, `recuerdaQue2`, `recuerdaQue3` | Bloques destacados; si el título empieza por “Ten presente” / “Tener presente”, se muestran como card especial |
| `tituloPasos` + `pasos` | Guía principal (ver estructura de pasos abajo) |
| `tituloEnlaces` + `subtituloEnlaces` + `enlaces` | Tarjetas de enlaces o tips (`titulo`, `url`, `resumen`; `url` puede ser `""`) |
| `tituloPlantilla` + `plantilla` | Descargas o referencias (`nombrePlantilla`, `descripcion`, `url` y/o `web`) |
| `documento` | Ruta a un archivo descargable único (PDF, etc.) |
| `requisitos` | Lista de requisitos previos (si aplica) |

### 5. Estructura de `pasos`

Cada elemento del array `pasos` puede incluir:

```json
{
  "imagen": "img/herramientas/8/paso1.png",
  "paso": "Título o instrucción del paso",
  "descripcion": [
    { "texto": "Párrafo de apoyo." }
  ]
}
```

**Variantes de medio en un paso:**

- **Una imagen:** campo `imagen` en el paso.
- **Varias imágenes (carrusel):** sin `imagen` en el paso; en `descripcion` usa objetos con `imagen` + `texto`.
- **GIF o video:** `imagen` con ruta a `.gif` o `.mp4` (el detalle detecta el tipo y muestra `<img>` o `<video>`).

Ejemplo de paso con carrusel:

```json
{
  "paso": "Ejemplo con varias capturas",
  "descripcion": [
    {
      "imagen": "img/herramientas/8/paso3_1.png",
      "texto": "Primera vista."
    },
    {
      "imagen": "img/herramientas/8/paso3_2.png",
      "texto": "Segunda vista."
    }
  ]
}
```

### 6. Plantillas descargables o enlaces externos

```json
"tituloPlantilla": "Plantillas y referencias",
"plantilla": [
  {
    "nombrePlantilla": "Matriz de evaluación",
    "descripcion": "Breve descripción del archivo.",
    "url": "img/herramientas/8/documentos/matriz.xlsx"
  },
  {
    "nombrePlantilla": "WCAG 2.2",
    "descripcion": "Enlace a la norma.",
    "web": "https://www.w3.org/TR/WCAG22/"
  }
]
```

- **`url`:** archivo local (descarga).
- **`web`:** enlace externo (abre en nueva pestaña).

### 7. Añadir la herramienta al JSON

1. Abre `data/herramientas.json`.
2. Añade un nuevo objeto al **final del array** (respeta comas entre objetos).
3. Valida que el JSON sea correcto (editor con validación o [jsonlint.com](https://jsonlint.com)).
4. Recarga el sitio y prueba:
   - tarjeta en inicio / herramientas,
   - filtros por `usuarios`, `uso` y `tipo`,
   - detalle: `herramienta.html?id={tu-id}`.

### Ejemplo mínimo de herramienta nueva

```json
{
  "id": 8,
  "titulo": "Título de la nueva herramienta",
  "imagen": "img/herramientas/8/principal.png",
  "categoria": "Diagnostico",
  "descripcion": "Resumen breve que aparece en la tarjeta.",
  "usuarios": ["Diseñador", "General"],
  "uso": ["Diagnóstico"],
  "tipo": ["Guías"],
  "tituloPasos": "Pasos para aplicar la herramienta",
  "pasos": [
    {
      "imagen": "img/herramientas/8/paso1.png",
      "paso": "Primer paso",
      "descripcion": [{ "texto": "Detalle del primer paso." }]
    }
  ]
}
```

---

## Estructura del proyecto (resumen)

```
├── index.html, herramientas.html, herramienta.html, …
├── css/                 # Estilos globales y por página
├── js/                  # app.js, herramienta-detalle.js, accesibilidad.js, …
├── data/
│   └── herramientas.json
├── img/                 # Imágenes generales y por herramienta (GIF en LFS)
├── partials/            # Header y footer compartidos
├── .gitattributes       # Reglas Git LFS
└── sitemap.xml, robots.txt
```

---

## Notas

- No existe formulario de creación en línea: **solo edición manual** de `herramientas.json` y subida de archivos a `img/herramientas/{id}/`.
- Los GIF en `img/herramientas/**/GIFs/` viven en **Git LFS**; quien clone el repo necesita LFS para verlos en local y en despliegues que copien desde Git.
- Para producción, actualiza las URLs en `sitemap.xml`, `robots.txt` y las meta etiquetas `og:*` de cada HTML si cambias el dominio.
