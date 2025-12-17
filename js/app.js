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

// Variable para guardar el elemento que abrió el modal (gestión de foco)
let lastFocusedCard = null;

// Elementos del DOM
const toolsGrid = document.getElementById('tools-grid');
const noResults = document.getElementById('no-results');
const modal = document.getElementById('modal');
const modalOverlay = document.querySelector('.modal-overlay');
const modalClose = document.querySelector('.modal-close');

/**
 * Inicialización de la aplicación
 */
async function init() {
    try {
        // Cargar herramientas desde JSON
        await cargarHerramientas();
        
        // Inicializar filtros (checkboxes)
        inicializarFiltros();
        
        // Renderizar herramientas
        renderizarHerramientas(herramientas);
        
        // Configurar event listeners
        configurarEventListeners();
        
        // Notificar al loader que el contenido está listo
        if (window.LoaderGSAP && window.LoaderGSAP.ocultarLoader) {
            setTimeout(() => {
                window.LoaderGSAP.ocultarLoader();
            }, 300);
        }
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        mostrarError('No se pudieron cargar las herramientas. Por favor, recarga la página.');
        
        // Ocultar loader incluso si hay error
        if (window.LoaderGSAP && window.LoaderGSAP.ocultarLoader) {
            setTimeout(() => {
                window.LoaderGSAP.ocultarLoader();
            }, 500);
        }
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
    btnLimpiar.style.display = hayFiltrosActivos ? 'flex' : 'none';
}

/**
 * Limpia todos los filtros seleccionados
 */
function limpiarFiltros() {
    const checkboxes = document.querySelectorAll('.filter-checkbox:checked');
    checkboxes.forEach(cb => cb.checked = false);
    
    // Cerrar dropdowns
    document.querySelectorAll('.filter-dropdown').forEach(d => {
        d.classList.remove('open', 'has-selection');
        d.querySelector('.filter-dropdown-toggle').setAttribute('aria-expanded', 'false');
    });
    
    actualizarContadoresFiltros();
    actualizarBotonLimpiar();
    aplicarFiltros();
}

/**
 * Configura todos los event listeners
 */
function configurarEventListeners() {
    // Modal
    modalClose.addEventListener('click', cerrarModal);
    modalOverlay.addEventListener('click', cerrarModal);
    
    // Cerrar modal con ESC (WCAG 2.1 - Teclado)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
            const isModalOpen = modal.style.display !== 'none' && 
                               modal.style.display !== '' &&
                               (!modal.hasAttribute('aria-hidden') || 
                                modal.getAttribute('aria-hidden') !== 'true');
            
            if (isModalOpen) {
                e.preventDefault();
                e.stopPropagation();
                cerrarModal();
            }
        }
    }, true);
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
    
    // Anunciar resultados para lectores de pantalla
    anunciarResultadosFiltro(herramientasFiltradas.length);
    
    // Obtener cards actuales antes de limpiar
    const cardsActuales = Array.from(toolsGrid.querySelectorAll('.tool-card'));
    const idsActuales = new Set(cardsActuales.map(card => card.getAttribute('data-id')));
    
    // Obtener IDs de las nuevas herramientas filtradas
    const idsNuevos = new Set(herramientasFiltradas.map(h => h.id.toString()));
    
    // Identificar cards que deben desaparecer
    const cardsARemover = cardsActuales.filter(card => {
        const id = card.getAttribute('data-id');
        return !idsNuevos.has(id);
    });
    
    // Identificar herramientas que son nuevas (no estaban antes)
    const herramientasNuevas = herramientasFiltradas.filter(h => !idsActuales.has(h.id.toString()));
    
    // Animar salida de cards que desaparecen
    if (window.AnimacionesGSAP && cardsARemover.length > 0) {
        window.AnimacionesGSAP.animarSalidaCards(cardsARemover, () => {
            renderizarHerramientasConAnimacion(herramientasFiltradas, herramientasNuevas);
        });
    } else {
        if (cardsARemover.length > 0) {
            cardsARemover.forEach(card => card.remove());
        }
        renderizarHerramientasConAnimacion(herramientasFiltradas, herramientasNuevas);
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
 * Colores vibrantes para fondos de cards - Identidad Bancolombia
 */
const coloresFondo = [
    "#BBDEFB", "#C8E6C9", "#FFE082", "#F8BBD0", "#CE93D8",
    "#B39DDB", "#80DEEA", "#FFCC80", "#AED581", "#90CAF9",
    "#FFAB91", "#A5D6A7"
];

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
 * Obtiene un color aleatorio del arreglo de colores
 */
function obtenerColorAleatorio() {
    return coloresFondo[Math.floor(Math.random() * coloresFondo.length)];
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
    const card = document.createElement('button');
    card.className = 'tool-card';
    card.setAttribute('data-id', herramienta.id);
    card.type = 'button';
    card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-label', `Abrir herramienta: ${herramienta.titulo}`);
    
    const colorFondo = obtenerColorPorId(herramienta.id);
    const tieneImagen = herramienta.imagen && herramienta.imagen.trim() !== '';
    const icono = obtenerIconoPorTipo(herramienta.tipo);
    
    const imagenHTML = tieneImagen 
        ? `<img src="${herramienta.imagen}" alt="" class="card-image" aria-hidden="true" />`
        : `<span class="material-icons-outlined card-icon" aria-hidden="true">${icono}</span>`;
    
    // Crear badges HTML para usuarios
    const usuariosBadges = herramienta.usuarios
        .slice(0, 2) // Mostrar máximo 2 para no saturar
        .map(u => `<span class="badge badge-usuario"><span class="material-icons-outlined badge-icon" aria-hidden="true">person</span>${u}</span>`)
        .join('');
    
    // Crear badges HTML para uso
    const usoBadges = herramienta.uso
        .slice(0, 1) // Mostrar máximo 1
        .map(u => `<span class="badge badge-uso"><span class="material-icons-outlined badge-icon" aria-hidden="true">business</span>${u}</span>`)
        .join('');
    
    // Crear badges HTML para tipo
    const tipoBadges = herramienta.tipo
        .slice(0, 1) // Mostrar máximo 1
        .map(t => `<span class="badge badge-tipo"><span class="material-icons-outlined badge-icon" aria-hidden="true">widgets</span>${t}</span>`)
        .join('');
    
    card.innerHTML = `
        <div class="card-image-container" style="background-color: ${colorFondo};" aria-hidden="true">
            ${imagenHTML}
        </div>
        <div class="card-content">
            <h3 class="card-title">${herramienta.titulo}</h3>
            <p class="card-description">${herramienta.descripcion.substring(0, 100)}${herramienta.descripcion.length > 100 ? '...' : ''}</p>
            <div class="card-badges" aria-hidden="true">
                ${usuariosBadges}
                ${usoBadges}
                ${tipoBadges}
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => {
        lastFocusedCard = card;
        abrirModal(herramienta);
    });
    
    return card;
}

/**
 * Obtiene un color consistente basado en el ID de la herramienta
 */
function obtenerColorPorId(id) {
    return coloresFondo[id % coloresFondo.length];
}

/**
 * Abre el modal con los detalles de la herramienta
 */
function abrirModal(herramienta) {
    modal.removeAttribute('aria-hidden');
    modal.setAttribute('aria-modal', 'true');
    
    const mainContent = document.getElementById('mainContent');
    const header = document.querySelector('.header');
    const footer = document.querySelector('.footer');
    
    if (mainContent) mainContent.setAttribute('aria-hidden', 'true');
    if (header) header.setAttribute('aria-hidden', 'true');
    if (footer) footer.setAttribute('aria-hidden', 'true');
    
    if (window.AnimacionesGSAP && window.AnimacionesGSAP.mostrarLoaderModal) {
        window.AnimacionesGSAP.mostrarLoaderModal();
    }
    
    const modalContent = document.querySelector('.modal-content');
    if (window.AnimacionesGSAP && modalContent) {
        window.AnimacionesGSAP.animarAperturaModal(modal, modalOverlay, modalContent);
    } else {
        modal.style.display = 'flex';
    }
    
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        const modalTitulo = document.getElementById('modal-titulo');
        if (modalTitulo) {
            modalTitulo.setAttribute('tabindex', '-1');
            modalTitulo.focus();
            
            setTimeout(() => {
                modalTitulo.removeAttribute('tabindex');
                if (modalClose) {
                    modalClose.focus();
                }
            }, 100);
            
            configurarTrapFocus();
        }
    }, 100);
    
    setTimeout(() => {
        const colorFondo = obtenerColorPorId(herramienta.id);
        const modalImageContainer = document.getElementById('modal-image-container');
        const tieneImagen = herramienta.imagen && herramienta.imagen.trim() !== '';
        
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
                modalImageContainer.style.backgroundColor = colorFondo;
                finalizarCarga();
            };
            
            img.onerror = () => {
                const icono = obtenerIconoPorTipo(herramienta.tipo);
                modalImageContainer.innerHTML = `<span class="material-icons-outlined modal-icon">${icono}</span>`;
                modalImageContainer.style.backgroundColor = colorFondo;
                finalizarCarga();
            };
            
            setTimeout(() => {
                if (!imagenCargada) {
                    const icono = obtenerIconoPorTipo(herramienta.tipo);
                    modalImageContainer.innerHTML = `<span class="material-icons-outlined modal-icon">${icono}</span>`;
                    modalImageContainer.style.backgroundColor = colorFondo;
                    finalizarCarga();
                }
            }, 3000);
            
            img.src = herramienta.imagen;
        } else {
            const icono = obtenerIconoPorTipo(herramienta.tipo);
            modalImageContainer.innerHTML = `<span class="material-icons-outlined modal-icon">${icono}</span>`;
            modalImageContainer.style.backgroundColor = colorFondo;
            completarCargaModal();
        }
        
        // Llenar contenido del modal
        document.getElementById('modal-titulo').textContent = herramienta.titulo;
        
        // Llenar badges de usuarios
        const modalUsuarios = document.getElementById('modal-usuarios');
        modalUsuarios.innerHTML = `
            <span class="modal-tag-label"><span class="material-icons-outlined tag-icon" aria-hidden="true">person</span>Para:</span>
            ${herramienta.usuarios.map(u => `<span class="modal-tag usuarios">${u}</span>`).join('')}
        `;
        
        // Llenar badges de uso
        const modalUso = document.getElementById('modal-uso');
        modalUso.innerHTML = `
            <span class="modal-tag-label"><span class="material-icons-outlined tag-icon" aria-hidden="true">business</span>Uso:</span>
            ${herramienta.uso.map(u => `<span class="modal-tag uso">${u}</span>`).join('')}
        `;
        
        // Llenar badges de tipo
        const modalTipo = document.getElementById('modal-tipo');
        modalTipo.innerHTML = `
            <span class="modal-tag-label"><span class="material-icons-outlined tag-icon" aria-hidden="true">widgets</span>Tipo:</span>
            ${herramienta.tipo.map(t => `<span class="modal-tag tipo">${t}</span>`).join('')}
        `;
        
        document.getElementById('modal-descripcion').textContent = herramienta.descripcion;
        document.getElementById('modal-objetivo').textContent = herramienta.objetivo;
        
        // Llenar materiales
        const materialesList = document.getElementById('modal-materiales');
        materialesList.innerHTML = '';
        if (herramienta.materiales) {
            herramienta.materiales.forEach(material => {
                const li = document.createElement('li');
                li.textContent = material;
                materialesList.appendChild(li);
            });
        }
        
        // Llenar pasos
        const pasosList = document.getElementById('modal-pasos');
        pasosList.innerHTML = '';
        if (herramienta.pasos) {
            herramienta.pasos.forEach(paso => {
                const li = document.createElement('li');
                li.textContent = paso;
                pasosList.appendChild(li);
            });
        }
        
        if (!tieneImagen) {
            completarCargaModal();
        }
    }, 100);
}

/**
 * Completa la carga del modal y oculta el loader
 */
function completarCargaModal() {
    setTimeout(() => {
        if (window.AnimacionesGSAP && window.AnimacionesGSAP.ocultarLoaderModal) {
            window.AnimacionesGSAP.ocultarLoaderModal();
        }
    }, 150);
}

/**
 * Cierra el modal
 */
function cerrarModal() {
    if (window.AnimacionesGSAP && window.AnimacionesGSAP.ocultarLoaderModal) {
        window.AnimacionesGSAP.ocultarLoaderModal();
    }
    
    removerTrapFocus();
    
    const modalContent = document.querySelector('.modal-content');
    
    const restaurarFoco = () => {
        document.body.style.overflow = '';
        
        modal.setAttribute('aria-hidden', 'true');
        modal.removeAttribute('aria-modal');
        
        const mainContent = document.getElementById('mainContent');
        const header = document.querySelector('.header');
        const footer = document.querySelector('.footer');
        
        if (mainContent) mainContent.removeAttribute('aria-hidden');
        if (header) header.removeAttribute('aria-hidden');
        if (footer) footer.removeAttribute('aria-hidden');
        
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
        const isModalOpen = modal.style.display !== 'none' && 
                           modal.style.display !== '' &&
                           !modal.hasAttribute('aria-hidden') || 
                           modal.getAttribute('aria-hidden') !== 'true';
        
        if (!isModalOpen) {
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
        const isModalOpen = modal.style.display !== 'none' && 
                           modal.style.display !== '' &&
                           (!modal.hasAttribute('aria-hidden') || 
                            modal.getAttribute('aria-hidden') !== 'true');
        
        if (!isModalOpen) {
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
    
    if (modal._focusCheckInterval) {
        clearInterval(modal._focusCheckInterval);
        modal._focusCheckInterval = null;
    }
}

// Inicializar aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Actualizar año en el footer
document.addEventListener('DOMContentLoaded', () => {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});
