/**
 * Carrusel de Guía de Uso - Accesible
 * 
 * Características de accesibilidad:
 * - Navegación por teclado (Tab, flechas, Enter, Space)
 * - Sin autoplay
 * - aria-live para anuncios de cambio
 * - Indicadores de progreso accesibles
 * - No atrapa el foco
 */

(function() {
    'use strict';

    // Elementos del DOM
    const slides = document.querySelectorAll('.carousel-slide');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const indicators = document.querySelectorAll('.carousel-indicator');
    const currentDisplay = document.getElementById('carousel-current');
    const totalDisplay = document.getElementById('carousel-total');
    
    if (!slides.length || !prevBtn || !nextBtn) return;

    let currentSlide = 0;
    const totalSlides = slides.length;

    // Actualizar display del total
    if (totalDisplay) {
        totalDisplay.textContent = totalSlides;
    }

    /**
     * Muestra un slide específico
     * @param {number} index - Índice del slide a mostrar
     */
    function goToSlide(index) {
        // Validar límites
        if (index < 0) index = 0;
        if (index >= totalSlides) index = totalSlides - 1;

        // Ocultar slide actual
        slides[currentSlide].classList.remove('active');
        indicators[currentSlide].classList.remove('active');
        indicators[currentSlide].setAttribute('aria-selected', 'false');

        // Actualizar índice
        currentSlide = index;

        // Mostrar nuevo slide
        slides[currentSlide].classList.add('active');
        indicators[currentSlide].classList.add('active');
        indicators[currentSlide].setAttribute('aria-selected', 'true');

        // Actualizar progreso
        if (currentDisplay) {
            currentDisplay.textContent = currentSlide + 1;
        }

        // Actualizar estado de botones
        updateButtonStates();
    }

    /**
     * Actualiza el estado de los botones prev/next
     */
    function updateButtonStates() {
        prevBtn.disabled = currentSlide === 0;
        nextBtn.disabled = currentSlide === totalSlides - 1;
    }

    /**
     * Ir al slide anterior
     */
    function prevSlide() {
        if (currentSlide > 0) {
            goToSlide(currentSlide - 1);
        }
    }

    /**
     * Ir al siguiente slide
     */
    function nextSlide() {
        if (currentSlide < totalSlides - 1) {
            goToSlide(currentSlide + 1);
        }
    }

    // Event listeners para botones
    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);

    // Event listeners para indicadores
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            goToSlide(index);
        });

        // Navegación por teclado en indicadores
        indicator.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const prevIndex = index > 0 ? index - 1 : totalSlides - 1;
                indicators[prevIndex].focus();
                goToSlide(prevIndex);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const nextIndex = index < totalSlides - 1 ? index + 1 : 0;
                indicators[nextIndex].focus();
                goToSlide(nextIndex);
            } else if (e.key === 'Home') {
                e.preventDefault();
                indicators[0].focus();
                goToSlide(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                indicators[totalSlides - 1].focus();
                goToSlide(totalSlides - 1);
            }
        });
    });

    // Navegación por flechas cuando el foco está en el carrusel
    const carousel = document.querySelector('.guide-carousel');
    if (carousel) {
        carousel.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                prevSlide();
            } else if (e.key === 'ArrowRight') {
                nextSlide();
            }
        });
    }

    // Inicializar estado de botones
    updateButtonStates();

})();
