/**
 * Caja de Herramientas - Aplicación Principal
 * Carga dinámica de herramientas desde JSON y sistema de filtros
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

// Filtros
const filtroCategoria = document.getElementById('filtro-categoria');
const filtroDuracion = document.getElementById('filtro-duracion');
const filtroParticipantes = document.getElementById('filtro-participantes');

/**
 * Inicialización de la aplicación
 */
async function init() {
    try {
        // Cargar herramientas desde JSON
        await cargarHerramientas();
        
        // Inicializar filtros
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
 * Inicializa los filtros con opciones dinámicas
 */
function inicializarFiltros() {
    // Obtener valores únicos para cada filtro
    const categorias = [...new Set(herramientas.map(h => h.categoria))].sort();
    const duraciones = [...new Set(herramientas.map(h => h.duracion))].sort();
    const participantes = [...new Set(herramientas.map(h => h.participantes))].sort();
    
    // Llenar filtro de categorías
    categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria;
        filtroCategoria.appendChild(option);
    });
    
    // Llenar filtro de duraciones
    duraciones.forEach(duracion => {
        const option = document.createElement('option');
        option.value = duracion;
        option.textContent = duracion;
        filtroDuracion.appendChild(option);
    });
    
    // Llenar filtro de participantes
    participantes.forEach(participante => {
        const option = document.createElement('option');
        option.value = participante;
        option.textContent = participante;
        filtroParticipantes.appendChild(option);
    });
}

/**
 * Configura todos los event listeners
 */
function configurarEventListeners() {
    // Filtros
    filtroCategoria.addEventListener('change', aplicarFiltros);
    filtroDuracion.addEventListener('change', aplicarFiltros);
    filtroParticipantes.addEventListener('change', aplicarFiltros);
    
    // Modal
    modalClose.addEventListener('click', cerrarModal);
    modalOverlay.addEventListener('click', cerrarModal);
    
    // Cerrar modal con ESC (WCAG 2.1 - Teclado)
    // Este listener debe estar antes del trap focus para que ESC funcione
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
    }, true); // Usar capture phase para que se ejecute antes del trap focus
}

/**
 * Aplica los filtros seleccionados
 */
function aplicarFiltros() {
    const categoriaSeleccionada = filtroCategoria.value;
    const duracionSeleccionada = filtroDuracion.value;
    const participantesSeleccionados = filtroParticipantes.value;
    
    // Filtrar herramientas
    herramientasFiltradas = herramientas.filter(herramienta => {
        const coincideCategoria = !categoriaSeleccionada || herramienta.categoria === categoriaSeleccionada;
        const coincideDuracion = !duracionSeleccionada || herramienta.duracion === duracionSeleccionada;
        const coincideParticipantes = !participantesSeleccionados || herramienta.participantes === participantesSeleccionados;
        
        return coincideCategoria && coincideDuracion && coincideParticipantes;
    });
    
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
            // Después de que las cards salgan, renderizar las nuevas
            renderizarHerramientasConAnimacion(herramientasFiltradas, herramientasNuevas);
        });
    } else {
        // Si no hay animaciones o no hay cards a remover, limpiar y renderizar directamente
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
    // Limpiar grid solo si no hay animaciones GSAP o si no hay cards existentes
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
    
    // Obtener IDs de herramientas nuevas
    const idsNuevos = herramientasNuevas ? new Set(herramientasNuevas.map(h => h.id.toString())) : new Set();
    
    // Si no hay herramientasNuevas definidas, todas son nuevas (caso inicial)
    const todasSonNuevas = !herramientasNuevas || herramientasNuevas.length === herramientasArray.length;
    
    // Crear y agregar cards
    const cardsParaAnimar = [];
    herramientasArray.forEach(herramienta => {
        // Verificar si la card ya existe
        const cardExistente = toolsGrid.querySelector(`[data-id="${herramienta.id}"]`);
        
        if (!cardExistente) {
            const card = crearCard(herramienta);
            toolsGrid.appendChild(card);
            
            // Si es una herramienta nueva o todas son nuevas, agregarla a la lista para animar
            if (todasSonNuevas || idsNuevos.has(herramienta.id.toString())) {
                cardsParaAnimar.push(card);
            }
        }
    });
    
    // Configurar animaciones de hover para las nuevas cards
    if (window.AnimacionesGSAP) {
        window.AnimacionesGSAP.configurarHoverCards();
        
        // Animar entrada de cards nuevas
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
    // Limpiar grid
    toolsGrid.innerHTML = '';
    
    // Mostrar mensaje si no hay resultados
    if (herramientasArray.length === 0) {
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    // Crear y agregar cards
    herramientasArray.forEach(herramienta => {
        const card = crearCard(herramienta);
        toolsGrid.appendChild(card);
    });
    
    // Configurar animaciones de hover para las nuevas cards
    if (window.AnimacionesGSAP) {
        window.AnimacionesGSAP.configurarHoverCards();
    }
    
    // Animar entrada de cards
    requestAnimationFrame(() => {
        if (window.AnimacionesGSAP) {
            window.AnimacionesGSAP.animarEntradaCards();
            window.AnimacionesGSAP.animarEntradaImagenesCards();
        }
    });
}

/**
 * Colores vibrantes para fondos de cards - Identidad Bancolombia
 * Colores más vivos pero manteniendo legibilidad
 */
const coloresFondo = [
    "#BBDEFB", // Azul vibrante
    "#C8E6C9", // Verde vibrante
    "#FFE082", // Amarillo vibrante (inspirado en acento Bancolombia)
    "#F8BBD0", // Rosa vibrante
    "#CE93D8", // Morado vibrante
    "#B39DDB", // Lila vibrante
    "#80DEEA", // Turquesa vibrante
    "#FFCC80", // Naranja vibrante
    "#AED581", // Verde lima vibrante
    "#90CAF9", // Azul cielo vibrante
    "#FFAB91", // Coral vibrante
    "#A5D6A7"  // Verde menta vibrante
];

/**
 * Íconos Material Icons por categoría (fallback cuando no hay imagen)
 */
const iconosPorCategoria = {
    "empatía": "favorite",
    "experiencia de usuario": "person",
    "innovación": "lightbulb",
    "planificación": "calendar_today",
    "prototipado": "build",
    "validación": "verified",
    "arquitectura de información": "account_tree",
    "estrategia": "trending_up"
};

/**
 * Obtiene un color aleatorio del arreglo de colores
 */
function obtenerColorAleatorio() {
    return coloresFondo[Math.floor(Math.random() * coloresFondo.length)];
}

/**
 * Obtiene un ícono según la categoría
 */
function obtenerIconoPorCategoria(categoria) {
    const categoriaLower = categoria.toLowerCase();
    for (const [key, icon] of Object.entries(iconosPorCategoria)) {
        if (categoriaLower.includes(key)) {
            return icon;
        }
    }
    return "lightbulb_outline"; // Ícono por defecto
}

/**
 * Crea una card para una herramienta
 * 
 * REFACTORIZACIÓN PARA ACCESIBILIDAD WCAG 2.1 AA:
 * 
 * DECISIÓN 1: Usar <button> en lugar de <div>
 * - Razón: Los elementos interactivos deben usar elementos semánticos nativos
 * - Beneficio: Navegación por teclado automática (Tab, Enter, Space) sin tabindex
 * - Cumple: WCAG 2.1 Criterio 4.1.2 (Name, Role, Value)
 * 
 * DECISIÓN 2: Atributos ARIA
 * - aria-haspopup="dialog": Indica que el botón abre un diálogo modal
 * - aria-label: Proporciona un nombre accesible descriptivo
 * - Cumple: WCAG 2.1 Criterio 4.1.3 (Status Messages)
 * 
 * DECISIÓN 3: No usar tabindex positivo
 * - Razón: El orden de tabulación natural (DOM order) es suficiente
 * - Orden: Filtros → Cards → Footer (orden visual = orden de tabulación)
 * - Cumple: WCAG 2.1 Criterio 2.4.3 (Focus Order)
 */
function crearCard(herramienta) {
    // Usar <button> en lugar de <div> para accesibilidad
    const card = document.createElement('button');
    card.className = 'tool-card';
    card.setAttribute('data-id', herramienta.id);
    card.type = 'button'; // Evitar submit si está dentro de un form
    
    // Atributos ARIA para accesibilidad
    // aria-haspopup indica que este botón abre un diálogo modal
    card.setAttribute('aria-haspopup', 'dialog');
    // aria-label proporciona un nombre accesible que incluye el nombre de la herramienta
    card.setAttribute('aria-label', `Abrir herramienta: ${herramienta.titulo}`);
    
    // Obtener color de fondo consistente basado en el ID
    const colorFondo = obtenerColorPorId(herramienta.id);
    
    // Determinar si hay imagen o usar ícono
    const tieneImagen = herramienta.imagen && herramienta.imagen.trim() !== '';
    const imagenHTML = tieneImagen 
        ? `<img src="${herramienta.imagen}" alt="" class="card-image" aria-hidden="true" />`
        : `<span class="material-icons-outlined card-icon" aria-hidden="true">${obtenerIconoPorCategoria(herramienta.categoria)}</span>`;
    
    card.innerHTML = `
        <div class="card-image-container" style="background-color: ${colorFondo};" aria-hidden="true">
            ${imagenHTML}
        </div>
        <div class="card-content">
            <h3 class="card-title">${herramienta.titulo}</h3>
            <div class="card-meta" aria-hidden="true">
                <span class="chip categoria">
                    <span class="material-icons-outlined chip-icon">category</span>
                    ${herramienta.categoria}
                </span>
                <span class="chip duracion">
                    <span class="material-icons-outlined chip-icon">schedule</span>
                    ${herramienta.duracion}
                </span>
                <span class="chip participantes">
                    <span class="material-icons-outlined chip-icon">people</span>
                    ${herramienta.participantes}
                </span>
            </div>
        </div>
    `;
    
    // Agregar event listener para abrir modal
    // Guardar referencia de la card para restaurar foco al cerrar (WCAG 2.1 - Gestión de foco)
    card.addEventListener('click', () => {
        lastFocusedCard = card;
        abrirModal(herramienta);
    });
    
    // ACCESIBILIDAD: Enter y Space funcionan automáticamente con <button>
    // No necesitamos agregar listeners adicionales - esto es una ventaja de usar elementos semánticos
    // Cumple: WCAG 2.1 Criterio 2.1.1 (Keyboard) - Todas las funciones son accesibles por teclado
    
    return card;
}

/**
 * Obtiene un color consistente basado en el ID de la herramienta
 * Esto asegura que la misma herramienta siempre tenga el mismo color
 */
function obtenerColorPorId(id) {
    return coloresFondo[id % coloresFondo.length];
}

/**
 * Abre el modal con los detalles de la herramienta
 * Refactorizado: Implementa gestión de foco para accesibilidad WCAG 2.1 AA
 */
function abrirModal(herramienta) {
    // ACCESIBILIDAD: Remover aria-hidden del modal cuando se abre
    modal.removeAttribute('aria-hidden');
    modal.setAttribute('aria-modal', 'true');
    
    // Ocultar contenido de fondo para lectores de pantalla
    const mainContent = document.getElementById('mainContent');
    const header = document.querySelector('.header');
    const footer = document.querySelector('.footer');
    
    if (mainContent) mainContent.setAttribute('aria-hidden', 'true');
    if (header) header.setAttribute('aria-hidden', 'true');
    if (footer) footer.setAttribute('aria-hidden', 'true');
    
    // Mostrar loader del modal primero
    if (window.AnimacionesGSAP && window.AnimacionesGSAP.mostrarLoaderModal) {
        window.AnimacionesGSAP.mostrarLoaderModal();
    }
    
    // Animar apertura del modal
    const modalContent = document.querySelector('.modal-content');
    if (window.AnimacionesGSAP && modalContent) {
        window.AnimacionesGSAP.animarAperturaModal(modal, modalOverlay, modalContent);
    } else {
        // Fallback si GSAP no está disponible
        modal.style.display = 'flex';
    }
    
    document.body.style.overflow = 'hidden'; // Prevenir scroll del body
    
    // ACCESIBILIDAD: Mover foco al título del modal después de abrirlo
    // Esto cumple con WCAG 2.1 - El foco debe ir al contenido principal del modal
    setTimeout(() => {
        const modalTitulo = document.getElementById('modal-titulo');
        if (modalTitulo) {
            // Hacer el título focusable temporalmente para mover el foco
            modalTitulo.setAttribute('tabindex', '-1');
            modalTitulo.focus();
            
            // Remover tabindex después de enfocar (el foco se moverá al botón de cerrar o primer elemento)
            setTimeout(() => {
                modalTitulo.removeAttribute('tabindex');
                // Mover foco al botón de cerrar (primer elemento interactivo)
                if (modalClose) {
                    modalClose.focus();
                }
            }, 100);
            
            // Configurar trap focus dentro del modal
            configurarTrapFocus();
        }
    }, 100);
    
    // Cargar contenido del modal de forma asíncrona para simular carga
    // Esto permite que el loader se vea mientras se procesa el contenido
    setTimeout(() => {
        // Obtener color de fondo consistente (mismo que en la card)
        const colorFondo = obtenerColorPorId(herramienta.id);
        
        // Configurar imagen/ícono en el header del modal
        const modalImageContainer = document.getElementById('modal-image-container');
        const tieneImagen = herramienta.imagen && herramienta.imagen.trim() !== '';
        
        if (tieneImagen) {
            // Si hay imagen, esperar a que cargue
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
                // Si falla la carga de la imagen, usar ícono
                const icono = obtenerIconoPorCategoria(herramienta.categoria);
                modalImageContainer.innerHTML = `<span class="material-icons-outlined modal-icon">${icono}</span>`;
                modalImageContainer.style.backgroundColor = colorFondo;
                finalizarCarga();
            };
            
            // Timeout de seguridad: si la imagen tarda más de 3 segundos, usar ícono
            setTimeout(() => {
                if (!imagenCargada) {
                    const icono = obtenerIconoPorCategoria(herramienta.categoria);
                    modalImageContainer.innerHTML = `<span class="material-icons-outlined modal-icon">${icono}</span>`;
                    modalImageContainer.style.backgroundColor = colorFondo;
                    finalizarCarga();
                }
            }, 3000);
            
            img.src = herramienta.imagen;
        } else {
            const icono = obtenerIconoPorCategoria(herramienta.categoria);
            modalImageContainer.innerHTML = `<span class="material-icons-outlined modal-icon">${icono}</span>`;
            modalImageContainer.style.backgroundColor = colorFondo;
            completarCargaModal();
        }
        
        // Llenar contenido del modal
        document.getElementById('modal-titulo').textContent = herramienta.titulo;
        
        // Llenar tags con iconos y clases de color
        const modalCategoria = document.getElementById('modal-categoria');
        modalCategoria.className = 'modal-tag categoria';
        modalCategoria.innerHTML = `
            <span class="material-icons-outlined tag-icon">category</span>
            ${herramienta.categoria}
        `;
        
        const modalDuracion = document.getElementById('modal-duracion');
        modalDuracion.className = 'modal-tag duracion';
        modalDuracion.innerHTML = `
            <span class="material-icons-outlined tag-icon">schedule</span>
            ${herramienta.duracion}
        `;
        
        const modalParticipantes = document.getElementById('modal-participantes');
        modalParticipantes.className = 'modal-tag participantes';
        modalParticipantes.innerHTML = `
            <span class="material-icons-outlined tag-icon">people</span>
            ${herramienta.participantes}
        `;
        
        document.getElementById('modal-descripcion').textContent = herramienta.descripcion;
        document.getElementById('modal-objetivo').textContent = herramienta.objetivo;
        
        // Llenar materiales
        const materialesList = document.getElementById('modal-materiales');
        materialesList.innerHTML = '';
        herramienta.materiales.forEach(material => {
            const li = document.createElement('li');
            li.textContent = material;
            materialesList.appendChild(li);
        });
        
        // Llenar pasos
        const pasosList = document.getElementById('modal-pasos');
        pasosList.innerHTML = '';
        herramienta.pasos.forEach(paso => {
            const li = document.createElement('li');
            li.textContent = paso;
            pasosList.appendChild(li);
        });
        
        // Si no hay imagen, completar inmediatamente
        if (!tieneImagen) {
            completarCargaModal();
        }
    }, 100);
}

/**
 * Completa la carga del modal y oculta el loader
 */
function completarCargaModal() {
    // Esperar un pequeño delay para que el contenido se renderice
    setTimeout(() => {
        if (window.AnimacionesGSAP && window.AnimacionesGSAP.ocultarLoaderModal) {
            window.AnimacionesGSAP.ocultarLoaderModal();
        }
    }, 150);
}

/**
 * Cierra el modal
 * Refactorizado: Restaura el foco a la card que abrió el modal (WCAG 2.1 AA)
 */
function cerrarModal() {
    // Ocultar loader del modal si está visible
    if (window.AnimacionesGSAP && window.AnimacionesGSAP.ocultarLoaderModal) {
        window.AnimacionesGSAP.ocultarLoaderModal();
    }
    
    // Remover trap focus antes de cerrar
    removerTrapFocus();
    
    const modalContent = document.querySelector('.modal-content');
    
    const restaurarFoco = () => {
        document.body.style.overflow = ''; // Restaurar scroll del body
        
        // ACCESIBILIDAD: Restaurar aria-hidden en el modal
        modal.setAttribute('aria-hidden', 'true');
        modal.removeAttribute('aria-modal');
        
        // Restaurar visibilidad de contenido de fondo para lectores de pantalla
        const mainContent = document.getElementById('mainContent');
        const header = document.querySelector('.header');
        const footer = document.querySelector('.footer');
        
        if (mainContent) mainContent.removeAttribute('aria-hidden');
        if (header) header.removeAttribute('aria-hidden');
        if (footer) footer.removeAttribute('aria-hidden');
        
        // ACCESIBILIDAD: Devolver foco a la card que abrió el modal
        // Esto cumple con WCAG 2.1 - El foco debe regresar al elemento que activó el modal
        if (lastFocusedCard) {
            // Pequeño delay para asegurar que el modal se haya cerrado visualmente
            setTimeout(() => {
                lastFocusedCard.focus();
                lastFocusedCard = null;
            }, 50);
        }
    };
    
    if (window.AnimacionesGSAP && modalContent) {
        window.AnimacionesGSAP.animarCierreModal(modal, modalOverlay, modalContent, restaurarFoco);
    } else {
        // Fallback si GSAP no está disponible
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
 * Actualiza los indicadores visuales de filtros activos
 */
function actualizarIndicadoresFiltros(categoria, duracion, participantes) {
    const grupoCategoria = filtroCategoria.closest('.filter-group');
    const grupoDuracion = filtroDuracion.closest('.filter-group');
    const grupoParticipantes = filtroParticipantes.closest('.filter-group');
    
    if (grupoCategoria) {
        grupoCategoria.classList.toggle('has-active-filter', !!categoria);
    }
    if (grupoDuracion) {
        grupoDuracion.classList.toggle('has-active-filter', !!duracion);
    }
    if (grupoParticipantes) {
        grupoParticipantes.classList.toggle('has-active-filter', !!participantes);
    }
}

/**
 * Anuncia los resultados del filtro a lectores de pantalla
 */
function anunciarResultadosFiltro(cantidad) {
    const toolsGrid = document.getElementById('tools-grid');
    if (!toolsGrid) return;
    
    // Crear o actualizar mensaje de anuncio
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
        ? 'No se encontraron herramientas con los filtros seleccionados.'
        : `Se encontraron ${cantidad} herramienta${cantidad !== 1 ? 's' : ''} con los filtros seleccionados.`;
    
    anuncio.textContent = mensaje;
    
    // Limpiar el mensaje después de un tiempo para que se anuncie de nuevo si cambia
    setTimeout(() => {
        anuncio.textContent = '';
    }, 1000);
}

/**
 * Configura el trap focus dentro del modal
 * 
 * ACCESIBILIDAD WCAG 2.1 AA:
 * 
 * DECISIÓN: Implementar "Focus Trap" (Atrapamiento de foco)
 * - Razón: Cuando un modal está abierto, el foco debe permanecer dentro del modal
 * - Beneficio: Previene que usuarios de teclado naveguen accidentalmente fuera del modal
 * - Implementación: 
 *   * Tab desde último elemento → vuelve al primero
 *   * Shift+Tab desde primer elemento → va al último
 *   * Foco fuera del modal → se trae de vuelta al primer elemento
 * - Cumple: WCAG 2.1 Criterio 2.1.2 (No Keyboard Trap) y 2.4.3 (Focus Order)
 */
let trapFocusHandler = null;

function configurarTrapFocus() {
    // Obtener todos los elementos focusables dentro del modal
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
                // Filtrar elementos ocultos
                const style = window.getComputedStyle(el);
                const isVisible = style.display !== 'none' && 
                                 style.visibility !== 'hidden' && 
                                 style.opacity !== '0';
                
                // Filtrar elementos con aria-hidden="true"
                const ariaHidden = el.getAttribute('aria-hidden');
                const isAriaVisible = ariaHidden !== 'true';
                
                return isVisible && isAriaVisible;
            });
    };
    
    // Handler para atrapar el foco
    trapFocusHandler = (e) => {
        // Verificar si el modal está abierto
        const isModalOpen = modal.style.display !== 'none' && 
                           modal.style.display !== '' &&
                           !modal.hasAttribute('aria-hidden') || 
                           modal.getAttribute('aria-hidden') !== 'true';
        
        if (!isModalOpen) {
            return; // Modal cerrado, no hacer nada
        }
        
        const focusableElements = getFocusableElements(modal);
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // Si se presiona Tab desde el último elemento, ir al primero
        if (e.key === 'Tab' && !e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
        // Si se presiona Shift+Tab desde el primer elemento, ir al último
        else if (e.key === 'Tab' && e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        }
        // Si el foco está fuera del modal, traerlo al primer elemento
        else if (e.key === 'Tab' && !modal.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
        }
    };
    
    // Agregar listener para atrapar el foco
    document.addEventListener('keydown', trapFocusHandler, true); // Usar capture phase
    
    // Si el foco se sale del modal, traerlo de vuelta
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
            // El foco se salió del modal, traerlo de vuelta
            const firstElement = focusableElements[0];
            if (firstElement) {
                firstElement.focus();
            }
        }
    };
    
    // Verificar el foco periódicamente (fallback)
    const focusCheckInterval = setInterval(checkFocus, 100);
    
    // Guardar el intervalo para limpiarlo después
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
    
    // Limpiar intervalo de verificación de foco
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

