/* ============================================
   SISTEMA DE ACCESIBILIDAD (A11y)
   Implementación completa WCAG 2.1 AA
   ============================================ */

(function() {
    'use strict';

    // Claves para localStorage
    const STORAGE_KEYS = {
        FONT_SIZE: 'a11y_font_size',
        ALTO_CONTRASTE: 'a11y_contraste',
        MODO_OSCURO: 'a11y_modo_oscuro',
        ESPACIADO: 'a11y_espaciado',
        DESATURADO: 'a11y_desaturado'
    };

    // Estado actual
    let currentFontSize = 100; // Porcentaje base
    const FONT_INCREMENT = 10;
    const MIN_FONT_SIZE = 80;
    const MAX_FONT_SIZE = 200;
    const FONT_SCALE_VAR = '--a11y-font-scale';

    // Inicialización
    function init() {
        createPanel();
        setupEventListeners();
        // Cargar preferencias después de crear el panel y los listeners
        setTimeout(() => {
            loadPreferences();
            // Asegurar que el logo refleje el tema cargado desde storage
            updateHeaderLogoForTheme();
        }, 0);

        // Observar cambios de clases en el body (modo oscuro/alto contraste pueden cambiar desde distintos flujos)
        observeThemeClassChanges();

        // El header se inyecta asíncronamente (layout.js). Al cargar, sincronizar el logo con el tema actual.
        document.addEventListener('layout:loaded', () => {
            updateHeaderLogoForTheme();
        });
    }

    function getLogoElement() {
        return document.getElementById('site-logo');
    }

    function shouldUseInvertedLogo() {
        return document.body.classList.contains('modo-oscuro') || document.body.classList.contains('alto-contraste');
    }

    function updateHeaderLogoForTheme() {
        const logo = getLogoElement();
        if (!logo) return;

        const defaultSrc = logo.getAttribute('data-logo-default-src') || './img/Logo/BcLogo.png';
        const invertSrc = logo.getAttribute('data-logo-invert-src') || './img/Logo/BCLogo_INV.png';
        const desired = shouldUseInvertedLogo() ? invertSrc : defaultSrc;

        // Evitar reflows innecesarios
        if (logo.getAttribute('src') !== desired) {
            logo.setAttribute('src', desired);
        }
    }

    function observeThemeClassChanges() {
        try {
            const observer = new MutationObserver(() => {
                updateHeaderLogoForTheme();
            });
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        } catch {
            // no-op: navegadores antiguos
        }
    }

    // Crear el panel de accesibilidad
    function createPanel() {
        const panelHTML = `
            <button id="btn-accesibilidad-toggle" aria-label="Abrir panel de accesibilidad" title="Accesibilidad">
                <span class="material-icons-outlined">accessibility</span>
            </button>
            <div id="panelAccesibilidad" role="dialog" aria-labelledby="a11y-title" aria-modal="true">
                <div class="a11y-header">
                    <h2 id="a11y-title" class="a11y-title">
                        <span class="material-icons-outlined">accessibility_new</span>
                        Accesibilidad
                    </h2>
                    <button class="a11y-close" aria-label="Cerrar panel de accesibilidad">
                        <span class="material-icons-outlined">close</span>
                    </button>
                </div>
                <div class="a11y-content">
                    <!-- Controles de tamaño de fuente -->
                    <div class="a11y-section">
                        <h3 class="a11y-section-title">Tamaño de letra</h3>
                        <div class="a11y-font-controls">
                            <button id="btn-font-decrease" class="a11y-font-btn" aria-label="Disminuir tamaño de letra">
                                A-
                            </button>
                            <button id="btn-font-reset" class="a11y-font-btn" aria-label="Restablecer tamaño de letra">
                                A0
                            </button>
                            <button id="btn-font-increase" class="a11y-font-btn" aria-label="Aumentar tamaño de letra">
                                A+
                            </button>
                        </div>
                    </div>

                    <!-- Switches de opciones -->
                    <div class="a11y-section">
                        <h3 class="a11y-section-title">Opciones de visualización</h3>
                        <div class="a11y-switch-group">
                            <!-- Alto Contraste -->
                            <label class="a11y-switch-item">
                                <span class="a11y-switch-label">
                                    <span class="material-icons-outlined">contrast</span>
                                    Alto contraste
                                </span>
                                <span class="a11y-switch">
                                    <input type="checkbox" id="switch-alto-contraste" aria-label="Activar modo alto contraste">
                                    <span class="a11y-switch-slider"></span>
                                </span>
                            </label>

                            <!-- Modo Oscuro -->
                            <label class="a11y-switch-item">
                                <span class="a11y-switch-label">
                                    <span class="material-icons-outlined">dark_mode</span>
                                    Modo oscuro
                                </span>
                                <span class="a11y-switch">
                                    <input type="checkbox" id="switch-modo-oscuro" aria-label="Activar modo oscuro">
                                    <span class="a11y-switch-slider"></span>
                                </span>
                            </label>

                            <!-- Espaciado amplio -->
                            <label class="a11y-switch-item">
                                <span class="a11y-switch-label">
                                    <span class="material-icons-outlined">format_line_spacing</span>
                                    Mayor espaciado
                                </span>
                                <span class="a11y-switch">
                                    <input type="checkbox" id="switch-espaciado" aria-label="Activar espaciado amplio">
                                    <span class="a11y-switch-slider"></span>
                                </span>
                            </label>

                            <!-- Desaturar colores -->
                            <label class="a11y-switch-item">
                                <span class="a11y-switch-label">
                                    <span class="material-icons-outlined">palette</span>
                                    Desaturar colores
                                </span>
                                <span class="a11y-switch">
                                    <input type="checkbox" id="switch-desaturado" aria-label="Desaturar colores">
                                    <span class="a11y-switch-slider"></span>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insertar el panel en el body
        document.body.insertAdjacentHTML('beforeend', panelHTML);
    }

    // Configurar event listeners
    function setupEventListeners() {
        const toggleBtn = document.getElementById('btn-accesibilidad-toggle');
        const panel = document.getElementById('panelAccesibilidad');
        const closeBtn = panel.querySelector('.a11y-close');
        const overlay = document.createElement('div');
        overlay.className = 'a11y-overlay';
        overlay.style.display = 'none';
        overlay.style.opacity = '0';
        document.body.appendChild(overlay);

        // Toggle panel
        toggleBtn.addEventListener('click', () => {
            const isVisible = panel.classList.contains('visible');
            if (isVisible) {
                closePanel();
            } else {
                openPanel();
            }
        });

        // Cerrar panel
        closeBtn.addEventListener('click', closePanel);
        overlay.addEventListener('click', closePanel);

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && panel.classList.contains('visible')) {
                closePanel();
            }
        });

        // Controles de fuente
        document.getElementById('btn-font-increase').addEventListener('click', increaseFont);
        document.getElementById('btn-font-decrease').addEventListener('click', decreaseFont);
        document.getElementById('btn-font-reset').addEventListener('click', resetFont);

        // Switches
        document.getElementById('switch-alto-contraste').addEventListener('change', toggleAltoContraste);
        document.getElementById('switch-modo-oscuro').addEventListener('change', toggleModoOscuro);
        document.getElementById('switch-espaciado').addEventListener('change', toggleEspaciado);
        document.getElementById('switch-desaturado').addEventListener('change', toggleDesaturado);
        
        // Configurar animaciones de botones del panel después de que se creen
        setTimeout(() => {
            if (window.AnimacionesGSAP) {
                window.AnimacionesGSAP.configurarAnimacionesBotonesPanel();
            }
        }, 100);

        function openPanel() {
            panel.classList.add('visible');
            overlay.style.display = 'block';
            
            // Usar animaciones GSAP si están disponibles
            if (window.AnimacionesGSAP) {
                window.AnimacionesGSAP.animarAperturaPanelAccesibilidad(panel);
                
                // Animar overlay
                const reduceMotion = window.AnimacionesGSAP.reduceMotion;
                if (!reduceMotion && typeof gsap !== 'undefined') {
                    gsap.fromTo(overlay, 
                        { opacity: 0 }, 
                        { 
                            opacity: 1, 
                            duration: 0.3, 
                            ease: 'power2.out',
                            onComplete: () => {
                                overlay.style.pointerEvents = 'all';
                            }
                        }
                    );
                } else {
                    overlay.style.opacity = '1';
                    overlay.style.pointerEvents = 'all';
                }
            } else {
                // Fallback sin GSAP
                requestAnimationFrame(() => {
                    overlay.style.opacity = '1';
                    overlay.style.pointerEvents = 'all';
                });
            }
            
            toggleBtn.setAttribute('aria-expanded', 'true');
            
            // Focus en el primer elemento interactivo
            setTimeout(() => {
                const firstBtn = document.getElementById('btn-font-increase');
                if (firstBtn) firstBtn.focus();
            }, 100);
        }

        function closePanel() {
            // Usar animaciones GSAP si están disponibles
            if (window.AnimacionesGSAP) {
                // Animar overlay
                const reduceMotion = window.AnimacionesGSAP.reduceMotion;
                if (!reduceMotion && typeof gsap !== 'undefined') {
                    gsap.to(overlay, {
                        opacity: 0,
                        duration: 0.3,
                        ease: 'power2.in',
                        onComplete: () => {
                            overlay.style.display = 'none';
                            overlay.style.pointerEvents = 'none';
                        }
                    });
                } else {
                    overlay.style.opacity = '0';
                    overlay.style.display = 'none';
                    overlay.style.pointerEvents = 'none';
                }
                
                window.AnimacionesGSAP.animarCierrePanelAccesibilidad(panel, () => {
                    toggleBtn.setAttribute('aria-expanded', 'false');
                    toggleBtn.focus();
                });
            } else {
                // Fallback sin GSAP
                panel.classList.remove('visible');
                overlay.style.opacity = '0';
                overlay.style.pointerEvents = 'none';
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 200);
                toggleBtn.setAttribute('aria-expanded', 'false');
                toggleBtn.focus();
            }
        }
    }

    // Funciones de tamaño de fuente
    function increaseFont() {
        if (currentFontSize < MAX_FONT_SIZE) {
            currentFontSize += FONT_INCREMENT;
            applyFontSize();
            updateFontButtons();
            savePreference(STORAGE_KEYS.FONT_SIZE, currentFontSize);
        }
    }

    function decreaseFont() {
        if (currentFontSize > MIN_FONT_SIZE) {
            currentFontSize -= FONT_INCREMENT;
            applyFontSize();
            updateFontButtons();
            savePreference(STORAGE_KEYS.FONT_SIZE, currentFontSize);
        }
    }

    function resetFont() {
        currentFontSize = 100;
        applyFontSize();
        updateFontButtons();
        savePreference(STORAGE_KEYS.FONT_SIZE, currentFontSize);
    }

    function applyFontSize() {
        // El proyecto usa tamaños tipográficos via variables CSS en px (p.ej. --bc-font-size-base: 16px).
        // Cambiar el font-size del html NO afecta esas variables, por eso antes "no se veía" el cambio.
        // Solución: aplicar un multiplicador global que recalcula las variables tipográficas.
        const scale = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, currentFontSize)) / 100;
        document.documentElement.style.setProperty(FONT_SCALE_VAR, String(scale));
    }

    function updateFontButtons() {
        const increaseBtn = document.getElementById('btn-font-increase');
        const decreaseBtn = document.getElementById('btn-font-decrease');
        const resetBtn = document.getElementById('btn-font-reset');

        // Deshabilitar botones en límites
        increaseBtn.disabled = currentFontSize >= MAX_FONT_SIZE;
        decreaseBtn.disabled = currentFontSize <= MIN_FONT_SIZE;
        resetBtn.classList.toggle('active', currentFontSize === 100);

        // Actualizar aria-labels
        increaseBtn.setAttribute('aria-label', `Aumentar tamaño de letra (actual: ${currentFontSize}%)`);
        decreaseBtn.setAttribute('aria-label', `Disminuir tamaño de letra (actual: ${currentFontSize}%)`);
    }

    // Funciones de switches
    function toggleAltoContraste(e) {
        const isChecked = e.target.checked;
        if (isChecked) {
            // Alto contraste y modo oscuro no deben competir
            const switchOscuro = document.getElementById('switch-modo-oscuro');
            if (switchOscuro && switchOscuro.checked) {
                switchOscuro.checked = false;
                document.body.classList.remove('modo-oscuro');
                savePreference(STORAGE_KEYS.MODO_OSCURO, false);
            }
            document.body.classList.add('alto-contraste');
        } else {
            document.body.classList.remove('alto-contraste');
        }
        savePreference(STORAGE_KEYS.ALTO_CONTRASTE, isChecked);
        updateHeaderLogoForTheme();
    }

    function toggleModoOscuro(e) {
        const isChecked = e.target.checked;
        if (isChecked) {
            // Alto contraste y modo oscuro no deben competir
            const switchContraste = document.getElementById('switch-alto-contraste');
            if (switchContraste && switchContraste.checked) {
                switchContraste.checked = false;
                document.body.classList.remove('alto-contraste');
                savePreference(STORAGE_KEYS.ALTO_CONTRASTE, false);
            }
            document.body.classList.add('modo-oscuro');
        } else {
            document.body.classList.remove('modo-oscuro');
        }
        savePreference(STORAGE_KEYS.MODO_OSCURO, isChecked);
        updateHeaderLogoForTheme();
    }

    function toggleEspaciado(e) {
        const isChecked = e.target.checked;
        if (isChecked) {
            document.body.classList.add('espaciado-amplio');
        } else {
            document.body.classList.remove('espaciado-amplio');
        }
        savePreference(STORAGE_KEYS.ESPACIADO, isChecked);
    }

    function toggleDesaturado(e) {
        const isChecked = e.target.checked;
        if (isChecked) {
            document.body.classList.add('desaturado');
        } else {
            document.body.classList.remove('desaturado');
        }
        savePreference(STORAGE_KEYS.DESATURADO, isChecked);
    }

    // Guardar preferencias en localStorage
    function savePreference(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('No se pudo guardar la preferencia:', e);
        }
    }

    // Cargar preferencias desde localStorage
    function loadPreferences() {
        // Un solo sistema de clases (español). Quitar alias antiguos en inglés por si quedaron en sesiones previas.
        document.body.classList.remove('dark-mode', 'high-contrast', 'desaturate');

        // Tamaño de fuente
        const savedFontSize = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
        if (savedFontSize) {
            // Se guarda como JSON (ej: "110"), tolerar también valores antiguos
            try {
                const parsed = JSON.parse(savedFontSize);
                currentFontSize = parseInt(String(parsed), 10);
            } catch {
                currentFontSize = parseInt(savedFontSize, 10);
            }
            applyFontSize();
            updateFontButtons();
        }

        // Alto contraste
        const savedContraste = localStorage.getItem(STORAGE_KEYS.ALTO_CONTRASTE);
        if (savedContraste === 'true' || savedContraste === '"true"') {
            document.body.classList.add('alto-contraste');
            const switchContraste = document.getElementById('switch-alto-contraste');
            if (switchContraste) switchContraste.checked = true;
        }

        // Modo oscuro
        const savedModoOscuro = localStorage.getItem(STORAGE_KEYS.MODO_OSCURO);
        if (savedModoOscuro === 'true' || savedModoOscuro === '"true"') {
            document.body.classList.add('modo-oscuro');
            const switchOscuro = document.getElementById('switch-modo-oscuro');
            if (switchOscuro) switchOscuro.checked = true;
        }

        // Espaciado
        const savedEspaciado = localStorage.getItem(STORAGE_KEYS.ESPACIADO);
        if (savedEspaciado === 'true' || savedEspaciado === '"true"') {
            document.body.classList.add('espaciado-amplio');
            const switchEspaciado = document.getElementById('switch-espaciado');
            if (switchEspaciado) switchEspaciado.checked = true;
        }

        // Desaturado
        const savedDesaturado = localStorage.getItem(STORAGE_KEYS.DESATURADO);
        if (savedDesaturado === 'true' || savedDesaturado === '"true"') {
            document.body.classList.add('desaturado');
            const switchDesaturado = document.getElementById('switch-desaturado');
            if (switchDesaturado) switchDesaturado.checked = true;
        }

        // Normalizar: si por alguna razón quedaron ambos activos, alto contraste manda
        if (document.body.classList.contains('alto-contraste') && document.body.classList.contains('modo-oscuro')) {
            document.body.classList.remove('modo-oscuro');
            const switchOscuro = document.getElementById('switch-modo-oscuro');
            if (switchOscuro) switchOscuro.checked = false;
            savePreference(STORAGE_KEYS.MODO_OSCURO, false);
        }
    }

    // Debug: resaltar elementos con estilos inline (típica fuente de hardcodes)
    // Activación: agregar ?a11yDebug=1 a la URL
    (function initDebugMode() {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.get('a11yDebug') === '1') {
                document.body.classList.add('a11y-debug');
            }
        } catch {
            // no-op
        }
    })();

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

