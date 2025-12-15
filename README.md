# Caja de Herramientas - Bancolombia

Aplicación web para gestionar y visualizar herramientas de trabajo colaborativo.

## 🚀 Características

- Interfaz moderna y accesible
- Filtros por categoría, duración y participantes
- Vista detallada de cada herramienta
- Diseño responsive
- Animaciones suaves con GSAP

## 📋 Requisitos

- Navegador web moderno
- Node.js (opcional, solo para desarrollo)

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/CajaHerramientasBancolombia.git
```

2. Instala las dependencias (opcional):
```bash
npm install
```

## 🌐 GitHub Pages

Este proyecto está configurado para desplegarse automáticamente en GitHub Pages.

### Configuración inicial

1. Ve a la configuración de tu repositorio en GitHub
2. Navega a **Settings** → **Pages**
3. En **Source**, selecciona **GitHub Actions**
4. El workflow se ejecutará automáticamente cuando hagas push a la rama `main` o `master`

### Despliegue automático

El proyecto incluye un workflow de GitHub Actions (`.github/workflows/deploy.yml`) que:
- Se ejecuta automáticamente al hacer push a `main` o `master`
- Despliega el sitio en GitHub Pages
- Puede ejecutarse manualmente desde la pestaña **Actions**

### URL del sitio

Una vez desplegado, tu sitio estará disponible en:
```
https://tu-usuario.github.io/CajaHerramientasBancolombia/
```

## 📁 Estructura del proyecto

```
├── css/
│   ├── styles.css
│   ├── accesibilidad.css
│   └── loader.css
├── js/
│   ├── app.js
│   ├── animaciones.js
│   ├── accesibilidad.js
│   └── loader.js
├── data/
│   └── herramientas.json
├── img/
├── index.html
└── crear-herramienta.html
```

## 🎨 Tecnologías utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla)
- GSAP (animaciones)
- Material Icons

## 📝 Licencia

Este proyecto es propiedad de Bancolombia.


