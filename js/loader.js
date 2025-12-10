/**
 * ============================================
 * LOADER SCREEN - Pantalla de Carga
 * Animaciones GSAP estilo Google Material Motion
 * ============================================
 */

(function() {
    'use strict';

    // Verificar si GSAP está disponible
    const gsapDisponible = typeof gsap !== 'undefined';
    
    // Detectar preferencia de movimiento reducido
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /**
     * Obtiene la duración ajustada según preferencias de accesibilidad
     */
    function getDuration(baseDuration) {
        return reduceMotion ? 0 : baseDuration;
    }

    /**
     * Crea el HTML del loader
     */
    function crearLoaderHTML() {
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
    }

    /**
     * Animación de entrada del loader
     */
    function animarEntradaLoader() {
        const loaderOverlay = document.getElementById('loaderOverlay');
        if (!loaderOverlay) return;

        if (!gsapDisponible || reduceMotion) {
            loaderOverlay.style.opacity = '1';
            return;
        }

        // Configurar estado inicial
        gsap.set(loaderOverlay, {
            opacity: 0,
            scale: 0.95
        });

        // Animación de entrada
        gsap.to(loaderOverlay, {
            opacity: 1,
            scale: 1,
            duration: getDuration(0.4),
            ease: 'power2.out'
        });
    }

    /**
     * Animación del SVG (stroke-dasharray y rotación)
     */
    function animarSVGLoader() {
        const loaderCircle = document.getElementById('loaderCircle');
        const loaderSVG = document.getElementById('loaderSVG');
        
        if (!loaderCircle || !loaderSVG) return;

        if (!gsapDisponible || reduceMotion) {
            // Si no hay GSAP o hay reduced motion, no animar
            return;
        }

        // Calcular la circunferencia del círculo (2 * π * r)
        // r = 20, entonces circunferencia ≈ 125.66
        const circunferencia = 2 * Math.PI * 20; // ≈ 125.66

        // Animación del trazo del círculo (stroke-dasharray)
        gsap.fromTo(loaderCircle, 
            {
                strokeDasharray: circunferencia,
                strokeDashoffset: circunferencia
            },
            {
                strokeDashoffset: 0,
                duration: getDuration(1.2),
                ease: 'power2.inOut',
                repeat: -1
            }
        );

        // Rotación del SVG completo
        gsap.to(loaderSVG, {
            rotation: 360,
            transformOrigin: '50% 50%',
            duration: getDuration(2),
            ease: 'linear',
            repeat: -1
        });
    }

    /**
     * Animación de salida del loader
     */
    function animarSalidaLoader() {
        const loaderOverlay = document.getElementById('loaderOverlay');
        if (!loaderOverlay) return;

        if (!gsapDisponible || reduceMotion) {
            loaderOverlay.style.display = 'none';
            document.body.style.overflow = '';
            return;
        }

        // Animar salida
        gsap.to(loaderOverlay, {
            opacity: 0,
            y: -20,
            duration: reduceMotion ? 0.1 : 0.45,
            ease: 'power2.out',
            onComplete: () => {
                loaderOverlay.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    }

    /**
     * Inicializar el loader
     */
    function inicializarLoader() {
        // Bloquear scroll mientras carga
        document.body.style.overflow = 'hidden';

        // Crear el HTML del loader
        crearLoaderHTML();

        // Animar entrada
        requestAnimationFrame(() => {
            animarEntradaLoader();
            animarSVGLoader();
        });
    }

    /**
     * Ocultar el loader cuando el contenido esté listo
     */
    function ocultarLoader() {
        // Esperar un pequeño delay para asegurar que todo esté renderizado
        setTimeout(() => {
            animarSalidaLoader();
        }, 100);
    }

    /**
     * Verificar si el contenido está listo
     */
    function verificarContenidoListo() {
        let loaderOcultado = false;

        function intentarOcultar() {
            if (loaderOcultado) return;
            
            const loaderOverlay = document.getElementById('loaderOverlay');
            if (!loaderOverlay || loaderOverlay.style.display === 'none') {
                loaderOcultado = true;
                return;
            }

            // Verificar si hay contenido dinámico (como tools-grid)
            const toolsGrid = document.getElementById('tools-grid');
            const tieneContenidoDinamico = toolsGrid && toolsGrid.children.length > 0;
            const esPaginaIndex = toolsGrid !== null;

            // Si es la página index y tiene contenido, esperar un poco más
            if (esPaginaIndex && tieneContenidoDinamico) {
                setTimeout(() => {
                    if (!loaderOcultado) {
                        loaderOcultado = true;
                        ocultarLoader();
                    }
                }, 400);
            } else if (!esPaginaIndex) {
                // Si no es la página index, ocultar más rápido
                setTimeout(() => {
                    if (!loaderOcultado) {
                        loaderOcultado = true;
                        ocultarLoader();
                    }
                }, 300);
            }
        }

        // Verificar cuando el DOM esté listo
        if (document.readyState === 'complete') {
            intentarOcultar();
        } else {
            window.addEventListener('load', () => {
                intentarOcultar();
            });
        }

        // Observar cambios en el grid de herramientas (si existe)
        const toolsGrid = document.getElementById('tools-grid');
        if (toolsGrid) {
            const observer = new MutationObserver(() => {
                if (toolsGrid.children.length > 0 && !loaderOcultado) {
                    setTimeout(() => {
                        if (!loaderOcultado) {
                            loaderOcultado = true;
                            ocultarLoader();
                        }
                    }, 300);
                }
            });

            observer.observe(toolsGrid, { childList: true });

            // Timeout de seguridad: ocultar después de máximo 3 segundos
            setTimeout(() => {
                if (!loaderOcultado) {
                    loaderOcultado = true;
                    ocultarLoader();
                }
            }, 3000);
        } else {
            // Timeout de seguridad para otras páginas
            setTimeout(() => {
                if (!loaderOcultado) {
                    loaderOcultado = true;
                    ocultarLoader();
                }
            }, 2000);
        }
    }

    /**
     * Inicialización principal
     */
    function init() {
        // Inicializar loader inmediatamente
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', inicializarLoader);
        } else {
            inicializarLoader();
        }

        // Verificar cuando el contenido esté listo
        verificarContenidoListo();
    }

    // Inicializar
    init();

    // Exportar funciones para uso externo si es necesario
    window.LoaderGSAP = {
        ocultarLoader: function() {
            const loaderOverlay = document.getElementById('loaderOverlay');
            if (loaderOverlay && loaderOverlay.style.display !== 'none') {
                animarSalidaLoader();
            }
        },
        animarSalidaLoader,
        reduceMotion
    };
})();

