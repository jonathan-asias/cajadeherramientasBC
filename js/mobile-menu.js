/**
 * ============================================
 * MOBILE MENU - Menú Hamburguesa para Móvil
 * Implementación accesible WCAG 2.1 AA
 * ============================================
 */

(function() {
    'use strict';

    let menuToggle = null;
    let mobileMenu = null;
    let mobileMenuContent = null;
    let menuClose = null;
    let isMenuOpen = false;

    /**
     * Inicializar el menú móvil
     */
    function init() {
        menuToggle = document.getElementById('menu-toggle');
        mobileMenu = document.getElementById('mobile-menu');
        mobileMenuContent = document.getElementById('mobile-menu-content');
        menuClose = document.getElementById('mobile-menu-close');

        if (!menuToggle || !mobileMenu || !mobileMenuContent || !menuClose) {
            return; // No hay menú móvil en esta página
        }

        setupEventListeners();
    }

    /**
     * Configurar event listeners
     */
    function setupEventListeners() {
        // Toggle del menú
        menuToggle.addEventListener('click', toggleMenu);
        
        // Cerrar menú
        menuClose.addEventListener('click', closeMenu);
        
        // Cerrar al hacer clic fuera del menú
        mobileMenu.addEventListener('click', function(e) {
            if (e.target === mobileMenu) {
                closeMenu();
            }
        });

        // Cerrar con Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isMenuOpen) {
                closeMenu();
            }
        });

        // Cerrar al hacer clic en un enlace del menú
        const mobileLinks = mobileMenuContent.querySelectorAll('.header-link');
        mobileLinks.forEach(link => {
            link.addEventListener('click', function() {
                // Pequeño delay para que se vea la transición
                setTimeout(closeMenu, 150);
            });
        });
    }

    /**
     * Abrir/cerrar el menú
     */
    function toggleMenu() {
        if (isMenuOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    /**
     * Abrir el menú
     */
    function openMenu() {
        if (!mobileMenu || !menuToggle) return;

        isMenuOpen = true;
        mobileMenu.classList.add('active');
        menuToggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden'; // Prevenir scroll del body

        // Focus trap: mover foco al primer elemento del menú
        const firstLink = mobileMenuContent.querySelector('.header-link');
        if (firstLink) {
            setTimeout(() => {
                firstLink.focus();
            }, 100);
        }
    }

    /**
     * Cerrar el menú
     */
    function closeMenu() {
        if (!mobileMenu || !menuToggle) return;

        isMenuOpen = false;
        mobileMenu.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = ''; // Restaurar scroll

        // Devolver foco al botón toggle
        menuToggle.focus();
    }

    /**
     * Inicializar cuando el DOM esté listo
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
