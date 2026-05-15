/**
 * Caja de Herramientas - Aplicación Principal
 * Carga dinámica de herramientas desde JSON y sistema de filtros
 * 
 * ACTUALIZACIÓN: Nuevos filtros basados en checkboxes
 * - ¿Quién va a usar la herramienta? (usuarios)
 * - ¿Para qué lo usarás? (uso)
 * - ¿Qué tipo de herramienta buscas? (tipo)
 */

// Estado global de la aplicación
let herramientas = [];
let herramientasFiltradas = [];
let favoritosIds = new Set();
let soloFavoritos = false;

const FAVORITES_STORAGE_KEY = 'herramientasFavoritas';

// Variable para guardar el elemento que abrió el modal (gestión de foco)
let lastFocusedCard = null;
let modalScrollY = 0;
let filtrosActivos = {
    usuarios: [],
    uso: [],
    tipo: []
};

// Elementos del DOM
const toolsGrid = document.getElementById('tools-grid');
const noResults = document.getElementById('no-results');
const modal = document.getElementById('modal');
const modalOverlay = document.querySelector('.modal-overlay');
const modalClose = document.querySelector('.modal-close');
const favoritesSection = document.getElementById('favorites-section');
const favoritesGrid = document.getElementById('favorites-grid');
const favoritesEmpty = document.getElementById('favorites-empty');
const favoritesDropdown = document.querySelector('.favoritos-dropdown');
const favoritesToggle = document.getElementById('btn-filtro-favoritos-toggle');
const favoritesOptionButtons = document.querySelectorAll('[data-favoritos-action]');

/**
 * Accesibilidad: fuerza consistencia entre aria-hidden y focus interno (excepto #modal, que usa `hidden`).
 * Reglas:
 * - Si el contenedor está oculto, aria-hidden="true" + inert y focusables con tabindex="-1"
 * - Si está visible, se quitan aria-hidden e inert y se restauran tabindex
 */
function setContainerFocusableState(container, tabbable) {
    const focusableSelector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]'
    ].join(', ');
    const focusables = Array.from(container.querySelectorAll(focusableSelector));
    focusables.forEach(el => {
        if (!tabbable) {
            if (!el.dataset.prevTabindex) {
                const prev = el.getAttribute('tabindex');
                // tabindex="-1" en HTML sirve para audit estático: al abrir el modal se restaura como elemento nativo (sin tabindex)
                if (prev === null || prev === '' || prev === '-1') {
                    el.dataset.prevTabindex = '__none__';
                } else {
                    el.dataset.prevTabindex = prev;
                }
            }
            el.setAttribute('tabindex', '-1');
            return;
        }

        const prev = el.dataset.prevTabindex;
        if (!prev) return;

        if (prev === '__none__') el.removeAttribute('tabindex');
        else el.setAttribute('tabindex', prev);
        delete el.dataset.prevTabindex;
    });
}

function syncAriaHiddenAndFocus(container) {
    if (!container) return;
    // #modal se oculta con `hidden` (sin aria-hidden en el raíz) para evitar
    // a11y/aria-hidden-focus en audits estáticos y en axe.
    if (container.id === 'modal') {
        return;
    }

    const isHiddenByAria = container.getAttribute('aria-hidden') === 'true';
    const isHiddenByStyle = container.style.display === 'none';
    const computed = window.getComputedStyle(container);
    const isHiddenByComputed = computed.display === 'none' || computed.visibility === 'hidden';
    const shouldBeHidden = isHiddenByAria || isHiddenByStyle || isHiddenByComputed;

    if (shouldBeHidden) {
        container.setAttribute('aria-hidden', 'true');
        container.setAttribute('inert', '');
        setContainerFocusableState(container, false);
        return;
    }

    container.removeAttribute('aria-hidden');
    container.removeAttribute('inert');
    setContainerFocusableState(container, true);
}

/**
 * Inicialización de la aplicación
 */
async function init() {
    try {
        // Cargar herramientas desde JSON
        await cargarHerramientas();
        cargarFavoritosDesdeStorage();
        
        const esPaginaHerramientas = document.body.classList.contains('page-herramientas');
        
        // No inicializar filtros del main content (ya no existen, solo usamos filtros rápidos)
        // inicializarFiltros();
        
        if (esPaginaHerramientas) {
            construirFiltrosDropdown();
            inicializarFiltros();
            actualizarContadoresFiltros();
            actualizarBotonLimpiar();
            herramientasFiltradas = [...herramientas];
            const toolsSection = document.querySelector('.tools-section');
            if (toolsSection) {
                toolsSection.style.display = 'block';
            }
            renderizarFavoritos();
            actualizarEstadoFiltroFavoritos();
            renderizarHerramientasActuales();
        }
        
        // Configurar event listeners
        configurarEventListeners();
        
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        mostrarError('No se pudieron cargar las herramientas. Por favor, recarga la página.');
    }
}

function cargarFavoritosDesdeStorage() {
    try {
        const data = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]');
        if (Array.isArray(data)) {
            favoritosIds = new Set(data.map(id => id.toString()));
        } else {
            favoritosIds = new Set();
        }
    } catch (error) {
        console.warn('No se pudieron cargar los favoritos:', error);
        favoritosIds = new Set();
    }
}

function guardarFavoritosEnStorage() {
    try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favoritosIds]));
    } catch (error) {
        console.warn('No se pudieron guardar los favoritos:', error);
    }
}

function esHerramientaFavorita(id) {
    return favoritosIds.has(id.toString());
}

function obtenerHerramientasVisibles(herramientasArray) {
    const base = Array.isArray(herramientasArray) ? herramientasArray : [];
    if (!soloFavoritos) return base;
    return base.filter(h => esHerramientaFavorita(h.id));
}

function actualizarEstadoFiltroFavoritos() {
    if (favoritesDropdown) {
        favoritesDropdown.classList.toggle('has-selection', soloFavoritos);
    }

    favoritesOptionButtons.forEach(button => {
        const accion = button.getAttribute('data-favoritos-action');
        const esActivo = (accion === 'show' && soloFavoritos) || (accion === 'hide' && !soloFavoritos);
        button.classList.toggle('active', esActivo);
    });

    if (favoritesSection) {
        favoritesSection.style.display = soloFavoritos ? 'block' : 'none';
    }

    if (toolsGrid) {
        toolsGrid.style.display = soloFavoritos ? 'none' : 'grid';
    }

    if (noResults) {
        noResults.style.display = 'none';
    }
}

function renderizarHerramientasActuales() {
    if (soloFavoritos) {
        if (toolsGrid) {
            toolsGrid.innerHTML = '';
            toolsGrid.style.display = 'none';
        }
        if (noResults) {
            noResults.style.display = 'none';
        }
        return;
    }

    const herramientasVisibles = obtenerHerramientasVisibles(herramientasFiltradas);
    renderizarHerramientasConAnimacion(herramientasVisibles, herramientasVisibles);
}

function actualizarBotonFavorito(button, esFavorito) {
    if (!button) return;
    button.classList.toggle('active', esFavorito);
    button.setAttribute('aria-pressed', esFavorito ? 'true' : 'false');
    button.setAttribute('aria-label', esFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos');
    const icon = button.querySelector('.material-icons-outlined');
    if (icon) {
        icon.textContent = esFavorito ? 'star' : 'star_outline';
    }
}

function actualizarBotonesFavorito(id, esFavorito) {
    document.querySelectorAll(`.card-favorite-button[data-id="${id}"]`).forEach(btn => {
        actualizarBotonFavorito(btn, esFavorito);
    });
}

function renderizarFavoritos() {
    if (!favoritesSection || !favoritesGrid || !favoritesEmpty) return;
    if (!soloFavoritos) {
        favoritesSection.style.display = 'none';
        return;
    }
    favoritesGrid.innerHTML = '';

    const favoritos = herramientas.filter(h => esHerramientaFavorita(h.id));
    if (favoritos.length === 0) {
        favoritesSection.style.display = 'block';
        favoritesGrid.style.display = 'none';
        favoritesEmpty.style.display = 'flex';
        return;
    }

    favoritesEmpty.style.display = 'none';
    favoritesGrid.style.display = 'grid';
    favoritesSection.style.display = 'block';

    favoritos.forEach(herramienta => {
        favoritesGrid.appendChild(crearCard(herramienta));
    });

    if (window.AnimacionesGSAP) {
        window.AnimacionesGSAP.configurarHoverCards();
    }
}

function alternarFavorito(herramientaId) {
    const id = herramientaId.toString();
    const ahoraEsFavorito = !esHerramientaFavorita(id);

    if (ahoraEsFavorito) {
        favoritosIds.add(id);
    } else {
        favoritosIds.delete(id);
    }

    guardarFavoritosEnStorage();
    actualizarBotonesFavorito(id, ahoraEsFavorito);
    renderizarFavoritos();
    if (soloFavoritos) {
        renderizarHerramientasActuales();
    }
}

/**
 * Carga las herramientas desde el archivo JSON
 */
async function cargarHerramientas() {
    try {
        const response = await fetch('./data/herramientas.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        herramientas = await response.json();
        herramientasFiltradas = [...herramientas];
    } catch (error) {
        console.error('Error al cargar herramientas:', error);
        throw error;
    }
}

/**
 * Inicializa los filtros dropdown con checkboxes
 */
function inicializarFiltros() {
    // Configurar toggles de dropdown
    const dropdowns = document.querySelectorAll('.filter-dropdown');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.filter-dropdown-toggle');
        const menu = dropdown.querySelector('.filter-dropdown-menu');
        
        // Toggle del dropdown al hacer clic
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.contains('open');
            
            // Cerrar otros dropdowns
            dropdowns.forEach(d => {
                if (d !== dropdown) {
                    d.classList.remove('open');
                    d.querySelector('.filter-dropdown-toggle').setAttribute('aria-expanded', 'false');
                }
            });
            
            // Toggle actual
            dropdown.classList.toggle('open');
            toggle.setAttribute('aria-expanded', !isOpen);
        });
        
        // Navegación por teclado
        toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle.click();
            } else if (e.key === 'Escape') {
                dropdown.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    });
    
    // Cerrar dropdowns al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.filter-dropdown')) {
            dropdowns.forEach(d => {
                d.classList.remove('open');
                d.querySelector('.filter-dropdown-toggle').setAttribute('aria-expanded', 'false');
            });
        }
    });
    
    // Event listeners para checkboxes
    const checkboxes = document.querySelectorAll('.filter-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            aplicarFiltros();
            actualizarContadoresFiltros();
            actualizarBotonLimpiar();
        });
    });
    
    // Botón limpiar filtros
    const btnLimpiar = document.getElementById('btn-limpiar-filtros');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFiltros);
    }
}

/**
 * Actualiza los contadores y estados visuales de los filtros
 */
function actualizarContadoresFiltros() {
    const dropdowns = document.querySelectorAll('.filter-dropdown');
    
    dropdowns.forEach(dropdown => {
        const filterName = dropdown.getAttribute('data-filter');
        if (filterName === 'favoritos') {
            return;
        }
        const checkboxes = dropdown.querySelectorAll(`input[name="${filterName}"]:checked`);
        const countElement = dropdown.querySelector('.filter-dropdown-count');
        const count = checkboxes.length;
        
        if (count > 0) {
            countElement.textContent = count;
            dropdown.classList.add('has-selection');
        } else {
            countElement.textContent = '';
            dropdown.classList.remove('has-selection');
        }
    });
}

/**
 * Actualiza la visibilidad del botón limpiar filtros
 */
function actualizarBotonLimpiar() {
    const btnLimpiar = document.getElementById('btn-limpiar-filtros');
    if (!btnLimpiar) return;
    
    const hayFiltrosActivos = document.querySelectorAll('.filter-checkbox:checked').length > 0;
    // Siempre visible; solo cambia su estado (habilitado/deshabilitado)
    btnLimpiar.style.display = 'flex';
    btnLimpiar.disabled = !hayFiltrosActivos;
    btnLimpiar.setAttribute('aria-disabled', hayFiltrosActivos ? 'false' : 'true');
}

/**
 * Limpia todos los filtros seleccionados
 */
function limpiarFiltros() {
    const checkboxes = document.querySelectorAll('.filter-checkbox:checked');
    checkboxes.forEach(cb => cb.checked = false);
    
    // Cerrar dropdowns
    document.querySelectorAll('.filter-dropdown').forEach(d => {
        const filterName = d.getAttribute('data-filter');
        d.classList.remove('open');
        if (filterName !== 'favoritos') {
            d.classList.remove('has-selection');
        }
        const toggle = d.querySelector('.filter-dropdown-toggle');
        if (toggle) {
            toggle.setAttribute('aria-expanded', 'false');
        }
    });
    
    actualizarContadoresFiltros();
    actualizarBotonLimpiar();
    filtrosActivos = { usuarios: [], uso: [], tipo: [] };
    aplicarFiltros();
}

/**
 * Configura todos los event listeners
 */
function configurarEventListeners() {
    // Modal de detalle de herramienta: solo existe en herramientas.html (no en index.html)
    if (modal && modalClose) {
        modalClose.addEventListener('click', cerrarModal);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
            const isModalOpen = modal && !modal.hasAttribute('hidden');

            if (isModalOpen) {
                    e.preventDefault();
                    e.stopPropagation();
                    cerrarModal();
                }
            }
        }, true);
    }

    // Configurar botones de filtrado rápido
    inicializarFiltrosRapidos();

    favoritesOptionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const accion = button.getAttribute('data-favoritos-action');
            soloFavoritos = accion === 'show';
            actualizarEstadoFiltroFavoritos();
            renderizarFavoritos();
            renderizarHerramientasActuales();

            if (favoritesDropdown && favoritesToggle) {
                favoritesDropdown.classList.remove('open');
                favoritesToggle.setAttribute('aria-expanded', 'false');
            }
        });
    });
}

/**
 * Obtiene los valores seleccionados de un grupo de checkboxes
 * @param {string} name - Nombre del grupo de checkboxes
 * @returns {Array} - Array de valores seleccionados
 */
function obtenerValoresSeleccionados(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * Aplica los filtros seleccionados (lógica AND combinada)
 * 
 * LÓGICA DE FILTRADO:
 * - Si no hay filtros seleccionados → mostrar todas las herramientas
 * - Si hay filtros seleccionados → la herramienta debe coincidir con AL MENOS UNO
 *   de los valores seleccionados en CADA grupo de filtros activos
 */
function aplicarFiltros() {
    const usuariosSeleccionados = obtenerValoresSeleccionados('usuarios');
    const usosSeleccionados = obtenerValoresSeleccionados('uso');
    const tiposSeleccionados = obtenerValoresSeleccionados('tipo');
    
    filtrosActivos = {
        usuarios: usuariosSeleccionados,
        uso: usosSeleccionados,
        tipo: tiposSeleccionados
    };
    
    // Filtrar herramientas
    herramientasFiltradas = herramientas.filter(herramienta => {
        // Si no hay filtros de usuarios seleccionados, pasa automáticamente
        // Si hay filtros, la herramienta debe tener al menos uno de los usuarios seleccionados
        const coincideUsuarios = usuariosSeleccionados.length === 0 || 
            herramienta.usuarios.some(u => usuariosSeleccionados.includes(u));
        
        // Similar para uso
        const coincideUso = usosSeleccionados.length === 0 || 
            herramienta.uso.some(u => usosSeleccionados.includes(u));
        
        // Similar para tipo
        const coincideTipo = tiposSeleccionados.length === 0 || 
            herramienta.tipo.some(t => tiposSeleccionados.includes(t));
        
        // AND: debe coincidir en TODOS los grupos de filtros activos
        return coincideUsuarios && coincideUso && coincideTipo;
    });
    
    const herramientasVisibles = obtenerHerramientasVisibles(herramientasFiltradas);
    
    // Anunciar resultados para lectores de pantalla
    anunciarResultadosFiltro(herramientasVisibles.length);
    
    // Obtener cards actuales antes de limpiar
    const cardsActuales = Array.from(toolsGrid.querySelectorAll('.tool-card'));
    const idsActuales = new Set(cardsActuales.map(card => card.getAttribute('data-id')));
    
    // Obtener IDs de las nuevas herramientas filtradas
    const idsNuevos = new Set(herramientasVisibles.map(h => h.id.toString()));
    
    // Identificar cards que deben desaparecer
    const cardsARemover = cardsActuales.filter(card => {
        const id = card.getAttribute('data-id');
        return !idsNuevos.has(id);
    });
    
    // Identificar herramientas que son nuevas (no estaban antes)
    const herramientasNuevas = herramientasVisibles.filter(h => !idsActuales.has(h.id.toString()));
    
    // Animar salida de cards que desaparecen
    if (window.AnimacionesGSAP && cardsARemover.length > 0) {
        window.AnimacionesGSAP.animarSalidaCards(cardsARemover, () => {
            renderizarHerramientasConAnimacion(herramientasVisibles, herramientasNuevas);
        });
    } else {
        if (cardsARemover.length > 0) {
            cardsARemover.forEach(card => card.remove());
        }
        renderizarHerramientasConAnimacion(herramientasVisibles, herramientasNuevas);
    }
}

/**
 * Renderiza herramientas con animación de entrada para las nuevas
 */
function renderizarHerramientasConAnimacion(herramientasArray, herramientasNuevas) {
    const cardsExistentes = toolsGrid.querySelectorAll('.tool-card');
    if (!window.AnimacionesGSAP || cardsExistentes.length === 0) {
        toolsGrid.innerHTML = '';
    }
    
    // Mostrar mensaje si no hay resultados
    if (herramientasArray.length === 0) {
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    const idsNuevos = herramientasNuevas ? new Set(herramientasNuevas.map(h => h.id.toString())) : new Set();
    const todasSonNuevas = !herramientasNuevas || herramientasNuevas.length === herramientasArray.length;
    
    const cardsParaAnimar = [];
    herramientasArray.forEach(herramienta => {
        const cardExistente = toolsGrid.querySelector(`[data-id="${herramienta.id}"]`);
        
        if (!cardExistente) {
            const card = crearCard(herramienta);
            toolsGrid.appendChild(card);
            
            if (todasSonNuevas || idsNuevos.has(herramienta.id.toString())) {
                cardsParaAnimar.push(card);
            }
        }
    });
    
    if (window.AnimacionesGSAP) {
        window.AnimacionesGSAP.configurarHoverCards();
        
        if (cardsParaAnimar.length > 0) {
            requestAnimationFrame(() => {
                window.AnimacionesGSAP.animarEntradaCardsFiltradas(cardsParaAnimar);
            });
        }
    }
}

/**
 * Renderiza las herramientas en el grid
 */
function renderizarHerramientas(herramientasArray) {
    toolsGrid.innerHTML = '';
    
    if (herramientasArray.length === 0) {
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    herramientasArray.forEach(herramienta => {
        const card = crearCard(herramienta);
        toolsGrid.appendChild(card);
    });
    
    if (window.AnimacionesGSAP) {
        window.AnimacionesGSAP.configurarHoverCards();
    }
    
    requestAnimationFrame(() => {
        if (window.AnimacionesGSAP) {
            window.AnimacionesGSAP.animarEntradaCards();
            window.AnimacionesGSAP.animarEntradaImagenesCards();
        }
    });
}

/**
 * Íconos Material Icons por tipo de herramienta
 */
const iconosPorTipo = {
    "manual de uso": "menu_book",
    "infografías": "image",
    "enlaces externos": "link",
    "guías": "description"
};

/**
 * Colores por categoría
 */
const coloresPorCategoria = {
    "categorizar": "#FDE773",
    "disenar": "#00C389",
    "desarrollar": "#59CBE8",
    "probar": "#9063CD",
    "monitorear y mejorar": "#FF7F41"
};

function normalizarTexto(valor) {
    return (valor || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function obtenerColorPorCategoria(categoria) {
    if (!categoria) {
        return "#FDE773";
    }
    const clave = normalizarTexto(categoria);
    return coloresPorCategoria[clave] || "#FDE773";
}

function obtenerValorMostrado(valores, seleccionados) {
    if (!valores || valores.length === 0) return 'N/A';
    if (seleccionados && seleccionados.length > 0) {
        return valores.find(valor => seleccionados.includes(valor)) || valores[0];
    }
    return valores[0];
}

/**
 * Obtiene un ícono según el tipo de herramienta
 */
function obtenerIconoPorTipo(tipos) {
    if (!tipos || tipos.length === 0) return "lightbulb_outline";
    const tipoLower = tipos[0].toLowerCase();
    return iconosPorTipo[tipoLower] || "lightbulb_outline";
}

/**
 * Crea una card para una herramienta
 * 
 * ESTRUCTURA ACTUALIZADA:
 * - Título
 * - Descripción breve
 * - Badges: Usuarios, Uso, Tipo
 */
function crearCard(herramienta) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.setAttribute('data-id', herramienta.id);
    
    // Obtener color según categoría de uso
    const colorHeader = obtenerColorPorCategoria(herramienta.categoria);
    const colorHeaderText = obtenerColorTextoPorFondo(colorHeader);
    
    // Obtener iconos para las características
    const usuarioMostrado = obtenerValorMostrado(herramienta.usuarios, filtrosActivos.usuarios);
    const usoMostrado = obtenerValorMostrado(herramienta.uso, filtrosActivos.uso);
    const tipoMostrado = obtenerValorMostrado(herramienta.tipo, filtrosActivos.tipo);
    
    const iconoUsuario = obtenerIconoFiltro('usuarios', usuarioMostrado);
    const iconoUso = obtenerIconoFiltro('uso', usoMostrado);
    const iconoTipo = obtenerIconoFiltro('tipo', tipoMostrado);
    
    // Crear resumen de 2 líneas (aproximadamente 100 caracteres)
    const descripcionResumen = herramienta.descripcion.length > 100 
        ? herramienta.descripcion.substring(0, 100) + '...'
        : herramienta.descripcion;
    
    // Crear características con iconos
    const caracteristicas = [];
    if (herramienta.usuarios && herramienta.usuarios.length > 0) {
        caracteristicas.push({
            icono: iconoUsuario,
            texto: usuarioMostrado,
            prefijo: 'Quién: '
        });
    }
    if (herramienta.uso && herramienta.uso.length > 0) {
        caracteristicas.push({
            icono: iconoUso,
            texto: usoMostrado,
            prefijo: 'Uso: '
        });
    }
    if (herramienta.tipo && herramienta.tipo.length > 0) {
        caracteristicas.push({
            icono: iconoTipo,
            texto: tipoMostrado,
            prefijo: 'Tipo: '
        });
    }
    
    const caracteristicasHTML = caracteristicas.map(c => `
        <div class="card-feature">
            <span class="material-icons-outlined card-feature-icon" aria-hidden="true">${c.icono}</span>
            <span class="card-feature-text"><span class="card-feature-prefix">${c.prefijo}</span>${c.texto}</span>
        </div>
    `).join('');
    
    const esFavorito = esHerramientaFavorita(herramienta.id);
    const favoritoLabel = esFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos';
    const favoritoIcono = esFavorito ? 'star' : 'star_outline';

    card.innerHTML = `
        <button type="button" class="card-favorite-button ${esFavorito ? 'active' : ''}" data-id="${herramienta.id}" aria-pressed="${esFavorito}" aria-label="${favoritoLabel}">
            <span class="material-icons-outlined" aria-hidden="true">${favoritoIcono}</span>
        </button>
        <div class="card-header card-header--categoria" style="--herramienta-categoria-bg: ${colorHeader}; --herramienta-categoria-fg: ${colorHeaderText};">
            <h3 class="card-title">${herramienta.titulo}</h3>
            <p class="card-summary">${descripcionResumen}</p>
        </div>
        <div class="card-body">
            <div class="card-features">
                ${caracteristicasHTML}
            </div>
            <button type="button" class="card-button" aria-label="Conoce más: ${herramienta.titulo}">
                Conoce más de la herramienta
            </button>
        </div>
    `;
    
    // Event listener solo para el botón dentro de la card
    const cardButton = card.querySelector('.card-button');
    if (cardButton) {
        cardButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = `herramienta.html?id=${herramienta.id}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        });
    }

    const favoriteButton = card.querySelector('.card-favorite-button');
    if (favoriteButton) {
        favoriteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            alternarFavorito(herramienta.id);
        });
    }
    
    return card;
}

// Función auxiliar para obtener icono de filtro (reutilizada)
function obtenerIconoFiltro(tipo, valor) {
    const normalizarClave = (v) => (v || '')
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const iconosPorTipo = {
        'usuarios': {
            // Roles actualizados (y compatibilidad con nombres anteriores)
            'diseñador': 'palette',
            'disenador': 'palette',
            'desarrollador': 'code',
            'certificado qa': 'verified',
            'certificador qa': 'verified',
            'qa': 'verified',
            'content': 'description',
            'creador de contenido': 'description',
            'general': 'public',
            'transversal': 'public',
            'montahista': 'construction',
            'montajista': 'construction',
            'todos': 'groups',
            'equipo de trabajo': 'groups'
        },
        'uso': {
            // Usos actualizados (y compatibilidad con etiquetas antiguas)
            'creacion de contenido': 'description',
            'diagnostico': 'search',
            'diseno': 'palette',
            'diseño': 'palette',
            'formacion y aplicacion': 'school',
            'formación y aplicación': 'school',
            // Compat: si algún JSON aún viene separado
            'formacion': 'school',
            'formación': 'school',
            'aplicacion': 'school',
            'aplicación': 'school',
            // Legacy
            'area del banco 1': 'business',
            'area del banco 2': 'corporate_fare',
            'area del banco 3': 'domain'
        },
        'tipo': {
            'Manual de uso': 'menu_book',
            'Infografías': 'image',
            'Enlaces externos': 'link',
            'Guías': 'description'
        }
    };

    if (tipo === 'usuarios') {
        const key = normalizarClave(valor);
        return iconosPorTipo.usuarios[key] || 'help_outline';
    }

    if (tipo === 'uso') {
        const key = normalizarClave(valor);
        return iconosPorTipo.uso[key] || 'help_outline';
    }

    return iconosPorTipo[tipo]?.[valor] || 'help_outline';
}

/**
 * Construye las opciones de filtros dropdown en la página de herramientas
 */
function construirFiltrosDropdown() {
    const dropdowns = document.querySelectorAll('.filter-dropdown');
    if (dropdowns.length === 0) return;
    
    const obtenerOpcionesUnicas = (tipo) => {
        const opciones = new Set();
        herramientas.forEach(herramienta => {
            if (herramienta[tipo] && Array.isArray(herramienta[tipo])) {
                herramienta[tipo].forEach(opcion => opciones.add(opcion));
            }
        });
        return Array.from(opciones).sort();
    };
    
    dropdowns.forEach(dropdown => {
        const filterName = dropdown.getAttribute('data-filter');
        const menu = dropdown.querySelector('.filter-dropdown-menu');
        if (!filterName || !menu) return;
        if (filterName === 'favoritos') {
            return;
        }
        
        const opciones = obtenerOpcionesUnicas(filterName);
        menu.innerHTML = opciones.map((opcion, index) => {
            const id = `${filterName}-${index}`.toLowerCase().replace(/\s+/g, '-');
            return `
                <label class="filter-dropdown-option">
                    <input type="checkbox" class="filter-checkbox" name="${filterName}" value="${opcion}" id="${id}">
                    <span class="filter-checkbox-custom" aria-hidden="true"></span>
                    <span class="filter-option-text">${opcion}</span>
                </label>
            `;
        }).join('');
    });
}

/**
 * Obtiene un color consistente basado en el ID de la herramienta
 */
/**
 * Abre el modal con los detalles de la herramienta
 */
function abrirModal(herramienta) {
    if (!modal) return;
    modal.removeAttribute('hidden');
    modal.removeAttribute('aria-hidden');
    modal.removeAttribute('inert');
    modal.setAttribute('aria-modal', 'true');
    setContainerFocusableState(modal, true);
    
    const mainContent = document.getElementById('mainContent');
    const header = document.querySelector('.header');
    const footer = document.querySelector('.footer');
    
    if (mainContent) mainContent.setAttribute('aria-hidden', 'true');
    if (header) header.setAttribute('aria-hidden', 'true');
    if (footer) footer.setAttribute('aria-hidden', 'true');
    
    const modalContent = document.querySelector('.modal-content');
    if (window.AnimacionesGSAP && modalContent) {
        window.AnimacionesGSAP.animarAperturaModal(modal, modalOverlay, modalContent);
    } else {
        modal.style.display = 'flex';
    }
    
    modalScrollY = window.scrollY || 0;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${modalScrollY}px`;
    
    // Configurar trap focus y enfocar el botón cerrar automáticamente
    setTimeout(() => {
        configurarTrapFocus();
        
        // El botón cerrar recibe foco automáticamente al abrir el modal (WCAG 2.1)
        if (modalClose) {
            modalClose.focus();
        }
    }, 100);
    
    setTimeout(() => {
        const colorFondo = obtenerColorPorCategoria(herramienta.categoria);
        const colorTexto = obtenerColorTextoPorFondo(colorFondo);
        const modalImageContainer = document.getElementById('modal-image-container');
        const modalHero = document.getElementById('modal-hero');
        const tieneImagen = herramienta.imagen && herramienta.imagen.trim() !== '';
        
        if (modalHero) {
            // Evitar hardcode directo en background-color para permitir overrides por modo (dark/contrast)
            modalHero.style.setProperty('--herramienta-categoria-bg', colorFondo);
            modalHero.style.setProperty('--herramienta-categoria-fg', colorTexto);
        }
        
        if (tieneImagen) {
            const img = new Image();
            let imagenCargada = false;
            
            const finalizarCarga = () => {
                if (imagenCargada) return;
                imagenCargada = true;
                completarCargaModal();
            };
            
            img.onload = () => {
                modalImageContainer.innerHTML = `<img src="${herramienta.imagen}" alt="${herramienta.titulo}" class="modal-image" />`;
                modalImageContainer.style.backgroundColor = 'var(--bc-bg-base)';
                finalizarCarga();
            };
            
            img.onerror = () => {
                const icono = obtenerIconoPorTipo(herramienta.tipo);
                modalImageContainer.innerHTML = `<span class="material-icons-outlined modal-icon">${icono}</span>`;
                modalImageContainer.style.backgroundColor = 'var(--bc-bg-base)';
                finalizarCarga();
            };
            
            setTimeout(() => {
                if (!imagenCargada) {
                    const icono = obtenerIconoPorTipo(herramienta.tipo);
                    modalImageContainer.innerHTML = `<span class="material-icons-outlined modal-icon">${icono}</span>`;
                    modalImageContainer.style.backgroundColor = 'var(--bc-bg-base)';
                    finalizarCarga();
                }
            }, 3000);
            
            img.src = herramienta.imagen;
        } else {
            const icono = obtenerIconoPorTipo(herramienta.tipo);
            modalImageContainer.innerHTML = `<span class="material-icons-outlined modal-icon">${icono}</span>`;
            modalImageContainer.style.backgroundColor = 'var(--bc-bg-base)';
            completarCargaModal();
        }
        
        // Llenar contenido del modal
        document.getElementById('modal-titulo').textContent = herramienta.titulo;
        
        const categoria = herramienta.tipo && herramienta.tipo.length > 0 ? herramienta.tipo[0] : 'Herramienta';
        const modalCategoria = document.getElementById('modal-categoria');
        if (modalCategoria) {
            modalCategoria.textContent = categoria;
        }
        
        const modalResumen = document.getElementById('modal-resumen');
        if (modalResumen) {
            const resumen = herramienta.descripcion.length > 180
                ? `${herramienta.descripcion.substring(0, 180).trim()}...`
                : herramienta.descripcion;
            modalResumen.textContent = resumen;
        }
        
        // Obtener iconos para características
        const iconoUsuario = obtenerIconoFiltro('usuarios', herramienta.usuarios[0] || '');
        const iconoUso = obtenerIconoFiltro('uso', herramienta.uso[0] || '');
        const iconoTipo = obtenerIconoFiltro('tipo', herramienta.tipo[0] || '');
        
        // Llenar características de usuarios
        const modalUsuarios = document.getElementById('modal-usuarios');
        modalUsuarios.innerHTML = `
            <span class="material-icons-outlined" aria-hidden="true">${iconoUsuario}</span>
            <span><strong>Quién:</strong> ${herramienta.usuarios[0] || 'N/A'}</span>
        `;
        
        // Llenar características de uso
        const modalUso = document.getElementById('modal-uso');
        modalUso.innerHTML = `
            <span class="material-icons-outlined" aria-hidden="true">${iconoUso}</span>
            <span><strong>Uso:</strong> ${herramienta.uso[0] || 'N/A'}</span>
        `;
        
        // Llenar características de tipo
        const modalTipo = document.getElementById('modal-tipo');
        modalTipo.innerHTML = `
            <span class="material-icons-outlined" aria-hidden="true">${iconoTipo}</span>
            <span><strong>Tipo:</strong> ${herramienta.tipo[0] || 'N/A'}</span>
        `;
        
        // Mostrar badge de documento adjunto si existe
        const tieneDocumento = herramienta.documento && herramienta.documento.trim() !== '';
        const modalDocumento = document.getElementById('modal-documento');
        if (tieneDocumento) {
            modalDocumento.style.display = 'flex';
            modalDocumento.innerHTML = `
                <span class="material-icons-outlined" aria-hidden="true">attach_file</span>
                <span>Documento adjunto</span>
            `;
        } else {
            modalDocumento.style.display = 'none';
            modalDocumento.innerHTML = '';
        }
        
        document.getElementById('modal-descripcion').textContent = herramienta.descripcion;
        document.getElementById('modal-objetivo').textContent = herramienta.objetivo;
        
        // Requisitos
        const requisitosContainer = document.getElementById('modal-requisitos');
        const requisitos = herramienta.requisitos || [];
        if (requisitosContainer) {
            requisitosContainer.innerHTML = requisitos.length > 0
                ? requisitos.map(r => `
                    <div class="modal-requisito-item">
                        <img src="img/imagenReq.png" alt="Requisito" class="modal-requisito-imagen" />
                        <span class="modal-requisito-texto">${r}</span>
                    </div>
                `).join('')
                : '<p class="modal-sin-enlaces">Esta herramienta no posee requisitos.</p>';
        }
        
        // Llenar materiales
        const materialesList = document.getElementById('modal-materiales');
        materialesList.innerHTML = '';
        if (herramienta.materiales && herramienta.materiales.length > 0) {
            herramienta.materiales.forEach(material => {
                const li = document.createElement('li');
                li.textContent = material;
                materialesList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.className = 'modal-list-empty';
            li.textContent = 'Esta herramienta no posee materiales.';
            materialesList.appendChild(li);
        }
        
        // Llenar pasos con botones
        const pasosList = document.getElementById('modal-pasos');
        const pasosImagen = document.getElementById('modal-pasos-imagen');
        pasosList.innerHTML = '';
        if (herramienta.pasos && herramienta.pasos.length > 0) {
            pasosList.innerHTML = herramienta.pasos.map((paso, index) => `
                <button type="button" class="modal-paso-btn" data-paso-index="${index}" ${index === 0 ? 'data-active="true"' : ''}>
                    <span class="modal-paso-numero">${index + 1}</span>
                    <span class="modal-paso-texto">${paso}</span>
                </button>
            `).join('');
        } else {
            pasosList.innerHTML = '<p class="modal-sin-enlaces">No se especifican pasos.</p>';
        }
        
        if (pasosImagen) {
            const icono = obtenerIconoPorTipo(herramienta.tipo);
            pasosImagen.innerHTML = tieneImagen
                ? `<img src="${herramienta.imagen}" alt="${herramienta.titulo}" />`
                : `<span class="material-icons-outlined" aria-hidden="true">${icono}</span>`;
        }
        
        inicializarModalPasos();
        inicializarModalSwitch();
        
        // Enlaces y documentación
        const enlacesContainer = document.getElementById('modal-enlaces');
        if (enlacesContainer) {
            const enlaces = herramienta.enlaces || [];
            const items = [];
            
            if (tieneDocumento) {
                items.push(`
                    <div class="modal-enlace-item">
                        <span class="material-icons-outlined modal-enlace-icono" aria-hidden="true">description</span>
                        <h4 class="modal-enlace-titulo">Documentación</h4>
                        <p class="modal-enlace-resumen">Documento descargable con información detallada sobre esta herramienta.</p>
                        <button type="button" class="modal-enlace-btn" data-documento="${herramienta.documento}">
                            Descargar documento
                        </button>
                    </div>
                `);
            }
            
            if (enlaces.length > 0) {
                enlaces.forEach(enlace => {
                    const titulo = enlace.titulo || 'Enlace externo';
                    const resumen = enlace.resumen || 'Recurso adicional relacionado con esta herramienta.';
                    const url = enlace.url || enlace;
                    items.push(`
                        <div class="modal-enlace-item">
                            <span class="material-icons-outlined modal-enlace-icono" aria-hidden="true">link</span>
                            <h4 class="modal-enlace-titulo">${titulo}</h4>
                            <p class="modal-enlace-resumen">${resumen}</p>
                            <a href="${url}" target="_blank" rel="noopener noreferrer" class="modal-enlace-btn">Ir al enlace</a>
                        </div>
                    `);
                });
            }
            
            enlacesContainer.innerHTML = items.length > 0
                ? items.join('')
                : '<p class="modal-sin-enlaces">No hay enlaces o documentación adicional disponible.</p>';
            
            enlacesContainer.querySelectorAll('[data-documento]').forEach(btn => {
                btn.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const ruta = btn.getAttribute('data-documento');
                    const nombreArchivo = ruta.split('/').pop();
                    iniciarDescargaDocumento(ruta, nombreArchivo);
                });
            });
        }
        
        // Agregar botón de descarga si hay documento adjunto
        // Reutilizar la variable tieneDocumento ya declarada arriba
        const modalBody = document.querySelector('.modal-body');
        let botonDescargaContainer = document.getElementById('modal-download-container');
        
        if (tieneDocumento) {
            // Crear o actualizar contenedor del botón de descarga
            if (!botonDescargaContainer) {
                botonDescargaContainer = document.createElement('div');
                botonDescargaContainer.id = 'modal-download-container';
                botonDescargaContainer.className = 'modal-download-section';
                modalBody.appendChild(botonDescargaContainer);
            }
            
            // Obtener nombre del archivo desde la ruta
            const nombreArchivo = herramienta.documento.split('/').pop();
            
            // Mostrar placeholder mientras se obtiene la información del archivo
            botonDescargaContainer.innerHTML = `
                <div class="document-info">
                    <div class="document-info-text">
                        <span class="material-icons-outlined document-icon" aria-hidden="true">description</span>
                        <div class="document-details">
                            <span class="document-name">${nombreArchivo}</span>
                            <span class="document-meta" id="document-meta">Obteniendo información...</span>
                        </div>
                    </div>
                </div>
                <button 
                    type="button" 
                    id="btn-descargar-documento" 
                    class="btn-descargar-documento"
                    aria-label="Descargar documento: ${nombreArchivo}"
                >
                    <span class="material-icons-outlined" aria-hidden="true">download</span>
                    <span>Descargar documento</span>
                </button>
            `;
            
            // Obtener información del archivo (tipo y tamaño)
            obtenerInformacionArchivo(herramienta.documento, nombreArchivo);
            
            // Configurar event listener para el botón de descarga
            const btnDescargar = document.getElementById('btn-descargar-documento');
            if (btnDescargar) {
                btnDescargar.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    iniciarDescargaDocumento(herramienta.documento, nombreArchivo);
                });
            }
        } else {
            // Eliminar contenedor si no hay documento
            if (botonDescargaContainer) {
                botonDescargaContainer.remove();
            }
        }
        
        if (!tieneImagen) {
            completarCargaModal();
        }
    }, 100);
}

/**
 * Devuelve un color de texto (#000/#fff) con mejor contraste sobre un color de fondo.
 * Se usa solo como valor puntual para CSS custom properties (no crea tokens nuevos).
 */
function obtenerColorTextoPorFondo(colorHex) {
    if (!colorHex || typeof colorHex !== 'string') return '#000000';
    let hex = colorHex.trim();
    if (hex.startsWith('var(')) {
        // Si llega una var CSS, no podemos resolverla aquí; usar fallback a texto primario
        return 'var(--bc-text-primary)';
    }
    if (hex.startsWith('#')) hex = hex.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length < 6) return '#000000';

    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

    // Umbral práctico (relacionado con contraste percibido); prioriza legibilidad.
    return L > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Completa la carga del modal y oculta el loader
 */
function completarCargaModal() {
    return;
}

/**
 * Obtiene información del archivo (tipo y tamaño)
 * @param {string} rutaDocumento - Ruta relativa del documento
 * @param {string} nombreArchivo - Nombre del archivo
 */
async function obtenerInformacionArchivo(rutaDocumento, nombreArchivo) {
    try {
        // Hacer HEAD request para obtener información sin descargar el archivo completo
        const response = await fetch(rutaDocumento, { method: 'HEAD' });
        
        if (!response.ok) {
            throw new Error(`Error al obtener información: ${response.statusText}`);
        }
        
        // Obtener tamaño del archivo
        const tamañoBytes = response.headers.get('content-length');
        const tamañoFormateado = tamañoBytes ? formatearTamañoArchivo(parseInt(tamañoBytes)) : 'Tamaño desconocido';
        
        // Obtener tipo MIME del archivo
        const tipoMIME = response.headers.get('content-type') || '';
        const tipoArchivo = obtenerTipoArchivo(nombreArchivo, tipoMIME);
        
        // Actualizar la información en el modal
        const documentMeta = document.getElementById('document-meta');
        if (documentMeta) {
            documentMeta.textContent = `${tipoArchivo} • ${tamañoFormateado}`;
        }
        
    } catch (error) {
        console.error('Error al obtener información del archivo:', error);
        // Si falla, intentar obtener el tipo desde la extensión
        const tipoArchivo = obtenerTipoArchivo(nombreArchivo, '');
        const documentMeta = document.getElementById('document-meta');
        if (documentMeta) {
            documentMeta.textContent = `${tipoArchivo}`;
        }
    }
}

/**
 * Formatea el tamaño del archivo en formato legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} - Tamaño formateado (KB, MB, GB)
 */
function formatearTamañoArchivo(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const tamaños = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + tamaños[i];
}

/**
 * Obtiene el tipo de archivo desde la extensión o MIME type
 * @param {string} nombreArchivo - Nombre del archivo
 * @param {string} tipoMIME - Tipo MIME del archivo
 * @returns {string} - Tipo de archivo legible
 */
function obtenerTipoArchivo(nombreArchivo, tipoMIME) {
    // Obtener extensión del archivo
    const extension = nombreArchivo.split('.').pop()?.toLowerCase() || '';
    
    // Mapeo de extensiones a tipos legibles
    const tiposArchivo = {
        'pdf': 'PDF',
        'doc': 'Word',
        'docx': 'Word',
        'xls': 'Excel',
        'xlsx': 'Excel',
        'txt': 'Texto',
        'ppt': 'PowerPoint',
        'pptx': 'PowerPoint',
        'zip': 'ZIP',
        'rar': 'RAR',
        'jpg': 'Imagen',
        'jpeg': 'Imagen',
        'png': 'Imagen',
        'gif': 'Imagen'
    };
    
    // Intentar obtener desde la extensión
    if (tiposArchivo[extension]) {
        return tiposArchivo[extension];
    }
    
    // Si no se encuentra, intentar desde el MIME type
    if (tipoMIME) {
        if (tipoMIME.includes('pdf')) return 'PDF';
        if (tipoMIME.includes('word') || tipoMIME.includes('document')) return 'Word';
        if (tipoMIME.includes('excel') || tipoMIME.includes('spreadsheet')) return 'Excel';
        if (tipoMIME.includes('text')) return 'Texto';
        if (tipoMIME.includes('image')) return 'Imagen';
    }
    
    // Si no se puede determinar, usar la extensión en mayúsculas
    return extension.toUpperCase() || 'Archivo';
}

/**
 * Inicia la descarga de un documento sin cerrar el modal
 * Usa fetch + blob URL para evitar navegación y recargas de página
 * @param {string} rutaDocumento - Ruta relativa del documento
 * @param {string} nombreArchivo - Nombre del archivo para la descarga
 */
async function iniciarDescargaDocumento(rutaDocumento, nombreArchivo) {
    try {
        // Obtener el archivo como blob usando fetch
        const response = await fetch(rutaDocumento);
        
        if (!response.ok) {
            throw new Error(`Error al descargar: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        // Crear blob URL
        const blobUrl = URL.createObjectURL(blob);
        
        // Crear elemento <a> temporal para la descarga
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = nombreArchivo;
        link.style.display = 'none';
        
        // Prevenir cualquier intercepción de navegación
        link.setAttribute('data-no-transition', 'true');
        
        // Agregar al DOM
        document.body.appendChild(link);
        
        // Usar requestAnimationFrame para asegurar que el elemento esté en el DOM
        requestAnimationFrame(() => {
            // Ejecutar click programáticamente
            link.click();
            
            // Remover el elemento y revocar el blob URL después de un breve delay
            setTimeout(() => {
                if (link.parentNode) {
                    document.body.removeChild(link);
                }
                URL.revokeObjectURL(blobUrl);
            }, 100);
        });
        
    } catch (error) {
        console.error('Error al descargar el documento:', error);
        // Opcional: mostrar un mensaje de error al usuario
        alert('No se pudo descargar el documento. Por favor, inténtalo de nuevo.');
    }
}

/**
 * Cierra el modal
 */
function cerrarModal() {
    if (!modal) return;
    removerTrapFocus();

    const modalContent = document.querySelector('.modal-content');
    
    const restaurarFoco = () => {
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
        window.scrollTo(0, modalScrollY);
        
        modal.setAttribute('hidden', '');
        modal.removeAttribute('aria-hidden');
        modal.removeAttribute('inert');
        modal.removeAttribute('aria-modal');
        setContainerFocusableState(modal, false);
        
        const mainContent = document.getElementById('mainContent');
        const header = document.querySelector('.header');
        const footer = document.querySelector('.footer');
        
        if (mainContent) mainContent.removeAttribute('aria-hidden');
        if (header) header.removeAttribute('aria-hidden');
        if (footer) footer.removeAttribute('aria-hidden');
        
        // Limpiar contenedor de descarga si existe
        const botonDescargaContainer = document.getElementById('modal-download-container');
        if (botonDescargaContainer) {
            botonDescargaContainer.remove();
        }
        
        if (lastFocusedCard) {
            setTimeout(() => {
                lastFocusedCard.focus();
                lastFocusedCard = null;
            }, 50);
        }
    };
    
    if (window.AnimacionesGSAP && modalContent) {
        window.AnimacionesGSAP.animarCierreModal(modal, modalOverlay, modalContent, restaurarFoco);
    } else {
        modal.style.display = 'none';
        restaurarFoco();
    }
}

/**
 * Muestra un mensaje de error
 */
function mostrarError(mensaje) {
    toolsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--rojo-bancolombia);" role="alert" aria-live="assertive">
            <p style="font-size: 18px;">${mensaje}</p>
        </div>
    `;
}

/**
 * Anuncia los resultados del filtro a lectores de pantalla
 */
function anunciarResultadosFiltro(cantidad) {
    const toolsGrid = document.getElementById('tools-grid');
    if (!toolsGrid) return;
    
    let anuncio = document.getElementById('a11y-filtro-anuncio');
    if (!anuncio) {
        anuncio = document.createElement('div');
        anuncio.id = 'a11y-filtro-anuncio';
        anuncio.className = 'visually-hidden';
        anuncio.setAttribute('aria-live', 'polite');
        anuncio.setAttribute('aria-atomic', 'true');
        document.body.appendChild(anuncio);
    }
    
    const mensaje = cantidad === 0 
        ? 'No se encontraron herramientas para los criterios seleccionados. Prueba combinando diferentes roles, propósitos o tipos de recurso.'
        : `Se encontraron ${cantidad} herramienta${cantidad !== 1 ? 's' : ''} para los criterios seleccionados.`;
    
    anuncio.textContent = mensaje;
    
    setTimeout(() => {
        anuncio.textContent = '';
    }, 1000);
}

/**
 * Configura el trap focus dentro del modal
 */
let trapFocusHandler = null;

function configurarTrapFocus() {
    if (!modal) return;

    const getFocusableElements = (container) => {
        const focusableSelectors = [
            'button:not([disabled])',
            'a[href]',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');
        
        return Array.from(container.querySelectorAll(focusableSelectors))
            .filter(el => {
                const style = window.getComputedStyle(el);
                const isVisible = style.display !== 'none' && 
                                 style.visibility !== 'hidden' && 
                                 style.opacity !== '0';
                
                const ariaHidden = el.getAttribute('aria-hidden');
                const isAriaVisible = ariaHidden !== 'true';
                
                return isVisible && isAriaVisible;
            });
    };
    
    trapFocusHandler = (e) => {
        if (!modal || modal.hasAttribute('hidden')) {
            return;
        }
        
        const focusableElements = getFocusableElements(modal);
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.key === 'Tab' && !e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
        else if (e.key === 'Tab' && e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        }
        else if (e.key === 'Tab' && !modal.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
        }
    };
    
    document.addEventListener('keydown', trapFocusHandler, true);
    
    const checkFocus = () => {
        if (!modal || modal.hasAttribute('hidden')) {
            return;
        }
        
        const focusableElements = getFocusableElements(modal);
        if (focusableElements.length === 0) return;
        
        const isFocusInsideModal = modal.contains(document.activeElement);
        
        if (!isFocusInsideModal) {
            const firstElement = focusableElements[0];
            if (firstElement) {
                firstElement.focus();
            }
        }
    };
    
    const focusCheckInterval = setInterval(checkFocus, 100);
    modal._focusCheckInterval = focusCheckInterval;
}

/**
 * Remueve el trap focus cuando se cierra el modal
 */
function removerTrapFocus() {
    if (trapFocusHandler) {
        document.removeEventListener('keydown', trapFocusHandler, true);
        trapFocusHandler = null;
    }
    
    if (modal && modal._focusCheckInterval) {
        clearInterval(modal._focusCheckInterval);
        modal._focusCheckInterval = null;
    }
}

/**
 * Inicializa la funcionalidad de pasos en el modal
 */
function inicializarModalPasos() {
    const pasoButtons = document.querySelectorAll('.modal-paso-btn');
    if (pasoButtons.length === 0) return;
    
    pasoButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            pasoButtons.forEach(b => {
                b.removeAttribute('data-active');
                b.classList.remove('active');
            });
            
            btn.setAttribute('data-active', 'true');
            btn.classList.add('active');
        });
    });
    
    if (pasoButtons.length > 0) {
        pasoButtons[0].classList.add('active');
    }
}

/**
 * Inicializa el toggle switch de Requisitos/Materiales en el modal
 */
function inicializarModalSwitch() {
    const toggleInput = document.getElementById('modal-toggle');
    const requisitosContainer = document.querySelector('[data-content="requisitos"]');
    const materialesContainer = document.querySelector('[data-content="materiales"]');
    
    if (!toggleInput || !requisitosContainer || !materialesContainer) return;
    
    function cambiarContenido(mostrarRequisitos) {
        if (mostrarRequisitos) {
            requisitosContainer.style.display = 'flex';
            materialesContainer.style.display = 'none';
        } else {
            requisitosContainer.style.display = 'none';
            materialesContainer.style.display = 'block';
        }
    }
    
    toggleInput.checked = false;
    requisitosContainer.style.display = 'flex';
    materialesContainer.style.display = 'none';
    
    toggleInput.onchange = (e) => {
        cambiarContenido(!e.target.checked);
    };
}

/**
 * Inicializa los filtros rápidos
 */
function inicializarFiltrosRapidos() {
    const quickFilterBtns = document.querySelectorAll('.quick-filter-btn');
    const filterOptionsSection = document.getElementById('filter-options-section');
    const filterOptionsTitle = document.getElementById('filter-options-title');
    const filterOptionsContent = document.getElementById('filter-options-content');
    const filterOptionsClose = document.querySelector('.filter-options-close');
    
    if (quickFilterBtns.length === 0 || !filterOptionsSection || !filterOptionsTitle || !filterOptionsContent) {
        return;
    }

    /** Botón de filtro rápido que abrió el panel (para devolver foco al cerrar). */
    let panelOpenerButton = null;

    function estaPanelFiltrosAbierto() {
        return !filterOptionsSection.hidden;
    }

    function enfocarPrimerElementoPanel() {
        requestAnimationFrame(() => {
            const closeBtn = filterOptionsSection.querySelector('.filter-options-close');
            const primeraOpcion = filterOptionsContent.querySelector('button.filter-option-item');
            const destino = closeBtn || primeraOpcion;
            if (destino) destino.focus();
        });
    }

    function manejarEscapePanelFiltros(e) {
        if (e.key !== 'Escape') return;
        if (e.defaultPrevented) return;
        if (!estaPanelFiltrosAbierto()) return;
        e.preventDefault();
        cerrarOpciones();
    }

    function trapFocusPanelFiltros(e) {
        if (e.key !== 'Tab' || filterOptionsSection.hidden) return;
        const focusables = Array.from(
            filterOptionsSection.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        ).filter(el => el.getClientRects().length > 0);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    filterOptionsSection.addEventListener('keydown', trapFocusPanelFiltros);
    document.addEventListener('keydown', manejarEscapePanelFiltros);
    
    // Mapeo de tipos de filtro a títulos
    const filterTitles = {
        'usuarios': '¿Quién va a usar la herramienta?',
        'uso': '¿Para qué la usarás?',
        'tipo': '¿Qué tipo de herramienta buscas?'
    };
    
    // Función para obtener icono según el tipo y valor
    function obtenerIconoFiltro(tipo, valor) {
        const normalizarClave = (v) => (v || '')
            .toString()
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        const iconosPorTipo = {
            'usuarios': {
                // Roles actualizados (y compatibilidad con nombres anteriores)
                'diseñador': 'palette',
                'disenador': 'palette',
                'desarrollador': 'code',
                'certificado qa': 'verified',
                'certificador qa': 'verified',
                'qa': 'verified',
                'content': 'description',
                'creador de contenido': 'description',
                'general': 'public',
                'transversal': 'public',
                'montahista': 'construction',
                'montajista': 'construction',
                'todos': 'groups',
                'equipo de trabajo': 'groups'
            },
            'uso': {
                // Usos actualizados (y compatibilidad con etiquetas antiguas)
                'creacion de contenido': 'description',
                'diagnostico': 'search',
                'diseno': 'palette',
                'diseño': 'palette',
                'formacion y aplicacion': 'school',
                'formación y aplicación': 'school',
                // Compat: si algún JSON aún viene separado
                'formacion': 'school',
                'formación': 'school',
                'aplicacion': 'school',
                'aplicación': 'school',
                // Legacy
                'area del banco 1': 'business',
                'area del banco 2': 'corporate_fare',
                'area del banco 3': 'domain'
            },
            'tipo': {
                'Manual de uso': 'menu_book',
                'Infografías': 'image',
                'Enlaces externos': 'link',
                'Guías': 'description'
            }
        };

        if (tipo === 'usuarios') {
            const key = normalizarClave(valor);
            return iconosPorTipo.usuarios[key] || 'help_outline';
        }

        if (tipo === 'uso') {
            const key = normalizarClave(valor);
            return iconosPorTipo.uso[key] || 'help_outline';
        }

        return iconosPorTipo[tipo]?.[valor] || 'help_outline';
    }
    
    // Función para obtener opciones únicas
    function obtenerOpcionesUnicas(tipo) {
        const opciones = new Set();
        herramientas.forEach(herramienta => {
            if (herramienta[tipo] && Array.isArray(herramienta[tipo])) {
                herramienta[tipo].forEach(opcion => opciones.add(opcion));
            }
        });
        return Array.from(opciones).sort();
    }
    
    // Función para mostrar opciones
    function mostrarOpciones(tipo) {
        panelOpenerButton =
            Array.from(quickFilterBtns).find(b => b.getAttribute('data-filter-type') === tipo) || null;

        const opciones = obtenerOpcionesUnicas(tipo);
        const titulo = filterTitles[tipo] || tipo;
        
        // Actualizar título
        filterOptionsTitle.textContent = titulo;
        
        // Limpiar contenido anterior
        filterOptionsContent.innerHTML = '';
        
        // Crear elementos de opción
        opciones.forEach(opcion => {
            const optionItem = document.createElement('button');
            optionItem.type = 'button';
            optionItem.className = 'filter-option-item';
            optionItem.setAttribute('data-filter-type', tipo);
            optionItem.setAttribute('data-filter-value', opcion);
            
            // Obtener icono para esta opción
            const icono = obtenerIconoFiltro(tipo, opcion);
            
            // Crear estructura con icono y texto
            optionItem.innerHTML = `
                <span class="material-icons-outlined filter-option-icon" aria-hidden="true">${icono}</span>
                <span class="filter-option-text">${opcion}</span>
            `;
            
            // Event listener para seleccionar opción
            optionItem.addEventListener('click', () => {
                const filterType = optionItem.getAttribute('data-filter-type');
                const filterValue = optionItem.getAttribute('data-filter-value');
                
                // Aplicar el filtro
                aplicarFiltroRapido(filterType, filterValue);
                
                // Cerrar la sección de opciones (sin devolver foco al botón de categoría)
                cerrarOpciones({ restoreFocus: false });

                // Mostrar la sección de herramientas y mover foco fuera del panel oculto
                const toolsSection = document.querySelector('.tools-section');
                if (toolsSection) {
                    toolsSection.style.display = 'block';
                }
                const limpiarFiltroBtn = document.getElementById('btn-limpiar-filtro-rapido');
                if (limpiarFiltroBtn) {
                    limpiarFiltroBtn.focus();
                }

                // Scroll suave hacia las herramientas filtradas
                if (toolsSection) {
                    toolsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            
            filterOptionsContent.appendChild(optionItem);
        });
        
        // Mostrar sección (hidden evita que quede en el árbol de accesibilidad cuando está cerrada)
        filterOptionsSection.hidden = false;

        // Actualizar estado de botones
        quickFilterBtns.forEach(btn => {
            if (btn.getAttribute('data-filter-type') === tipo) {
                btn.classList.add('active');
                btn.setAttribute('aria-expanded', 'true');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-expanded', 'false');
            }
        });

        enfocarPrimerElementoPanel();
    }
    
    // Función para cerrar opciones
    function cerrarOpciones(options = {}) {
        const { restoreFocus = true } = options;
        const botonParaFoco = restoreFocus && panelOpenerButton ? panelOpenerButton : null;

        filterOptionsSection.hidden = true;
        quickFilterBtns.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-expanded', 'false');
        });
        panelOpenerButton = null;

        if (botonParaFoco) {
            requestAnimationFrame(() => botonParaFoco.focus());
        }
    }
    
    // Función para aplicar filtro rápido
    function aplicarFiltroRapido(tipo, valor) {
        // Aplicar filtro directamente sin depender de checkboxes
        let usuariosSeleccionados = [];
        let usosSeleccionados = [];
        let tiposSeleccionados = [];
        
        // Establecer el filtro seleccionado
        if (tipo === 'usuarios') {
            usuariosSeleccionados = [valor];
        } else if (tipo === 'uso') {
            usosSeleccionados = [valor];
        } else if (tipo === 'tipo') {
            tiposSeleccionados = [valor];
        }
        
        filtrosActivos = {
            usuarios: usuariosSeleccionados,
            uso: usosSeleccionados,
            tipo: tiposSeleccionados
        };
        
        // Filtrar herramientas directamente
        herramientasFiltradas = herramientas.filter(herramienta => {
            const coincideUsuarios = usuariosSeleccionados.length === 0 || 
                herramienta.usuarios.some(u => usuariosSeleccionados.includes(u));
            
            const coincideUso = usosSeleccionados.length === 0 || 
                herramienta.uso.some(u => usosSeleccionados.includes(u));
            
            const coincideTipo = tiposSeleccionados.length === 0 || 
                herramienta.tipo.some(t => tiposSeleccionados.includes(t));
            
            return coincideUsuarios && coincideUso && coincideTipo;
        });
        
        const herramientasVisibles = obtenerHerramientasVisibles(herramientasFiltradas);
        
        // Anunciar resultados para lectores de pantalla
        if (typeof anunciarResultadosFiltro === 'function') {
            anunciarResultadosFiltro(herramientasVisibles.length);
        }
        
        // Renderizar herramientas filtradas
        toolsGrid.innerHTML = '';
        if (herramientasVisibles.length === 0) {
            if (noResults) {
                noResults.style.display = 'block';
            }
        } else {
            if (noResults) {
                noResults.style.display = 'none';
            }
            renderizarHerramientasConAnimacion(herramientasVisibles, herramientasVisibles);
        }
    }
    
    // Event listeners para botones de filtrado rápido
    quickFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filterType = btn.getAttribute('data-filter-type');
            const isActive = btn.classList.contains('active');
            
            if (isActive) {
                cerrarOpciones();
            } else {
                mostrarOpciones(filterType);
            }
        });
    });
    
    // Event listener para botón cerrar
    if (filterOptionsClose) {
        filterOptionsClose.addEventListener('click', cerrarOpciones);
    }
    
    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.quick-filters-container') && 
            !e.target.closest('.filter-options-section')) {
            cerrarOpciones();
        }
    });
    
    // Botón limpiar filtro rápido
    const btnLimpiarFiltroRapido = document.getElementById('btn-limpiar-filtro-rapido');
    if (btnLimpiarFiltroRapido) {
        btnLimpiarFiltroRapido.addEventListener('click', () => {
            // Limpiar filtros
            herramientasFiltradas = [];
            filtrosActivos = { usuarios: [], uso: [], tipo: [] };
            toolsGrid.innerHTML = '';
            
            // Ocultar sección de herramientas
            const toolsSection = document.querySelector('.tools-section');
            if (toolsSection) {
                toolsSection.style.display = 'none';
            }
            
            // Ocultar mensaje de no resultados
            if (noResults) {
                noResults.style.display = 'none';
            }
            
            // Desactivar botones de filtrado rápido
            quickFilterBtns.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-expanded', 'false');
            });
            
            // Cerrar sección de opciones si está abierta (foco permanece en limpiar)
            cerrarOpciones({ restoreFocus: false });
        });
    }
}

// Inicializar aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
