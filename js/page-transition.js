/**
 * ============================================
 * PAGE TRANSITION - Transición entre páginas
 * Muestra el loader cuando se navega entre páginas
 * ============================================
 */

(function() {
    'use strict';

    /**
     * Verificar si un enlace es interno
     */
    function esEnlaceInterno(href) {
        if (!href) return false;
        
        // Ignorar enlaces vacíos, anclas, javascript:, mailto:, tel:, etc.
        if (href === '#' || 
            href.startsWith('#') || 
            href.startsWith('javascript:') ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:')) {
            return false;
        }

        // Verificar si es un enlace relativo o del mismo dominio
        try {
            const url = new URL(href, window.location.origin);
            return url.origin === window.location.origin;
        } catch (e) {
            // Si es un enlace relativo (sin protocolo), es interno
            return href.startsWith('/') || !href.includes('://');
        }
    }

    /**
     * Mostrar loader antes de navegar
     */
    function mostrarLoaderAntesDeNavegar() {
        // Verificar si el loader ya existe
        let loaderOverlay = document.getElementById('loaderOverlay');
        
        if (!loaderOverlay) {
            // Crear loader si no existe (usando el mismo HTML que loader.js)
            const loaderHTML = `
                <div id="loaderOverlay" aria-label="Cargando contenido" role="status" aria-live="polite">
                    <div class="loader-wrapper">
                        <svg id="loaderSVG" width="80" height="80" viewBox="0 0 50 50" aria-hidden="true">
                            <circle 
                                id="loaderCircle"
                                cx="25" 
                                cy="25" 
                                r="20" 
                                stroke="#1A73E8" 
                                stroke-width="4" 
                                fill="none" 
                                stroke-linecap="round"
                            />
                        </svg>
                        <p>Cargando…</p>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('afterbegin', loaderHTML);
            loaderOverlay = document.getElementById('loaderOverlay');
        }

        // Mostrar loader inmediatamente
        if (loaderOverlay) {
            loaderOverlay.style.display = 'block';
            loaderOverlay.style.opacity = '1';
            document.body.style.overflow = 'hidden';
            
            // Si GSAP está disponible, animar la entrada
            if (typeof gsap !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                gsap.set(loaderOverlay, { opacity: 0, scale: 0.95 });
                gsap.to(loaderOverlay, {
                    opacity: 1,
                    scale: 1,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            }
        }
    }

    /**
     * Interceptar clics en enlaces internos
     */
    function interceptarEnlaces() {
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            
            if (!link || !link.href) return;

            const href = link.getAttribute('href');
            
            // Verificar si es un enlace interno
            if (!esEnlaceInterno(href)) return;

            // Ignorar si se presiona Ctrl, Cmd o Shift (para abrir en nueva pestaña)
            if (e.ctrlKey || e.metaKey || e.shiftKey) return;

            // Mostrar loader antes de navegar
            mostrarLoaderAntesDeNavegar();
            
            // Pequeño delay para que el loader se muestre
            setTimeout(() => {
                window.location.href = href;
            }, 100);
        }, true); // Usar capture phase para interceptar antes que otros handlers
    }

    /**
     * Interceptar navegación del navegador (botones atrás/adelante)
     */
    function interceptarNavegacionNavegador() {
        window.addEventListener('popstate', function() {
            mostrarLoaderAntesDeNavegar();
        });
    }

    /**
     * Inicialización
     */
    function init() {
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                interceptarEnlaces();
                interceptarNavegacionNavegador();
            });
        } else {
            interceptarEnlaces();
            interceptarNavegacionNavegador();
        }
    }

    // Inicializar
    init();
})();
