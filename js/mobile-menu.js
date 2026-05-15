/**
 * ============================================
 * MOBILE MENU - Menú Hamburguesa para Móvil
 * Implementación accesible WCAG 2.1 AA
 * - Cerrado: hidden + inert (no alcanzable por teclado ni AT)
 * - Abierto: focus trap (Tab) dentro del panel
 * - Escape: cierra y devuelve foco al botón hamburguesa
 * ============================================
 */

(function () {
    'use strict';

    let menuToggle = null;
    let mobileMenu = null;
    let mobileMenuContent = null;
    let menuClose = null;
    let isMenuOpen = false;
    let initialized = false;
    let trapKeydownHandler = null;

    function getFocusableElements(container) {
        if (!container) return [];
        const selector = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');
        return Array.from(container.querySelectorAll(selector)).filter(function (el) {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });
    }

    function installFocusTrap() {
        if (trapKeydownHandler) return;

        trapKeydownHandler = function (e) {
            if (!isMenuOpen || !mobileMenuContent) return;
            if (e.key !== 'Tab') return;

            const focusables = getFocusableElements(mobileMenuContent);
            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement;

            if (!mobileMenuContent.contains(active)) {
                e.preventDefault();
                first.focus();
                return;
            }

            if (e.shiftKey) {
                if (active === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else if (active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', trapKeydownHandler, true);
    }

    function removeFocusTrap() {
        if (!trapKeydownHandler) return;
        document.removeEventListener('keydown', trapKeydownHandler, true);
        trapKeydownHandler = null;
    }

    function setMenuHidden(hidden) {
        if (!mobileMenu) return;
        if (hidden) {
            mobileMenu.setAttribute('hidden', '');
            mobileMenu.setAttribute('inert', '');
            mobileMenu.setAttribute('aria-hidden', 'true');
        } else {
            mobileMenu.removeAttribute('hidden');
            mobileMenu.removeAttribute('inert');
            mobileMenu.removeAttribute('aria-hidden');
        }
    }

    function updateToggleLabel() {
        if (!menuToggle) return;
        menuToggle.setAttribute(
            'aria-label',
            isMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
        );
    }

    function init() {
        if (initialized) return;
        menuToggle = document.getElementById('menu-toggle');
        mobileMenu = document.getElementById('mobile-menu');
        mobileMenuContent = document.getElementById('mobile-menu-content');
        menuClose = document.getElementById('mobile-menu-close');

        if (!menuToggle || !mobileMenu || !mobileMenuContent || !menuClose) {
            return;
        }

        if (!isMenuOpen) {
            setMenuHidden(true);
        }

        setupEventListeners();
        initialized = true;
    }

    function setupEventListeners() {
        menuToggle.addEventListener('click', toggleMenu);

        menuClose.addEventListener('click', closeMenu);

        mobileMenu.addEventListener('click', function (e) {
            if (e.target === mobileMenu) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', function (e) {
            if ((e.key === 'Escape' || e.key === 'Esc') && isMenuOpen) {
                e.preventDefault();
                closeMenu();
            }
        }, true);

        const mobileLinks = mobileMenuContent.querySelectorAll('.header-link');
        mobileLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                setTimeout(closeMenu, 150);
            });
        });
    }

    function toggleMenu() {
        if (isMenuOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    function openMenu() {
        if (!mobileMenu || !menuToggle) return;

        isMenuOpen = true;
        setMenuHidden(false);
        mobileMenu.classList.add('active');
        menuToggle.setAttribute('aria-expanded', 'true');
        updateToggleLabel();
        document.body.style.overflow = 'hidden';

        installFocusTrap();

        requestAnimationFrame(function () {
            const focusables = getFocusableElements(mobileMenuContent);
            if (focusables.length > 0) {
                focusables[0].focus();
            }
        });
    }

    function closeMenu() {
        if (!mobileMenu || !menuToggle) return;
        if (!isMenuOpen) return;

        isMenuOpen = false;
        mobileMenu.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        updateToggleLabel();
        document.body.style.overflow = '';

        removeFocusTrap();
        setMenuHidden(true);

        menuToggle.focus();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    document.addEventListener('layout:loaded', init);
})();
