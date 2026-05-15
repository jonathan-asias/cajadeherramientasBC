/**
 * ============================================
 * ANIMACIONES GSAP - Caja de Herramientas
 * Estilo Google Material Motion
 * ============================================
 */

// Verificar si GSAP está disponible
const gsapDisponible = typeof gsap !== 'undefined';

if (!gsapDisponible) {
    console.error('GSAP no está cargado. Asegúrate de incluir gsap.min.js antes de este archivo.');
}

// Preferencia del sistema: reducir movimiento (vestibular, epilepsia, etc.)
const reduceMotionMql = window.matchMedia('(prefers-reduced-motion: reduce)');

function prefersReducedMotion() {
    return reduceMotionMql.matches;
}

function syncGsapDefaults() {
    if (!gsapDisponible) return;
    const reduced = prefersReducedMotion();
    gsap.defaults({
        duration: reduced ? 0 : 0.5,
        ease: reduced ? 'none' : 'power2.out'
    });
}

syncGsapDefaults();

function onReduceMotionPreferenceChange() {
    syncGsapDefaults();
}

if (typeof reduceMotionMql.addEventListener === 'function') {
    reduceMotionMql.addEventListener('change', onReduceMotionPreferenceChange);
} else if (typeof reduceMotionMql.addListener === 'function') {
    reduceMotionMql.addListener(onReduceMotionPreferenceChange);
}

/**
 * ============================================
 * UTILIDADES
 * ============================================
 */

/**
 * Obtiene la duración ajustada según preferencias de accesibilidad
 */
function getDuration(baseDuration) {
    return prefersReducedMotion() ? 0 : baseDuration;
}

/**
 * ============================================
 * ANIMACIONES DE CARDS
 * ============================================
 */

/**
 * Animación de entrada de las cards al cargar la página
 */
function animarEntradaCards() {
    if (!gsapDisponible) return;
    
    const cards = document.querySelectorAll('.tool-card');
    
    if (cards.length === 0) return;

    if (prefersReducedMotion()) {
        gsap.set(cards, { opacity: 1, y: 0, clearProps: 'transform' });
        return;
    }
    
    // Configurar estado inicial
    gsap.set(cards, {
        opacity: 0,
        y: 20
    });
    
    // Animación de entrada con stagger
    gsap.to(cards, {
        opacity: 1,
        y: 0,
        duration: getDuration(0.6),
        stagger: 0.08,
        ease: 'power2.out'
    });
}

/**
 * Animación de entrada de imágenes en las cards
 */
function animarEntradaImagenesCards() {
    if (!gsapDisponible) return;
    
    const imageContainers = document.querySelectorAll('.card-image-container');
    
    if (imageContainers.length === 0) return;

    if (prefersReducedMotion()) {
        gsap.set(imageContainers, { opacity: 1, y: 0, clearProps: 'transform' });
        return;
    }
    
    gsap.from(imageContainers, {
        opacity: 0,
        y: -10,
        duration: getDuration(0.4),
        ease: 'power1.out',
        stagger: 0.05
    });
}

/**
 * Configurar animaciones de hover para las cards
 */
function configurarHoverCards() {
    if (!gsapDisponible) return;
    
    const cards = document.querySelectorAll('.tool-card');
    
    cards.forEach(card => {
        // Guardar referencia a la animación para poder matarla si es necesario
        let hoverAnimation = null;
        
        card.addEventListener('mouseenter', () => {
            if (prefersReducedMotion()) return;
            
            // Matar animación anterior si existe
            if (hoverAnimation) hoverAnimation.kill();
            
            hoverAnimation = gsap.to(card, {
                scale: 1.02,
                y: -4,
                duration: getDuration(0.2),
                ease: 'power1.out',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                onUpdate: function() {
                    // Actualizar sombra durante la animación
                    const progress = this.progress();
                    const shadowIntensity = progress * 0.12;
                    card.style.boxShadow = `0 ${4 * progress}px ${16 * progress}px rgba(0, 0, 0, ${shadowIntensity})`;
                }
            });
        });
        
        card.addEventListener('mouseleave', () => {
            if (prefersReducedMotion()) return;
            
            // Matar animación anterior si existe
            if (hoverAnimation) hoverAnimation.kill();
            
            hoverAnimation = gsap.to(card, {
                scale: 1,
                y: 0,
                duration: getDuration(0.2),
                ease: 'power1.out',
                boxShadow: '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)'
            });
        });
    });
}

/**
 * ============================================
 * ANIMACIONES DE MODAL
 * ============================================
 */

/**
 * Animación de apertura del modal
 */
function animarAperturaModal(modal, overlay, modalContent) {
    if (!gsapDisponible) {
        modal.style.display = 'flex';
        return;
    }
    if (prefersReducedMotion()) {
        modal.style.display = 'flex';
        if (overlay) gsap.set(overlay, { opacity: 1 });
        if (modalContent) gsap.set(modalContent, { scale: 1, y: 0, opacity: 1, clearProps: 'transform' });
        return;
    }
    
    // Configurar estado inicial
    gsap.set(overlay, { opacity: 0 });
    gsap.set(modalContent, { 
        scale: 0.85, 
        y: -10, 
        opacity: 0 
    });
    
    // Mostrar modal
    modal.style.display = 'flex';
    
    // Animar overlay
    gsap.to(overlay, {
        opacity: 1,
        duration: getDuration(0.35),
        ease: 'power3.out'
    });
    
    // Animar contenido del modal
    gsap.to(modalContent, {
        scale: 1,
        y: 0,
        opacity: 1,
        duration: getDuration(0.35),
        ease: 'power3.out'
    });
    
    // Animar header del modal (imagen/ícono)
    const modalHeaderImg = modalContent.querySelector('.modal-image-container img, .modal-image-container .modal-icon');
    if (modalHeaderImg) {
        gsap.from(modalHeaderImg, {
            opacity: 0,
            scale: 0.9,
            duration: getDuration(0.4),
            ease: 'power2.out',
            delay: 0.1
        });
    }
}

/**
 * Animación de cierre del modal
 */
function animarCierreModal(modal, overlay, modalContent, callback) {
    if (!gsapDisponible) {
        modal.style.display = 'none';
        if (callback) callback();
        return;
    }
    if (prefersReducedMotion()) {
        modal.style.display = 'none';
        if (overlay) gsap.set(overlay, { clearProps: 'opacity' });
        if (modalContent) gsap.set(modalContent, { clearProps: 'opacity,scale,transform' });
        if (callback) callback();
        return;
    }
    
    // Animar contenido del modal
    gsap.to(modalContent, {
        opacity: 0,
        scale: 0.85,
        y: -10,
        duration: getDuration(0.35),
        ease: 'power1.in'
    });
    
    // Animar overlay
    gsap.to(overlay, {
        opacity: 0,
        duration: getDuration(0.35),
        ease: 'power1.in',
        onComplete: () => {
            modal.style.display = 'none';
            if (callback) callback();
        }
    });
}

/**
 * ============================================
 * ANIMACIONES DE FILTROS
 * ============================================
 */

/**
 * Animación de salida de cards filtradas
 */
function animarSalidaCards(cards, callback) {
    if (cards.length === 0) {
        if (callback) callback();
        return;
    }
    
    if (!gsapDisponible || prefersReducedMotion()) {
        cards.forEach(card => card.remove());
        if (callback) callback();
        return;
    }
    
    gsap.to(cards, {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: getDuration(0.35),
        ease: 'power1.in',
        stagger: 0.03,
        onComplete: () => {
            cards.forEach(card => card.remove());
            if (callback) callback();
        }
    });
}

/**
 * Animación de entrada de cards filtradas
 */
function animarEntradaCardsFiltradas(cards) {
    if (!gsapDisponible || cards.length === 0) return;

    if (prefersReducedMotion()) {
        gsap.set(cards, { opacity: 1, y: 0, clearProps: 'transform' });
        return;
    }
    
    // Configurar estado inicial
    gsap.set(cards, {
        opacity: 0,
        y: 20
    });
    
    // Animación de entrada
    gsap.to(cards, {
        opacity: 1,
        y: 0,
        duration: getDuration(0.5),
        stagger: 0.05,
        ease: 'power2.out'
    });
}

/**
 * ============================================
 * ANIMACIONES DE PANEL DE ACCESIBILIDAD
 * ============================================
 */

/**
 * Animación de apertura del panel de accesibilidad
 */
function animarAperturaPanelAccesibilidad(panel) {
    if (!gsapDisponible) {
        panel.classList.add('visible');
        return;
    }
    if (prefersReducedMotion()) {
        panel.classList.add('visible');
        gsap.set(panel, { clearProps: 'x,opacity,transform' });
        return;
    }
    
    // Configurar estado inicial
    gsap.set(panel, {
        x: 40,
        opacity: 0
    });
    
    // Animar apertura
    gsap.to(panel, {
        x: 0,
        opacity: 1,
        duration: getDuration(0.3),
        ease: 'power2.out'
    });
}

/**
 * Animación de cierre del panel de accesibilidad
 */
function animarCierrePanelAccesibilidad(panel, callback) {
    if (!gsapDisponible) {
        panel.classList.remove('visible');
        if (callback) callback();
        return;
    }
    if (prefersReducedMotion()) {
        panel.classList.remove('visible');
        gsap.set(panel, { clearProps: 'x,opacity,transform' });
        if (callback) callback();
        return;
    }
    
    gsap.to(panel, {
        x: 40,
        opacity: 0,
        duration: getDuration(0.3),
        ease: 'power2.in',
        onComplete: () => {
            panel.classList.remove('visible');
            if (callback) callback();
        }
    });
}

/**
 * Configurar animaciones de botones del panel de accesibilidad
 */
function configurarAnimacionesBotonesPanel() {
    if (!gsapDisponible) return;
    
    const panel = document.getElementById('panelAccesibilidad');
    if (!panel) return;
    
    const botones = panel.querySelectorAll('button');
    
    botones.forEach(btn => {
        btn.addEventListener('click', () => {
            if (prefersReducedMotion()) return;
            
            gsap.fromTo(btn, 
                { scale: 0.95 }, 
                { 
                    scale: 1, 
                    duration: getDuration(0.12),
                    ease: 'power1.out'
                }
            );
        });
    });
}

/**
 * ============================================
 * INICIALIZACIÓN
 * ============================================
 */

/**
 * Inicializar todas las animaciones cuando el DOM esté listo
 */
function inicializarAnimaciones() {
    // Esperar a que el DOM esté completamente cargado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(inicializarAnimaciones, 100);
        });
        return;
    }
    
    // Configurar hover de cards
    configurarHoverCards();
    
    // Configurar animaciones de botones del panel
    configurarAnimacionesBotonesPanel();
}

// Inicializar cuando el script se carga
inicializarAnimaciones();

// Exportar funciones para uso externo
window.AnimacionesGSAP = {
    animarEntradaCards,
    animarEntradaImagenesCards,
    configurarHoverCards,
    animarAperturaModal,
    animarCierreModal,
    animarSalidaCards,
    animarEntradaCardsFiltradas,
    animarAperturaPanelAccesibilidad,
    animarCierrePanelAccesibilidad,
    configurarAnimacionesBotonesPanel,
    prefersReducedMotion,
    get reduceMotion() {
        return prefersReducedMotion();
    }
};

