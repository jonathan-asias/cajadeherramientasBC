/**
 * Caja de Herramientas - Aplicación Principal
 * Carga dinámica de herramientas desde JSON y sistema de filtros
 */

// Estado global de la aplicación
let herramientas = [];
let herramientasFiltradas = [];

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
    
    // Cerrar modal con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display !== 'none') {
            cerrarModal();
        }
    });
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
 * Colores suaves tipo Google/Material Design para fondos de cards
 */
const coloresFondo = [
    "#E3F2FD", // Azul suave
    "#E8F5E9", // Verde suave
    "#FFF8E1", // Amarillo suave
    "#FCE4EC", // Rosa suave
    "#EDE7F6", // Morado suave
    "#F3E5F5", // Lila suave
    "#E0F2F1", // Turquesa suave
    "#FFF3E0", // Naranja suave
    "#F1F8E9", // Verde claro
    "#E1F5FE"  // Azul claro
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
 */
function crearCard(herramienta) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.setAttribute('data-id', herramienta.id);
    
    // Obtener color de fondo consistente basado en el ID
    const colorFondo = obtenerColorPorId(herramienta.id);
    
    // Determinar si hay imagen o usar ícono
    const tieneImagen = herramienta.imagen && herramienta.imagen.trim() !== '';
    const imagenHTML = tieneImagen 
        ? `<img src="${herramienta.imagen}" alt="${herramienta.titulo}" class="card-image" />`
        : `<span class="material-icons-outlined card-icon">${obtenerIconoPorCategoria(herramienta.categoria)}</span>`;
    
    card.innerHTML = `
        <div class="card-image-container" style="background-color: ${colorFondo};">
            ${imagenHTML}
        </div>
        <div class="card-content">
            <h3 class="card-title">${herramienta.titulo}</h3>
            <div class="card-meta">
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
    card.addEventListener('click', () => abrirModal(herramienta));
    
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
 */
function abrirModal(herramienta) {
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
 */
function cerrarModal() {
    // Ocultar loader del modal si está visible
    if (window.AnimacionesGSAP && window.AnimacionesGSAP.ocultarLoaderModal) {
        window.AnimacionesGSAP.ocultarLoaderModal();
    }
    
    const modalContent = document.querySelector('.modal-content');
    
    if (window.AnimacionesGSAP && modalContent) {
        window.AnimacionesGSAP.animarCierreModal(modal, modalOverlay, modalContent, () => {
            document.body.style.overflow = ''; // Restaurar scroll del body
        });
    } else {
        // Fallback si GSAP no está disponible
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Restaurar scroll del body
    }
}

/**
 * Muestra un mensaje de error
 */
function mostrarError(mensaje) {
    toolsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--rojo-bancolombia);">
            <p style="font-size: 18px;">${mensaje}</p>
        </div>
    `;
}

// Inicializar aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

