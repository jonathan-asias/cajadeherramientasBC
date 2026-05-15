/**
 * Página de Detalle de Herramienta
 * Carga el contenido de una herramienta específica basado en el parámetro ID de la URL
 *
 * Render por componentes: plantillas pequeñas + clases semánticas (.herramienta-detail-*).
 */

/** Selector de la sección de pasos (icono placeholder en data-*) */
const SEL_SECCION_PASOS = '.herramienta-detail-pasos';

// Obtener el ID de la herramienta desde la URL (permite usar tildes, ñ, etc. en el título sin problemas)
function obtenerIdDeURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const idStr = urlParams.get('id');
    if (idStr === null || idStr === '') return null;
    const id = parseInt(idStr, 10);
    return Number.isNaN(id) ? null : id;
}

// Cargar herramientas desde JSON
async function cargarHerramientas() {
    try {
        const response = await fetch('data/herramientas.json');
        if (!response.ok) {
            throw new Error('Error al cargar las herramientas');
        }
        return await response.json();
    } catch (error) {
        console.error('Error al cargar herramientas:', error);
        throw error;
    }
}

function normalizarTexto(valor) {
    return (valor || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

/** Ítems cuyo título es "Ten/Tener presente que" van en card, no en el acordeón de preparación. */
function tituloEsBloqueTenPresenteQue(titulo) {
    const t = normalizarTexto(String(titulo || ''));
    return t.startsWith('ten presente') || t.startsWith('tener presente');
}

function escaparHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Anuncio para enlaces con target="_blank" (WCAG 2.4.4 / técnica G201). */
const AVISO_NUEVA_VENTANA = '<span class="visually-hidden"> (se abre en una nueva ventana)</span>';

function prefiereMovimientoReducido() {
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
        return false;
    }
}

function enfocarTituloDetalleHerramienta(container) {
    const h1 = container.querySelector('.herramienta-titulo-principal');
    if (!h1 || typeof h1.focus !== 'function') return;
    h1.setAttribute('tabindex', '-1');
    h1.focus({ preventScroll: prefiereMovimientoReducido() });
}

function enfocarPrimerVolver(loader) {
    if (!loader) return;
    requestAnimationFrame(() => {
        const volver = loader.querySelector('a.btn-volver');
        if (volver && typeof volver.focus === 'function') {
            volver.focus({ preventScroll: prefiereMovimientoReducido() });
        }
    });
}

/**
 * Colores por categoría (claves en minúsculas, sin tildes; deben coincidir con normalizarTexto)
 */
const coloresPorCategoria = {
    categorizar: '#FDE773',
    disenar: '#00C389',
    desarrollar: '#59CBE8',
    probar: '#9063CD',
    'monitorear y mejorar': '#FF7F41'
};

function obtenerColorPorCategoria(categoria) {
    if (!categoria) {
        return '#FDE773';
    }
    const clave = normalizarTexto(categoria);
    return coloresPorCategoria[clave] || '#FDE773';
}

// Obtener icono por tipo (clave normalizada: lowercase, sin tildes)
function obtenerIconoPorTipo(tipos) {
    if (!tipos || tipos.length === 0) return 'lightbulb_outline';
    const clave = normalizarTexto(tipos[0]);
    const iconosPorTipo = {
        'manual de uso': 'menu_book',
        infografias: 'image',
        'enlaces externos': 'link',
        guias: 'description'
    };
    return iconosPorTipo[clave] || 'lightbulb_outline';
}

// Detecta si una ruta apunta a un archivo de video
function esVideo(ruta) {
    return /\.(mp4|webm|ogg|mov)$/i.test(ruta || '');
}

// Función para obtener herramientas aleatorias sin repetir
function obtenerHerramientasAleatorias(herramientas, herramientaActual, cantidad = 3) {
    const otras = herramientas.filter(h => h.id !== herramientaActual.id);
    const aleatorias = [];
    const indicesUsados = new Set();

    while (aleatorias.length < cantidad && aleatorias.length < otras.length) {
        const indiceAleatorio = Math.floor(Math.random() * otras.length);
        if (!indicesUsados.has(indiceAleatorio)) {
            indicesUsados.add(indiceAleatorio);
            aleatorias.push(otras[indiceAleatorio]);
        }
    }

    return aleatorias;
}

// --- Utilidades de pasos (compartidas entre render e interacción) ---

function normalizarDescripcionPasos(paso) {
    if (!paso || typeof paso !== 'object') return [];
    const d = paso.descripcion;
    if (Array.isArray(d)) {
        return d.map(item => ({
            texto: item && item.texto != null ? String(item.texto) : '',
            imagen: item && item.imagen ? String(item.imagen) : ''
        }));
    }
    if (d != null && d !== '') return [{ texto: String(d), imagen: '' }];
    return [];
}

function descripcionTieneImagenes(arr) {
    return Array.isArray(arr) && arr.some(item => item && item.imagen && item.imagen.trim() !== '');
}

/**
 * Área media de un paso: imagen, video o carrusel desde descripción
 */
function buildPasosMediaHtml(imagenPaso, descNorm, tituloHerramienta, placeholderIcon, imagenHeaderFallback) {
    if (imagenPaso && imagenPaso.trim() !== '') {
        if (esVideo(imagenPaso)) {
            return `<video src="${escaparHtml(imagenPaso)}" controls class="herramienta-pasos-video" preload="metadata" aria-label="Video - ${escaparHtml(tituloHerramienta)}"></video>`;
        }
        return `<img src="${escaparHtml(imagenPaso)}" alt="Paso - ${escaparHtml(tituloHerramienta)}" />`;
    }
    if (descripcionTieneImagenes(descNorm)) {
        const items = descNorm.filter(item => item.imagen && item.imagen.trim() !== '');
        if (items.length === 0) return imagenHeaderFallback;
        const slides = items.map(item => `
                <div class="herramienta-pasos-carrusel-item" role="listitem">
                    <img src="${escaparHtml(item.imagen)}" alt="" />
                    <p class="herramienta-pasos-carrusel-texto">${escaparHtml(item.texto)}</p>
                </div>`).join('');
        return `
            <div class="herramienta-pasos-carrusel-wrapper" role="region" aria-label="Imágenes del paso" tabindex="0">
                <button type="button" class="herramienta-pasos-carrusel-prev" aria-label="Imagen anterior" disabled><span class="material-icons-outlined" aria-hidden="true">chevron_left</span></button>
                <div class="herramienta-pasos-carrusel-inner">
                    <div class="herramienta-pasos-carrusel-container" role="list">${slides}</div>
                </div>
                <button type="button" class="herramienta-pasos-carrusel-next" aria-label="Imagen siguiente"><span class="material-icons-outlined" aria-hidden="true">chevron_right</span></button>
                <span class="visually-hidden" aria-live="polite" aria-atomic="true" data-carousel-live></span>
                <div class="herramienta-pasos-carrusel-dots" aria-hidden="true"></div>
            </div>`;
    }
    return imagenHeaderFallback;
}

function buildPasosMediaFromPaso(paso, tituloHerramienta, imagenHeaderFallback) {
    const esObjeto = typeof paso === 'object' && paso !== null;
    const imagenPaso = esObjeto && paso.imagen ? paso.imagen : '';
    const descNorm = normalizarDescripcionPasos(paso);
    return buildPasosMediaHtml(imagenPaso, descNorm, tituloHerramienta, null, imagenHeaderFallback);
}

function buildPasosDescripcionParrafosFromNorm(descNorm) {
    if (!Array.isArray(descNorm) || descNorm.length === 0) return '';
    const textos = descNorm.map(item => item.texto).filter(t => t.trim() !== '');
    if (textos.length === 0) return '';
    return textos.map(t => `<p class="herramienta-pasos-descripcion-texto">${escaparHtml(t)}</p>`).join('');
}

function parseDescripcionJsonAttr(descripcionJson) {
    try {
        const raw = (descripcionJson || '').replace(/&#39;/g, "'");
        const desc = raw ? JSON.parse(raw) : [];
        return Array.isArray(desc) ? desc : [];
    } catch (_) {
        return [];
    }
}

// --- Plantillas por bloque (detalle herramienta) ---

function renderDetalleBreadcrumb(titulo) {
    return `
        <nav class="herramienta-breadcrumb" aria-label="Ruta de navegación">
            <ol class="herramienta-breadcrumb-list">
                <li class="herramienta-breadcrumb-item">
                    <a href="index.html" class="herramienta-breadcrumb-link">Inicio</a>
                </li>
                <li class="herramienta-breadcrumb-separator" aria-hidden="true">
                    <span class="material-icons-outlined" aria-hidden="true">chevron_right</span>
                </li>
                <li class="herramienta-breadcrumb-item">
                    <a href="./herramientas.html" class="herramienta-breadcrumb-link" aria-label="Volver a la lista de herramientas">Herramientas</a>
                </li>
                <li class="herramienta-breadcrumb-separator" aria-hidden="true">
                    <span class="material-icons-outlined" aria-hidden="true">chevron_right</span>
                </li>
                <li class="herramienta-breadcrumb-item" aria-current="page">
                    <span class="herramienta-breadcrumb-current">${escaparHtml(titulo)}</span>
                </li>
            </ol>
        </nav>`;
}

function renderDetalleHero({
    categoria,
    colorFondo,
    titulo,
    descripcion,
    usuariosTexto,
    usoTexto,
    tipoTexto,
    iconoUsuario,
    iconoUso,
    iconoTipo,
    imagenHeader
}) {
    const varColor = escaparHtml(colorFondo);
    const varFg = escaparHtml(obtenerColorTextoPorFondo(colorFondo));
    return `
        <section class="herramienta-detail-hero" style="--herramienta-categoria-bg: ${varColor}; --herramienta-categoria-fg: ${varFg};">
            ${renderDetalleBreadcrumb(titulo)}
            <div class="herramienta-detail-hero__inner">
                <div class="herramienta-detail-hero__main">
                    <div class="herramienta-categoria">${escaparHtml(categoria)}</div>
                    <h1 class="herramienta-titulo-principal">${escaparHtml(titulo)}</h1>
                    <p class="herramienta-resumen">${escaparHtml(descripcion)}</p>
                    <div class="herramienta-caracteristicas-box">
                        <div class="herramienta-caracteristica">
                            <span class="material-icons-outlined" aria-hidden="true">${iconoUsuario}</span>
                            <span><strong>Para:</strong> ${escaparHtml(usuariosTexto)}</span>
                        </div>
                        <div class="herramienta-caracteristica">
                            <span class="material-icons-outlined" aria-hidden="true">${iconoUso}</span>
                            <span><strong>Uso:</strong> ${escaparHtml(usoTexto)}</span>
                        </div>
                        <div class="herramienta-caracteristica">
                            <span class="material-icons-outlined" aria-hidden="true">${iconoTipo}</span>
                            <span><strong>Tipo:</strong> ${escaparHtml(tipoTexto)}</span>
                        </div>
                    </div>
                </div>
                <div class="herramienta-detail-hero__media">
                    ${imagenHeader}
                </div>
            </div>
        </section>`;
}

function obtenerColorTextoPorFondo(colorHex) {
    if (!colorHex || typeof colorHex !== 'string') return '#000000';
    let hex = colorHex.trim();
    if (hex.startsWith('var(')) return 'var(--bc-text-primary)';
    if (hex.startsWith('#')) hex = hex.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length < 6) return '#000000';

    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return L > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Acordeón de preparación: solo "antes de empezar" y entradas de recuerdaQue1 que no sean "Ten presente que".
 * Las de "Ten presente que" se muestran debajo como bloque tipo card (renderBloqueRecuerdaQue).
 */
function renderDetallePrepAccordion({ antesDeEmpezar, tituloAntesDeEmpezar, recuerdaQue1 }) {
    const antes = Array.isArray(antesDeEmpezar) ? antesDeEmpezar : [];
    const rq1 = Array.isArray(recuerdaQue1) ? recuerdaQue1 : [];
    const recuerdaEnAcordeon = rq1.filter((it) => !tituloEsBloqueTenPresenteQue(it && it.titulo));
    const recuerdaTenPresenteItems = rq1.filter((it) => tituloEsBloqueTenPresenteQue(it && it.titulo));

    const entries = [
        ...antes.map((item, i) => ({ kind: 'antes', item, key: `a-${i}` })),
        ...recuerdaEnAcordeon.map((item, i) => ({ kind: 'recuerda', item, key: `r-${i}` }))
    ];

    const tenPresenteWrapClass = entries.length > 0
        ? 'herramienta-detail-prep-ten-presente'
        : 'herramienta-detail-prep-ten-presente herramienta-detail-prep-ten-presente--solo';
    const tenPresenteCardsHTML = recuerdaTenPresenteItems.length > 0
        ? `<div class="${tenPresenteWrapClass}">${renderBloqueRecuerdaQue(recuerdaTenPresenteItems)}</div>`
        : '';

    if (entries.length === 0 && !tenPresenteCardsHTML) return '';

    let sectionTitle;
    if (entries.length > 0) {
        if (antes.length > 0 && recuerdaEnAcordeon.length > 0) {
            sectionTitle = escaparHtml(tituloAntesDeEmpezar || 'Antes de empezar');
        } else if (antes.length > 0) {
            sectionTitle = escaparHtml(tituloAntesDeEmpezar || 'Antes de empezar');
        } else {
            sectionTitle = 'Recuerda que';
        }
    } else {
        sectionTitle = 'Ten presente que';
    }

    const accordionBlock = entries.length > 0
        ? (() => {
            const itemsHtml = entries.map((entry, n) => {
                const it = entry.item || {};
                const iconoDefault = entry.kind === 'antes' ? 'lightbulb_outline' : 'info';
                const icono = escaparHtml(it.icono || iconoDefault);
                const tituloDefault = entry.kind === 'recuerda' ? 'Recuerda que' : '';
                const titulo = escaparHtml(it.titulo || tituloDefault);
                const descripcion = escaparHtml(it.descripcion || '');
                const idTrigger = `herramienta-prep-trigger-${n}`;
                const idPanel = `herramienta-prep-panel-${n}`;
                return `
        <div class="herramienta-prep-accordion-item">
            <h3 class="herramienta-prep-accordion-heading">
                <button type="button" class="herramienta-prep-accordion-trigger" id="${idTrigger}" aria-expanded="false" aria-controls="${idPanel}">
                    <span class="material-icons-outlined herramienta-prep-accordion-lead-icon" aria-hidden="true">${icono}</span>
                    <span class="herramienta-prep-accordion-title">${titulo}</span>
                    <span class="material-icons-outlined herramienta-prep-accordion-chevron" aria-hidden="true">expand_more</span>
                </button>
            </h3>
            <div class="herramienta-prep-accordion-panel" id="${idPanel}" role="region" aria-labelledby="${idTrigger}" hidden>
                <div class="herramienta-prep-accordion-panel-inner">
                    <p class="herramienta-prep-accordion-descripcion">${descripcion}</p>
                </div>
            </div>
        </div>`;
            }).join('');
            const titleRow = `<h2 class="herramienta-seccion-title">${sectionTitle}</h2>`;
            return `
                ${titleRow}
                <div class="herramienta-prep-accordion" data-herramienta-prep-accordion>
                    ${itemsHtml}
                </div>`;
        })()
        : '';

    return `
        <section class="herramienta-detail-prep" aria-label="${sectionTitle}">
            <div class="herramienta-detail-layout">
                ${accordionBlock}
                ${tenPresenteCardsHTML}
            </div>
        </section>`;
}

function renderBloqueRecuerdaQue(items) {
    if (!Array.isArray(items) || items.length === 0) return '';
    const inner = items.map(item => {
        const titulo = escaparHtml(item.titulo || 'Recuerda que:');
        const descripcion = escaparHtml(item.descripcion || '');
        const icono = escaparHtml(item.icono || 'info');
        return `
            <div class="herramienta-recuerda-que-card">
                <div class="herramienta-recuerda-que-header">
                    <span class="herramienta-recuerda-que-icon material-icons-outlined" aria-hidden="true">${icono}</span>
                    <h3 class="herramienta-recuerda-que-titulo">${titulo}</h3>
                </div>
                <p class="herramienta-recuerda-que-descripcion">${descripcion}</p>
            </div>`;
    }).join('');
    return `
        <div class="herramienta-recuerda-que">${inner}</div>`;
}

function renderDetalleRequisitosMateriales({
    requisitosHTML,
    materialesHTML,
    tieneMateriales
}) {
    return `
        <section class="herramienta-detail-requisitos">
            <div class="herramienta-detail-layout">
                <h2 class="herramienta-seccion-title">Lo que necesitas para empezar</h2>
                <div class="herramienta-switch-container">
                    <label class="herramienta-toggle-switch">
                        <input type="checkbox" id="herramienta-toggle" />
                        <span class="herramienta-toggle-slider">
                            <span class="herramienta-toggle-label-left">Requisitos</span>
                            <span class="herramienta-toggle-label-right">Materiales</span>
                        </span>
                    </label>
                </div>
                <div class="herramienta-switch-content">
                    <div class="herramienta-requisitos-container herramienta-switch-panel" data-content="requisitos">
                        ${requisitosHTML}
                    </div>
                    <div class="herramienta-materiales-container herramienta-switch-panel is-hidden" data-content="materiales">
                        ${tieneMateriales ? `<ul class="herramienta-materiales-list">${materialesHTML}</ul>` : ''}
                    </div>
                </div>
            </div>
        </section>`;
}

function renderListaRequisitos(requisitos) {
    if (!requisitos.length) return '';
    return requisitos.map(r => `
        <div class="herramienta-requisito-item">
            <img src="img/imagenReq.png" alt="Requisito" class="herramienta-requisito-imagen" />
            <span class="herramienta-requisito-texto">${escaparHtml(r)}</span>
        </div>`).join('');
}

function renderDetallePasos({
    tituloPasos,
    iconoPlaceholder,
    primeraImagenHTML,
    primeraDescripcionHTML,
    tienePrimeraDescripcion,
    pasosHTML
}) {
    const descClass = `herramienta-pasos-descripcion${tienePrimeraDescripcion ? '' : ' is-hidden'}`;
    return `
        <section class="herramienta-detail-pasos" data-paso-placeholder-icon="${escaparHtml(iconoPlaceholder)}">
            <div class="herramienta-detail-layout">
            <h2 class="herramienta-seccion-title">${escaparHtml(tituloPasos)}</h2>
                <div class="herramienta-pasos-content">
                    <div class="herramienta-pasos-left">
                        <div id="herramienta-pasos-media" class="herramienta-pasos-imagen">
                            ${primeraImagenHTML}
                        </div>
                        <div id="herramienta-pasos-texto" class="${descClass}" aria-live="polite">
                            ${primeraDescripcionHTML}
                        </div>
                    </div>
                    <div class="herramienta-pasos-buttons" role="group" aria-label="Pasos de la herramienta">
                        ${pasosHTML}
                    </div>
                </div>
            </div>
        </section>`;
}

function renderDetalleEnlaces({ tituloEnlaces, subtituloEnlaces, enlacesHTML }) {
    return `
        <section class="herramienta-detail-enlaces">
            <div class="herramienta-detail-layout">
                <h2 class="herramienta-seccion-title">${escaparHtml(tituloEnlaces)}</h2>
                <p class="herramienta-seccion-subtitle">${escaparHtml(subtituloEnlaces)}</p>
                ${enlacesHTML}
            </div>
        </section>`;
}

function renderDetalleRelacionadas(otrasHTML) {
    return `
        <section class="herramienta-detail-relacionadas">
            <div class="herramienta-detail-layout">
                <h2 class="herramienta-seccion-title">Explora otras herramientas</h2>
                <p class="herramienta-otras-descripcion">Te recomendamos algunas herramientas que consideramos pueden serte de utilidad</p>
                ${otrasHTML}
            </div>
        </section>`;
}

function renderDetalleBanner() {
    return `
        <section class="herramienta-banner-final">
            <div class="herramienta-banner-content">
                <div class="herramienta-banner-text-content">
                    <h2 id="herramienta-banner-title" class="herramienta-banner-title">Explora todas las herramientas</h2>
                    <p id="herramienta-banner-text" class="herramienta-banner-text">Descubre más recursos y metodologías para tu trabajo</p>
                </div>
                <a href="index.html#mainContent" class="herramienta-banner-btn">
                    Ver todas las herramientas
                </a>
            </div>
        </section>`;
}

function renderEnlacesCarousel(herramienta) {
    const tieneDoc = Boolean(herramienta.documento && String(herramienta.documento).trim() !== '');
    const tieneEnlaces = Array.isArray(herramienta.enlaces) && herramienta.enlaces.length > 0;
    if (tieneDoc || tieneEnlaces) {
        const docBlock = tieneDoc
            ? `
                        <div class="herramienta-enlace-item" role="listitem">
                            <span class="material-icons-outlined herramienta-enlace-icono" aria-hidden="true">description</span>
                            <h3 class="herramienta-enlace-titulo">Documentación</h3>
                            <p class="herramienta-enlace-resumen">Documento descargable con información detallada sobre esta herramienta.</p>
                            <a href="${escaparHtml(herramienta.documento)}" target="_blank" class="herramienta-enlace-btn" rel="noopener noreferrer">
                                Descargar documento${AVISO_NUEVA_VENTANA}
                            </a>
                        </div>`
            : '';
        const enlacesItems = herramienta.enlaces && herramienta.enlaces.length > 0
            ? herramienta.enlaces.map(enlace => {
                const url = (enlace.url && enlace.url.trim() !== '') ? enlace.url : '';
                const linkBtn = url
                    ? `<a href="${escaparHtml(url)}" target="_blank" class="herramienta-enlace-btn" rel="noopener noreferrer">Ir al enlace${AVISO_NUEVA_VENTANA}</a>`
                    : '';
                return `
                        <div class="herramienta-enlace-item" role="listitem">
                            <span class="material-icons-outlined herramienta-enlace-icono" aria-hidden="true">link</span>
                            <h3 class="herramienta-enlace-titulo">${escaparHtml(enlace.titulo || 'Enlace externo')}</h3>
                            <p class="herramienta-enlace-resumen">${escaparHtml(enlace.resumen || 'Recurso adicional relacionado con esta herramienta.')}</p>
                            ${linkBtn}
                        </div>`;
            }).join('')
            : '';
        return `
            <div class="herramienta-enlaces-carousel-wrapper" role="region" aria-label="Enlaces y documentación" tabindex="0">
                <button type="button" class="herramienta-enlaces-prev" aria-label="Ver enlaces anteriores" disabled>
                    <span class="material-icons-outlined" aria-hidden="true">chevron_left</span>
                </button>
                <div class="herramienta-enlaces-inner">
                    <div class="herramienta-enlaces-container" role="list">${docBlock}${enlacesItems}</div>
                </div>
                <button type="button" class="herramienta-enlaces-next" aria-label="Ver siguientes enlaces">
                    <span class="material-icons-outlined" aria-hidden="true">chevron_right</span>
                </button>
                <span class="visually-hidden" aria-live="polite" aria-atomic="true" data-carousel-live></span>
                <div class="herramienta-enlaces-dots" aria-hidden="true"></div>
            </div>`;
    }
    return '<p class="herramienta-sin-enlaces">No hay enlaces o documentación adicional disponible.</p>';
}

function codificarRutaDescarga(ruta) {
    return ruta.split('/').map(seg => encodeURIComponent(seg)).join('/');
}

function nombreArchivoDesdeRuta(ruta) {
    return ruta.split('/').pop() || 'archivo';
}

/** Descarga vía fetch + blob (mismo criterio que el carrusel de plantillas). */
function ejecutarDescargaPlantillaDesdeBoton(btn) {
    const rutaOriginal = btn.getAttribute('data-descarga-url');
    if (!rutaOriginal) return;
    const nombreArchivo = nombreArchivoDesdeRuta(rutaOriginal);
    const urlCodificada = codificarRutaDescarga(rutaOriginal);
    fetch(urlCodificada)
        .then(res => {
            if (!res.ok) throw new Error(`No se pudo obtener el archivo (${res.status})`);
            return res.blob();
        })
        .then(blob => {
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = nombreArchivo;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
        })
        .catch(() => {
            window.location.href = urlCodificada;
        });
}

/** Una sola delegación en el contenedor del detalle (carrusel + bloque bajo pasos). */
function bindPlantillaDescargaDelegate(container) {
    if (!container || container.dataset.bindPlantillaDescarga === '1') return;
    container.dataset.bindPlantillaDescarga = '1';
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.herramienta-plantilla-btn[data-descarga-url]');
        if (!btn || !container.contains(btn)) return;
        e.preventDefault();
        ejecutarDescargaPlantillaDesdeBoton(btn);
    });
}

/** Herramienta 5: sección de plantilla debajo de pasos; visible solo al activar el paso 6 (índice 5). */
function renderSeccionPlantillaTrasPasos(herramienta) {
    if (herramienta.id !== 5) return '';
    const plantillas = Array.isArray(herramienta.plantilla) ? herramienta.plantilla : [];
    if (plantillas.length === 0) return '';

    const tituloSeccion = escaparHtml(herramienta.tituloPlantilla || 'Plantilla de ejemplo');
    const items = plantillas.map(p => {
        const url = (p.url && p.url.trim() !== '') ? p.url.trim() : '';
        const web = (p.web && p.web.trim() !== '') ? p.web.trim() : '';
        const descargaBtn = url
            ? `<a href="${codificarRutaDescarga(url)}"
                    download="${escaparHtml(nombreArchivoDesdeRuta(url))}"
                    class="herramienta-plantilla-btn"
                    data-descarga-url="${escaparHtml(url)}">
                    <span class="material-icons-outlined" aria-hidden="true">download</span>
                    Descargar archivo
                </a>`
            : '';
        const webBtn = web
            ? `<a href="${escaparHtml(web)}" target="_blank" rel="noopener noreferrer" class="herramienta-plantilla-btn">
                    <span class="material-icons-outlined" aria-hidden="true">open_in_new</span>
                    Ir a enlace${AVISO_NUEVA_VENTANA}
                </a>`
            : '';
        return `
            <div class="herramienta-plantilla-item herramienta-plantilla-item--descarga-paso6" role="listitem">
                <span class="material-icons-outlined herramienta-plantilla-icono" aria-hidden="true">article</span>
                <h3 class="herramienta-plantilla-titulo">${escaparHtml(p.nombrePlantilla || 'Plantilla')}</h3>
                <p class="herramienta-plantilla-descripcion">${escaparHtml(p.descripcion || '')}</p>
                ${descargaBtn}
                ${webBtn}
            </div>`;
    }).join('');

    return `
        <section class="herramienta-detail-plantilla-paso6" data-plantilla-paso6-section hidden aria-hidden="true" aria-labelledby="herramienta-plantilla-paso6-titulo">
            <div class="herramienta-detail-layout">
                <h2 id="herramienta-plantilla-paso6-titulo" class="herramienta-seccion-title">${tituloSeccion}</h2>
                <div class="herramienta-detail-plantilla-paso6-inner">
                    ${items}
                </div>
            </div>
        </section>`;
}

function renderPlantillasCarousel(herramienta) {
    const plantillas = Array.isArray(herramienta.plantilla) ? herramienta.plantilla : [];
    if (plantillas.length === 0) return '';

    const items = plantillas.map(p => {
        const url = (p.url && p.url.trim() !== '') ? p.url.trim() : '';
        const web = (p.web && p.web.trim() !== '') ? p.web.trim() : '';
        const descargaBtn = url
            ? `<a href="${codificarRutaDescarga(url)}"
                    download="${escaparHtml(nombreArchivoDesdeRuta(url))}"
                    class="herramienta-plantilla-btn"
                    data-descarga-url="${escaparHtml(url)}">
                    <span class="material-icons-outlined" aria-hidden="true">download</span>
                    Descargar archivo
                </a>`
            : '';
        const webBtn = web
            ? `<a href="${escaparHtml(web)}" target="_blank" rel="noopener noreferrer" class="herramienta-plantilla-btn">
                    <span class="material-icons-outlined" aria-hidden="true">open_in_new</span>
                    Ir a enlace${AVISO_NUEVA_VENTANA}
                </a>`
            : '';
        return `
                        <div class="herramienta-plantilla-item" role="listitem">
                            <span class="material-icons-outlined herramienta-plantilla-icono" aria-hidden="true">article</span>
                            <h3 class="herramienta-plantilla-titulo">${escaparHtml(p.nombrePlantilla || 'Plantilla')}</h3>
                            <p class="herramienta-plantilla-descripcion">${escaparHtml(p.descripcion || '')}</p>
                            ${descargaBtn}
                            ${webBtn}
                        </div>`;
    }).join('');

    return `
            <div class="herramienta-plantillas-carousel-wrapper" role="region" aria-label="Plantillas descargables" tabindex="0">
                <button type="button" class="herramienta-plantillas-prev" aria-label="Ver plantillas anteriores" disabled>
                    <span class="material-icons-outlined" aria-hidden="true">chevron_left</span>
                </button>
                <div class="herramienta-plantillas-inner">
                    <div class="herramienta-plantillas-container" role="list">${items}</div>
                </div>
                <button type="button" class="herramienta-plantillas-next" aria-label="Ver siguientes plantillas">
                    <span class="material-icons-outlined" aria-hidden="true">chevron_right</span>
                </button>
                <span class="visually-hidden" aria-live="polite" aria-atomic="true" data-plantillas-carousel-live></span>
                <div class="herramienta-plantillas-dots" aria-hidden="true"></div>
            </div>`;
}

function renderDetallePlantillas({ tituloPlantilla, plantillasHTML }) {
    return `
        <section class="herramienta-detail-plantillas">
            <div class="herramienta-detail-layout">
                <h2 class="herramienta-seccion-title">${escaparHtml(tituloPlantilla)}</h2>
                ${plantillasHTML}
            </div>
        </section>`;
}

function renderPasosBotones(pasos) {
    if (!pasos.length) return '<p>No se especifican pasos</p>';
    return pasos.map((paso, index) => {
        const esObjeto = typeof paso === 'object' && paso !== null;
        const textoPaso = esObjeto ? (paso.paso || '') : paso;
        const imagenPaso = esObjeto && paso.imagen ? paso.imagen : '';
        const descNorm = normalizarDescripcionPasos(paso);
        const descripcionJsonRaw = JSON.stringify(descNorm).replace(/'/g, '&#39;');
        const ariaLabelPaso = `Paso ${index + 1}: ${textoPaso}`;
        return `
                <button type="button" class="herramienta-paso-btn" data-paso-index="${index}" data-paso-imagen="${escaparHtml(imagenPaso)}" data-paso-descripcion-json='${descripcionJsonRaw}' aria-controls="herramienta-pasos-media herramienta-pasos-texto" aria-pressed="${index === 0 ? 'true' : 'false'}" aria-label="${escaparHtml(ariaLabelPaso)}" ${index === 0 ? 'data-active="true"' : ''}>
                    <span class="herramienta-paso-numero" aria-hidden="true">${index + 1}</span>
                    <span class="herramienta-paso-texto">${escaparHtml(textoPaso)}</span>
                </button>`;
    }).join('');
}

function renderTarjetasRelacionadas(otrasHerramientas) {
    if (!otrasHerramientas.length) return '';
    const cards = otrasHerramientas.map(h => {
        const colorHeader = obtenerColorPorCategoria(h.categoria);
        const colorVar = escaparHtml(colorHeader);
        const iconoUsuario = obtenerIconoFiltro('usuarios', h.usuarios[0] || '');
        const iconoUso = obtenerIconoFiltro('uso', h.uso[0] || '');
        const iconoTipo = obtenerIconoFiltro('tipo', h.tipo[0] || '');
        const descripcionResumen = h.descripcion.length > 100
            ? `${escaparHtml(h.descripcion.substring(0, 100))}...`
            : escaparHtml(h.descripcion);
        const caracteristicas = [];
        if (h.usuarios && h.usuarios.length > 0) {
            caracteristicas.push({ icono: iconoUsuario, texto: escaparHtml(h.usuarios[0]), prefijo: 'Quién: ' });
        }
        if (h.uso && h.uso.length > 0) {
            caracteristicas.push({ icono: iconoUso, texto: escaparHtml(h.uso[0]), prefijo: 'Uso: ' });
        }
        if (h.tipo && h.tipo.length > 0) {
            caracteristicas.push({ icono: iconoTipo, texto: escaparHtml(h.tipo[0]), prefijo: 'Tipo: ' });
        }
        const caracteristicasHTML = caracteristicas.map(c => `
                        <div class="card-feature">
                            <span class="material-icons-outlined card-feature-icon" aria-hidden="true">${c.icono}</span>
                            <span class="card-feature-text"><span class="card-feature-prefix">${c.prefijo}</span>${c.texto}</span>
                        </div>`).join('');
        return `
                        <div class="tool-card" data-id="${h.id}">
                            <div class="card-header card-header--categoria" style="--herramienta-categoria-bg: ${colorVar};">
                                <h3 class="card-title">${escaparHtml(h.titulo)}</h3>
                                <p class="card-summary">${descripcionResumen}</p>
                            </div>
                            <div class="card-body">
                                <div class="card-features">
                                    ${caracteristicasHTML}
                                </div>
                                <button type="button" class="card-button" aria-label="Conoce más: ${escaparHtml(h.titulo)}">
                                    Conoce más de la herramienta
                                </button>
                            </div>
                        </div>`;
    }).join('');
    return `<div class="tools-grid">${cards}</div>`;
}

function bindTarjetasRelacionadasNav(container) {
    container.addEventListener('click', e => {
        const btn = e.target.closest('.tool-card .card-button');
        if (!btn || btn.classList.contains('card-button-secondary')) return;
        const card = btn.closest('.tool-card');
        if (!card || !container.contains(card)) return;
        const id = card.getAttribute('data-id');
        if (id) window.location.href = `herramienta.html?id=${id}`;
    });
}

// Renderizar el contenido de la herramienta
function renderizarHerramienta(herramienta, todasLasHerramientas = []) {
    const container = document.getElementById('herramienta-container');
    const loader = document.getElementById('herramienta-loader');

    if (!herramienta) {
        if (loader) {
            loader.setAttribute('aria-busy', 'false');
            loader.setAttribute('role', 'alert');
            loader.removeAttribute('aria-live');
            loader.innerHTML = `
            <span class="material-icons-outlined" aria-hidden="true">error_outline</span>
            <p>Herramienta no encontrada</p>
            <a href="index.html" class="btn-volver">Volver al inicio</a>
        `;
            enfocarPrimerVolver(loader);
        }
        return;
    }

    const colorFondo = obtenerColorPorCategoria(herramienta.categoria);
    const tieneImagen = herramienta.imagen && herramienta.imagen.trim() !== '';
    const icono = obtenerIconoPorTipo(herramienta.tipo);

    // Obtener iconos para características
    const iconoUsuario = obtenerIconoFiltro('usuarios', herramienta.usuarios[0] || '');
    const iconoUso = obtenerIconoFiltro('uso', herramienta.uso[0] || '');
    const iconoTipo = obtenerIconoFiltro('tipo', herramienta.tipo[0] || '');

    const usuariosTexto = Array.isArray(herramienta.usuarios) && herramienta.usuarios.length > 0
        ? herramienta.usuarios.join(' | ')
        : 'N/A';
    const usoTexto = Array.isArray(herramienta.uso) && herramienta.uso.length > 0
        ? herramienta.uso.join(' | ')
        : 'N/A';
    const tipoTexto = Array.isArray(herramienta.tipo) && herramienta.tipo.length > 0
        ? herramienta.tipo.join(' | ')
        : 'N/A';

    // Categoría (string en el JSON)
    const categoria = typeof herramienta.categoria === 'string' && herramienta.categoria.trim() !== ''
        ? herramienta.categoria
        : 'Herramienta';

    const imagenHeader = tieneImagen
        ? `<img src="${escaparHtml(herramienta.imagen)}" alt="${escaparHtml(herramienta.titulo)}" class="herramienta-header-image" />`
        : `<span class="material-icons-outlined herramienta-header-icon" aria-hidden="true">${icono}</span>`;

    const antesDeEmpezar = herramienta.antesDeEmpezar || [];
    const tituloAntesDeEmpezar = herramienta.tituloAntesDeEmpezar || 'Antes de empezar';
    const prepAccordionHTML = renderDetallePrepAccordion({
        antesDeEmpezar,
        tituloAntesDeEmpezar,
        recuerdaQue1: herramienta.recuerdaQue1 || []
    });

    const recuerdaQue2HTML = renderBloqueRecuerdaQue(herramienta.recuerdaQue2 || []);
    const recuerdaQue3HTML = renderBloqueRecuerdaQue(herramienta.recuerdaQue3 || []);

    const requisitos = herramienta.requisitos || [];
    const tieneRequisitos = requisitos.length > 0;
    const tieneMateriales = herramienta.materiales && herramienta.materiales.length > 0;
    const tieneRequisitosOMateriales = tieneRequisitos || tieneMateriales;

    const requisitosHTML = renderListaRequisitos(requisitos);
    const materialesHTML = tieneMateriales
        ? herramienta.materiales.map(m => `<li>${escaparHtml(m)}</li>`).join('')
        : '';

    const pasos = Array.isArray(herramienta.pasos) ? herramienta.pasos : [];
    const primerPaso = pasos.length > 0 && typeof pasos[0] === 'object' ? pasos[0] : null;
    const primeraImagenHTML = primerPaso
        ? buildPasosMediaFromPaso(primerPaso, herramienta.titulo, imagenHeader)
        : imagenHeader;
    const primerPasoUsaCarrusel = primerPaso && !(primerPaso.imagen && primerPaso.imagen.trim() !== '') && descripcionTieneImagenes(normalizarDescripcionPasos(primerPaso));
    const primeraDescripcionHTML = primerPaso && !primerPasoUsaCarrusel
        ? buildPasosDescripcionParrafosFromNorm(normalizarDescripcionPasos(primerPaso))
        : '';
    const tienePrimeraDescripcion = primeraDescripcionHTML.length > 0;

    const tienePlantillas = Array.isArray(herramienta.plantilla) && herramienta.plantilla.length > 0;
    const seccionPlantillaTrasPasosHtml = (herramienta.id === 5 && tienePlantillas)
        ? renderSeccionPlantillaTrasPasos(herramienta)
        : '';
    const pasosBotonesHTML = renderPasosBotones(pasos);

    const tituloEnlaces = herramienta.tituloEnlaces || 'Enlaces y documentación adicionales';
    const enlacesInnerHTML = renderEnlacesCarousel(herramienta);

    const tituloPlantilla = herramienta.tituloPlantilla || 'Plantillas';
    const plantillasSeccionHTML = (tienePlantillas && herramienta.id !== 5)
        ? renderDetallePlantillas({ tituloPlantilla, plantillasHTML: renderPlantillasCarousel(herramienta) })
        : '';

    const otrasHerramientas = todasLasHerramientas.length > 0
        ? obtenerHerramientasAleatorias(todasLasHerramientas, herramienta, 3)
        : [];
    const otrasHTML = renderTarjetasRelacionadas(otrasHerramientas);

    const requisitosSeccionHTML = tieneRequisitosOMateriales
        ? renderDetalleRequisitosMateriales({ requisitosHTML, materialesHTML, tieneMateriales })
        : '';

    const pasosSeccionHTML = renderDetallePasos({
        tituloPasos: herramienta.tituloPasos || 'Pasos',
        iconoPlaceholder: icono,
        primeraImagenHTML,
        primeraDescripcionHTML,
        tienePrimeraDescripcion,
        pasosHTML: pasosBotonesHTML
    });

    const subtituloEnlaces = herramienta.subtituloEnlaces != null ? String(herramienta.subtituloEnlaces) : '';
    const enlacesSeccionHTML = renderDetalleEnlaces({
        tituloEnlaces,
        subtituloEnlaces,
        enlacesHTML: enlacesInnerHTML
    });

    const relacionadasHTML = otrasHerramientas.length > 0 ? renderDetalleRelacionadas(otrasHTML) : '';

    const bloquePasos = `${pasosSeccionHTML}${seccionPlantillaTrasPasosHtml}${recuerdaQue2HTML}`;
    const bloqueEnlacesYRecursos = `${enlacesSeccionHTML}${plantillasSeccionHTML}${recuerdaQue3HTML}`;

    container.innerHTML = `
        ${renderDetalleHero({
            categoria,
            colorFondo,
            titulo: herramienta.titulo,
            descripcion: herramienta.descripcion,
            usuariosTexto,
            usoTexto,
            tipoTexto,
            iconoUsuario,
            iconoUso,
            iconoTipo,
            imagenHeader
        })}
        ${bloquePasos}
        ${prepAccordionHTML}
        ${requisitosSeccionHTML}
        ${bloqueEnlacesYRecursos}
        ${relacionadasHTML}
        ${renderDetalleBanner()}
    `;

    configurarEnlacesNuevaPestana(container);
    bindTarjetasRelacionadasNav(container);
    bindPlantillaDescargaDelegate(container);

    inicializarAcordeonPrep(container);

    inicializarCarruselEnlaces(container);
    inicializarCarruselPlantillas(container);

    // Inicializar funcionalidad de pasos (cambiar imagen al hacer clic)
    if (herramienta.pasos && herramienta.pasos.length > 0) {
        inicializarPasos();
    }

    // Inicializar toggle switch de Requisitos/Materiales
    inicializarSwitch();

    // Actualizar título de la página
    document.title = `${herramienta.titulo} - Caja de Herramientas Bancolombia`;

    // Foco en el h1 del detalle (WCAG 2.4.3) tras pintar e inicializar widgets
    requestAnimationFrame(() => {
        requestAnimationFrame(() => enfocarTituloDetalleHerramienta(container));
    });
}

/**
 * Acordeón de preparación: todos cerrados al inicio; como máximo uno abierto.
 * Clic en un cerrado abre solo ese y cierra el resto; clic en el abierto lo cierra.
 */
function inicializarAcordeonPrep(container) {
    const root = container.querySelector('[data-herramienta-prep-accordion]');
    if (!root) return;

    const items = [...root.querySelectorAll('.herramienta-prep-accordion-item')];
    const pairs = items
        .map((item) => {
            const btn = item.querySelector('.herramienta-prep-accordion-trigger');
            const panel = item.querySelector('.herramienta-prep-accordion-panel');
            return btn && panel ? { btn, panel } : null;
        })
        .filter(Boolean);

    if (pairs.length === 0) return;

    /** @param {number} index índice abierto, o -1 para cerrar todos */
    function setOpenIndex(index) {
        pairs.forEach(({ btn, panel }, i) => {
            const open = i === index;
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) panel.removeAttribute('hidden');
            else panel.setAttribute('hidden', '');
        });
    }

    pairs.forEach(({ btn }, i) => {
        btn.addEventListener('click', () => {
            const isOpen = btn.getAttribute('aria-expanded') === 'true';
            setOpenIndex(isOpen ? -1 : i);
            requestAnimationFrame(() => {
                window.dispatchEvent(new Event('resize'));
            });
        });
    });
}

/**
 * Inicializa el carrusel de la sección "Enlaces y documentación": muestra 3 tarjetas y flechas prev/next
 */
function inicializarCarruselEnlaces(container) {
    const wrapper = container.querySelector('.herramienta-enlaces-carousel-wrapper');
    if (!wrapper) return;

    if (wrapper.dataset.herramientaEnlacesCarouselInit === '1') {
        requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
        return;
    }

    const inner = wrapper.querySelector('.herramienta-enlaces-inner');
    const track = wrapper.querySelector('.herramienta-enlaces-container');
    const prevBtn = wrapper.querySelector('.herramienta-enlaces-prev');
    const nextBtn = wrapper.querySelector('.herramienta-enlaces-next');
    const dotsContainer = wrapper.querySelector('.herramienta-enlaces-dots');
    const cards = track ? track.querySelectorAll('.herramienta-enlace-item') : [];

    if (!track || cards.length === 0) {
        wrapper.dataset.herramientaEnlacesCarouselInit = '1';
        return;
    }

    const totalCards = cards.length;

    if (totalCards <= 3) {
        wrapper.classList.add('enlaces-sin-carrusel');
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (dotsContainer) dotsContainer.style.display = 'none';
        wrapper.dataset.herramientaEnlacesCarouselInit = '1';
        return;
    }

    let currentIndex = 0;
    let lastVisibleCount = null;
    let lastTotalPages = null;

    function getTotalPages(visibleCount) {
        return Math.max(1, Math.ceil(totalCards / visibleCount));
    }

    function getVisibleCount() {
        const viewport = inner && inner.offsetWidth ? inner : wrapper;
        const viewportWidth = viewport.offsetWidth;
        const cardWidth = cards[0].offsetWidth;

        const gap = cards.length > 1
            ? (cards[1].offsetLeft - cards[0].offsetLeft - cards[0].offsetWidth)
            : 24;

        if (cardWidth <= 0) return 3;

        const count = Math.floor((viewportWidth + gap) / (cardWidth + gap));

        return Math.min(Math.max(count, 1), totalCards);
    }

    function ensureDots(visibleCount) {
        if (!dotsContainer) return;
        const totalPages = getTotalPages(visibleCount);
        const shouldRebuild = lastVisibleCount !== visibleCount || lastTotalPages !== totalPages;
        if (!shouldRebuild) return;

        dotsContainer.innerHTML = '';
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'herramienta-enlaces-dot';
            dot.setAttribute('aria-label', `Ver grupo ${i + 1} de enlaces`);
            dot.dataset.pageIndex = String(i);
            dotsContainer.appendChild(dot);
        }

        if (totalPages > 1) dotsContainer.removeAttribute('aria-hidden');
        else dotsContainer.setAttribute('aria-hidden', 'true');

        lastVisibleCount = visibleCount;
        lastTotalPages = totalPages;
    }

    function actualizarEstadoDots(visibleCount) {
        if (!dotsContainer) return;
        const dots = dotsContainer.querySelectorAll('.herramienta-enlaces-dot');
        if (dots.length === 0) return;

        const page = Math.floor(currentIndex / visibleCount);
        dots.forEach((dot, index) => {
            if (index === page) {
                dot.setAttribute('aria-current', 'true');
            } else {
                dot.removeAttribute('aria-current');
            }
        });
    }

    const liveRegionEnlaces = wrapper.querySelector('[data-carousel-live]');
    function updateCarousel(visibleCountParam) {
        const cardWidth = cards[0].offsetWidth;
        const gap = cards.length > 1
            ? (cards[1].offsetLeft - cards[0].offsetLeft - cards[0].offsetWidth)
            : 24;
        const visibleCount = visibleCountParam != null ? visibleCountParam : getVisibleCount();
        const maxIndex = Math.max(0, totalCards - visibleCount);
        if (currentIndex > maxIndex) currentIndex = maxIndex;
        if (currentIndex < 0) currentIndex = 0;
        const offset = currentIndex * (cardWidth + gap);
        track.style.transform = `translateX(-${offset}px)`;

        if (prevBtn) {
            prevBtn.disabled = currentIndex === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = currentIndex >= maxIndex;
        }

        actualizarEstadoDots(visibleCount);
        if (liveRegionEnlaces) {
            const page = Math.floor(currentIndex / visibleCount) + 1;
            liveRegionEnlaces.textContent = `Enlace ${page} de ${getTotalPages(visibleCount)}`;
        }
    }

    function syncCarouselAndDots() {
        const visibleCount = getVisibleCount();
        ensureDots(visibleCount);
        updateCarousel(visibleCount);
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel(lastVisibleCount != null ? lastVisibleCount : undefined);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const visibleCount = lastVisibleCount != null ? lastVisibleCount : getVisibleCount();
            const maxIndex = Math.max(0, totalCards - visibleCount);
            if (currentIndex < maxIndex) {
                currentIndex++;
                updateCarousel(visibleCount);
            }
        });
    }

    wrapper.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); if (prevBtn && !prevBtn.disabled) prevBtn.click(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); if (nextBtn && !nextBtn.disabled) nextBtn.click(); }
    });

    if (dotsContainer) {
        dotsContainer.addEventListener('click', (e) => {
            const dot = e.target.closest('.herramienta-enlaces-dot');
            if (!dot || !dotsContainer.contains(dot)) return;
            const pageIndex = parseInt(dot.dataset.pageIndex || '0', 10);
            const visibleCount = getVisibleCount();
            const maxIndex = Math.max(0, totalCards - visibleCount);
            const nextIndex = pageIndex * visibleCount;
            currentIndex = Math.min(Math.max(nextIndex, 0), maxIndex);
            ensureDots(visibleCount);
            updateCarousel(visibleCount);
        });
    }

    syncCarouselAndDots();

    window.addEventListener('resize', () => {
        const visibleCount = getVisibleCount();
        const maxIndex = Math.max(0, totalCards - visibleCount);
        if (currentIndex > maxIndex) currentIndex = maxIndex;
        ensureDots(visibleCount);
        updateCarousel(visibleCount);
    });

    wrapper.dataset.herramientaEnlacesCarouselInit = '1';
}

/**
 * Inicializa el carrusel de la sección "Plantillas": muestra 3 tarjetas con flechas prev/next
 */
function inicializarCarruselPlantillas(container) {
    const wrapper = container.querySelector('.herramienta-plantillas-carousel-wrapper');
    if (!wrapper) return;

    if (wrapper.dataset.herramientaPlantillasCarouselInit === '1') {
        requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
        return;
    }

    const inner = wrapper.querySelector('.herramienta-plantillas-inner');
    const track = wrapper.querySelector('.herramienta-plantillas-container');
    const prevBtn = wrapper.querySelector('.herramienta-plantillas-prev');
    const nextBtn = wrapper.querySelector('.herramienta-plantillas-next');
    const dotsContainer = wrapper.querySelector('.herramienta-plantillas-dots');
    const cards = track ? track.querySelectorAll('.herramienta-plantilla-item') : [];

    if (!track || cards.length === 0) {
        wrapper.dataset.herramientaPlantillasCarouselInit = '1';
        return;
    }

    const totalCards = cards.length;

    if (totalCards <= 3) {
        wrapper.classList.add('plantillas-sin-carrusel');
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (dotsContainer) dotsContainer.style.display = 'none';
        wrapper.dataset.herramientaPlantillasCarouselInit = '1';
        return;
    }

    let currentIndex = 0;
    let lastVisibleCount = null;
    let lastTotalPages = null;

    function getTotalPages(visibleCount) {
        return Math.max(1, Math.ceil(totalCards / visibleCount));
    }

    function getVisibleCount() {
        const viewport = inner && inner.offsetWidth ? inner : wrapper;
        const viewportWidth = viewport.offsetWidth;
        const cardWidth = cards[0].offsetWidth;
        const gap = cards.length > 1
            ? (cards[1].offsetLeft - cards[0].offsetLeft - cards[0].offsetWidth)
            : 24;
        if (cardWidth <= 0) return 3;
        const count = Math.floor((viewportWidth + gap) / (cardWidth + gap));
        return Math.min(Math.max(count, 1), totalCards);
    }

    function ensureDots(visibleCount) {
        if (!dotsContainer) return;
        const totalPages = getTotalPages(visibleCount);
        const shouldRebuild = lastVisibleCount !== visibleCount || lastTotalPages !== totalPages;
        if (!shouldRebuild) return;

        dotsContainer.innerHTML = '';
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'herramienta-plantillas-dot';
            dot.setAttribute('aria-label', `Ver grupo ${i + 1} de plantillas`);
            dot.dataset.pageIndex = String(i);
            dotsContainer.appendChild(dot);
        }
        if (totalPages > 1) dotsContainer.removeAttribute('aria-hidden');
        else dotsContainer.setAttribute('aria-hidden', 'true');

        lastVisibleCount = visibleCount;
        lastTotalPages = totalPages;
    }

    function actualizarEstadoDots(visibleCount) {
        if (!dotsContainer) return;
        const dots = dotsContainer.querySelectorAll('.herramienta-plantillas-dot');
        if (dots.length === 0) return;
        const page = Math.floor(currentIndex / visibleCount);
        dots.forEach((dot, index) => {
            if (index === page) dot.setAttribute('aria-current', 'true');
            else dot.removeAttribute('aria-current');
        });
    }

    const liveRegion = wrapper.querySelector('[data-plantillas-carousel-live]');
    function updateCarousel(visibleCountParam) {
        const cardWidth = cards[0].offsetWidth;
        const gap = cards.length > 1
            ? (cards[1].offsetLeft - cards[0].offsetLeft - cards[0].offsetWidth)
            : 24;
        const visibleCount = visibleCountParam != null ? visibleCountParam : getVisibleCount();
        const maxIndex = Math.max(0, totalCards - visibleCount);
        if (currentIndex > maxIndex) currentIndex = maxIndex;
        if (currentIndex < 0) currentIndex = 0;
        const offset = currentIndex * (cardWidth + gap);
        track.style.transform = `translateX(-${offset}px)`;
        if (prevBtn) prevBtn.disabled = currentIndex === 0;
        if (nextBtn) nextBtn.disabled = currentIndex >= maxIndex;
        actualizarEstadoDots(visibleCount);
        if (liveRegion) {
            const page = Math.floor(currentIndex / visibleCount) + 1;
            liveRegion.textContent = `Plantilla ${page} de ${getTotalPages(visibleCount)}`;
        }
    }

    function syncCarouselAndDots() {
        const visibleCount = getVisibleCount();
        ensureDots(visibleCount);
        updateCarousel(visibleCount);
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) { currentIndex--; updateCarousel(lastVisibleCount != null ? lastVisibleCount : undefined); }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const visibleCount = lastVisibleCount != null ? lastVisibleCount : getVisibleCount();
            const maxIndex = Math.max(0, totalCards - visibleCount);
            if (currentIndex < maxIndex) { currentIndex++; updateCarousel(visibleCount); }
        });
    }

    wrapper.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); if (prevBtn && !prevBtn.disabled) prevBtn.click(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); if (nextBtn && !nextBtn.disabled) nextBtn.click(); }
    });

    if (dotsContainer) {
        dotsContainer.addEventListener('click', (e) => {
            const dot = e.target.closest('.herramienta-plantillas-dot');
            if (!dot || !dotsContainer.contains(dot)) return;
            const pageIndex = parseInt(dot.dataset.pageIndex || '0', 10);
            const visibleCount = getVisibleCount();
            const maxIndex = Math.max(0, totalCards - visibleCount);
            const nextIndex = pageIndex * visibleCount;
            currentIndex = Math.min(Math.max(nextIndex, 0), maxIndex);
            ensureDots(visibleCount);
            updateCarousel(visibleCount);
        });
    }

    syncCarouselAndDots();

    window.addEventListener('resize', () => {
        const visibleCount = getVisibleCount();
        const maxIndex = Math.max(0, totalCards - visibleCount);
        if (currentIndex > maxIndex) currentIndex = maxIndex;
        ensureDots(visibleCount);
        updateCarousel(visibleCount);
    });

    wrapper.dataset.herramientaPlantillasCarouselInit = '1';
}

/**
 * Configura los enlaces de "Ver en nueva ventana" para no redirigir la pestaña actual
 */
function configurarEnlacesNuevaPestana(container) {
    const enlaces = container.querySelectorAll('.card-button-secondary');
    enlaces.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(link.href, '_blank', 'noopener,noreferrer');
        });
    });
}

// Función para inicializar la funcionalidad de los pasos
function inicializarPasos() {
    const pasoButtons = document.querySelectorAll('.herramienta-paso-btn');
    const imagenContainer = document.querySelector('.herramienta-pasos-imagen');
    const descripcionContainer = document.querySelector('.herramienta-pasos-descripcion');
    const seccionPasos = imagenContainer ? imagenContainer.closest(SEL_SECCION_PASOS) : document.querySelector(SEL_SECCION_PASOS);
    const placeholderIcon = (seccionPasos && seccionPasos.getAttribute('data-paso-placeholder-icon')) || 'lightbulb_outline';
    const iconoFallbackHtml = `<span class="material-icons-outlined herramienta-header-icon" aria-hidden="true">${escaparHtml(placeholderIcon)}</span>`;

    if (!imagenContainer || pasoButtons.length === 0) return;

    const seccionPlantillaPaso6 = document.querySelector('[data-plantilla-paso6-section]');

    function sincronizarVisibilidadPlantillaEjemplo(btn) {
        if (!seccionPlantillaPaso6) return;
        const idx = parseInt(btn.getAttribute('data-paso-index') || '0', 10);
        const enPaso6 = idx === 5;
        if (enPaso6) {
            seccionPlantillaPaso6.removeAttribute('hidden');
            seccionPlantillaPaso6.setAttribute('aria-hidden', 'false');
        } else {
            seccionPlantillaPaso6.setAttribute('hidden', '');
            seccionPlantillaPaso6.setAttribute('aria-hidden', 'true');
        }
    }

    function buildPasosImagenAreaFromData(imagenPaso, descripcionJson, tituloHerramienta) {
        const tituloBase = tituloHerramienta || document.title.replace(' - Caja de Herramientas Bancolombia', '');
        const desc = parseDescripcionJsonAttr(descripcionJson);
        return buildPasosMediaHtml(imagenPaso, desc, tituloBase, placeholderIcon, iconoFallbackHtml);
    }

    function pasoUsaCarrusel(imagenPaso, descripcionJson) {
        if (imagenPaso && imagenPaso.trim() !== '') return false;
        const desc = parseDescripcionJsonAttr(descripcionJson);
        return desc.some(item => item && item.imagen && item.imagen.trim() !== '');
    }

    function actualizarImagenYDescripcionDesdeBoton(btn) {
        const imagenPaso = (btn.getAttribute('data-paso-imagen') || '').trim();
        const descripcionJson = btn.getAttribute('data-paso-descripcion-json') || '';
        const tituloBase = document.title.replace(' - Caja de Herramientas Bancolombia', '');

        imagenContainer.innerHTML = buildPasosImagenAreaFromData(imagenPaso, descripcionJson, tituloBase);

        const wrapper = imagenContainer.querySelector('.herramienta-pasos-carrusel-wrapper');
        if (wrapper) inicializarCarruselPasos(imagenContainer);

        if (descripcionContainer) {
            const esCarrusel = pasoUsaCarrusel(imagenPaso, descripcionJson);
            if (esCarrusel) {
                descripcionContainer.innerHTML = '';
                descripcionContainer.classList.add('is-hidden');
            } else {
                const descHTML = buildPasosDescripcionParrafosFromNorm(parseDescripcionJsonAttr(descripcionJson));
                if (descHTML) {
                    descripcionContainer.innerHTML = descHTML;
                    descripcionContainer.classList.remove('is-hidden');
                } else {
                    descripcionContainer.innerHTML = '';
                    descripcionContainer.classList.add('is-hidden');
                }
            }
        }
    }

    pasoButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            pasoButtons.forEach(b => {
                b.removeAttribute('data-active');
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.setAttribute('data-active', 'true');
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            actualizarImagenYDescripcionDesdeBoton(btn);
            sincronizarVisibilidadPlantillaEjemplo(btn);
        });
    });

    const primerBoton = pasoButtons[0];
    if (primerBoton) {
        primerBoton.classList.add('active');
        actualizarImagenYDescripcionDesdeBoton(primerBoton);
        sincronizarVisibilidadPlantillaEjemplo(primerBoton);
    }
}

/**
 * Inicializa el carrusel dentro de .herramienta-pasos-imagen (cuando el paso tiene descripcion[].imagen sin paso.imagen)
 */
function inicializarCarruselPasos(imagenContainer) {
    const wrapper = imagenContainer.querySelector('.herramienta-pasos-carrusel-wrapper');
    if (!wrapper) return;
    const track = wrapper.querySelector('.herramienta-pasos-carrusel-container');
    const prevBtn = wrapper.querySelector('.herramienta-pasos-carrusel-prev');
    const nextBtn = wrapper.querySelector('.herramienta-pasos-carrusel-next');
    const dotsContainer = wrapper.querySelector('.herramienta-pasos-carrusel-dots');
    const liveRegionPasos = wrapper.querySelector('[data-carousel-live]');
    const slides = track ? track.querySelectorAll('.herramienta-pasos-carrusel-item') : [];
    if (!track || slides.length === 0) return;
    const total = slides.length;
    let currentIndex = 0;

    function updateCarousel() {
        const offset = currentIndex * 100;
        track.style.transform = `translateX(-${offset}%)`;
        track.style.transition = 'transform 0.3s ease';
        if (prevBtn) prevBtn.disabled = currentIndex === 0;
        if (nextBtn) nextBtn.disabled = currentIndex >= total - 1;
        if (dotsContainer) {
            const dots = dotsContainer.querySelectorAll('.herramienta-pasos-carrusel-dot');
            dots.forEach((d, i) => d.setAttribute('aria-current', i === currentIndex ? 'true' : 'false'));
        }
        if (liveRegionPasos) {
            liveRegionPasos.textContent = `Imagen ${currentIndex + 1} de ${total}`;
        }
    }
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        for (let i = 0; i < total; i++) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'herramienta-pasos-carrusel-dot';
            dot.setAttribute('aria-label', `Imagen ${i + 1} de ${total}`);
            dot.dataset.index = String(i);
            dotsContainer.appendChild(dot);
            dot.addEventListener('click', () => {
                currentIndex = i;
                updateCarousel();
            });
        }
        if (total > 1) {
            dotsContainer.removeAttribute('aria-hidden');
        }
    }
    if (prevBtn) prevBtn.addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; updateCarousel(); } });
    if (nextBtn) nextBtn.addEventListener('click', () => { if (currentIndex < total - 1) { currentIndex++; updateCarousel(); } });
    wrapper.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); if (prevBtn && !prevBtn.disabled) prevBtn.click(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); if (nextBtn && !nextBtn.disabled) nextBtn.click(); }
    });
    updateCarousel();
}

// Función para inicializar el toggle switch de Requisitos/Materiales
function inicializarSwitch() {
    const toggleInput = document.getElementById('herramienta-toggle');
    const requisitosContainer = document.querySelector('.herramienta-switch-content [data-content="requisitos"]');
    const materialesContainer = document.querySelector('.herramienta-switch-content [data-content="materiales"]');

    if (!toggleInput || !requisitosContainer || !materialesContainer) return;

    function cambiarContenido(mostrarRequisitos) {
        requisitosContainer.classList.toggle('is-hidden', !mostrarRequisitos);
        materialesContainer.classList.toggle('is-hidden', mostrarRequisitos);
    }

    requisitosContainer.classList.remove('is-hidden');
    materialesContainer.classList.add('is-hidden');

    toggleInput.addEventListener('change', (e) => {
        cambiarContenido(!e.target.checked);
    });
}

// Función auxiliar para obtener icono de filtro
function obtenerIconoFiltro(tipo, valor) {
    const iconosPorTipo = {
        'usuarios': {
            'Diseñador': 'palette',
            'Desarrollador': 'code',
            'Creador de contenido': 'create',
            'Asesor': 'support_agent',
            'Equipo de trabajo': 'groups',
            'Transversal': 'public'
        },
        'uso': {
            'Área del banco 1': 'business',
            'Área del banco 2': 'corporate_fare',
            'Área del banco 3': 'domain'
        },
        'tipo': {
            'Manual de uso': 'menu_book',
            'Infografías': 'image',
            'Enlaces externos': 'link',
            'Guías': 'description'
        }
    };

    const defaultPorTipo = {
        usuarios: 'person',
        uso: 'apartment',
        tipo: 'description'
    };

    return iconosPorTipo[tipo]?.[valor] || defaultPorTipo[tipo] || 'help_outline';
}

// Inicializar página
async function init() {
    try {
        const id = obtenerIdDeURL();

        if (id === null) {
            renderizarHerramienta(null);
            return;
        }

        const herramientas = await cargarHerramientas();
        const herramienta = herramientas.find(h => h.id === id);

        renderizarHerramienta(herramienta, herramientas);

    } catch (error) {
        console.error('Error al inicializar:', error);
        const loader = document.getElementById('herramienta-loader');
        if (loader) {
            loader.setAttribute('aria-busy', 'false');
            loader.setAttribute('role', 'alert');
            loader.removeAttribute('aria-live');
            loader.innerHTML = `
                <span class="material-icons-outlined" aria-hidden="true">error_outline</span>
                <p>Error al cargar la herramienta</p>
                <a href="index.html" class="btn-volver">Volver al inicio</a>
            `;
            enfocarPrimerVolver(loader);
        }
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
