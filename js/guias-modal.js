(function () {
  'use strict';

  const prefersReducedMotionMql = window.matchMedia('(prefers-reduced-motion: reduce)');
  function prefersReducedMotion() {
    return prefersReducedMotionMql.matches;
  }

  function focusInModal(el) {
    if (!el || typeof el.focus !== 'function') return;
    if (prefersReducedMotion()) el.focus({ preventScroll: true });
    else el.focus();
  }

  function getFocusable(container) {
    if (!container) return [];
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    return Array.from(container.querySelectorAll(selector)).filter(el => {
      const style = window.getComputedStyle(el);
      const visible = style.display !== 'none' && style.visibility !== 'hidden';
      const disabledByAttr = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
      return visible && !disabledByAttr;
    });
  }

  function init() {
    const opener = document.getElementById('btn-consultar-guias');
    const modal = document.getElementById('guide-modal');
    const overlay = document.getElementById('guide-modal-overlay');
    const closeBtn = document.getElementById('guide-modal-close');
    const content = document.getElementById('guide-modal-content');

    if (!opener || !modal || !overlay || !closeBtn || !content) return;

    const viewport = modal.querySelector('.guide-carousel__viewport');
    const prevBtn = document.getElementById('guide-carousel-prev');
    const nextBtn = document.getElementById('guide-carousel-next');
    const dots = Array.from(modal.querySelectorAll('.guide-carousel__dot'));
    const slides = Array.from(modal.querySelectorAll('.guide-carousel__slide'));

    let lastOpener = null;
    let active = 0;

    function isVisible() {
      if (modal.hasAttribute('hidden')) return false;
      return modal.classList.contains('guide-modal--visible');
    }

    function setActive(idx) {
      active = Math.max(0, Math.min(idx, slides.length - 1));

      slides.forEach((s, i) => {
        const on = i === active;
        s.classList.toggle('is-active', on);
        if (on) s.removeAttribute('inert');
        else s.setAttribute('inert', '');
      });

      const modalVisible = isVisible();
      dots.forEach((d, i) => {
        const on = i === active;
        d.classList.toggle('is-active', on);
        d.setAttribute('aria-selected', on ? 'true' : 'false');
        d.setAttribute('tabindex', modalVisible && on ? '0' : '-1');
      });

      const hidePrev = active === 0;
      const hideNext = active === slides.length - 1;

      if (prevBtn) {
        prevBtn.disabled = hidePrev;
        prevBtn.style.visibility = hidePrev ? 'hidden' : '';
        prevBtn.style.pointerEvents = hidePrev ? 'none' : '';
        prevBtn.setAttribute('aria-hidden', hidePrev ? 'true' : 'false');
      }

      if (nextBtn) {
        nextBtn.disabled = hideNext;
        nextBtn.style.visibility = hideNext ? 'hidden' : '';
        nextBtn.style.pointerEvents = hideNext ? 'none' : '';
        nextBtn.setAttribute('aria-hidden', hideNext ? 'true' : 'false');
      }

      // Si el foco quedó en un botón que se ocultó, moverlo a un control visible.
      if (hidePrev && document.activeElement === prevBtn) {
        focusInModal(nextBtn || closeBtn);
      } else if (hideNext && document.activeElement === nextBtn) {
        focusInModal(prevBtn || closeBtn);
      }
    }

    function openModal() {
      lastOpener = document.activeElement instanceof HTMLElement ? document.activeElement : opener;
      modal.removeAttribute('hidden');
      modal.classList.add('guide-modal--visible');
      document.body.classList.add('modal-open');

      if (viewport) viewport.setAttribute('tabindex', '0');
      setActive(active);

      document.addEventListener('keydown', onKeyDownCapture, true);
      overlay.addEventListener('click', closeModal);
      closeBtn.addEventListener('click', closeModal);

      focusInModal(closeBtn);
    }

    function closeModal() {
      modal.classList.remove('guide-modal--visible');
      modal.setAttribute('hidden', '');
      document.body.classList.remove('modal-open');

      if (viewport) viewport.setAttribute('tabindex', '-1');

      document.removeEventListener('keydown', onKeyDownCapture, true);
      overlay.removeEventListener('click', closeModal);
      closeBtn.removeEventListener('click', closeModal);

      const toFocus = lastOpener || opener;
      if (toFocus && typeof toFocus.focus === 'function') toFocus.focus();
    }

    function trapTab(e) {
      if (e.key !== 'Tab') return;
      if (!isVisible()) return;
      const focusables = getFocusable(content);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;

      if (!content.contains(current)) {
        e.preventDefault();
        focusInModal(first);
        return;
      }

      if (e.shiftKey) {
        if (current === first) {
          e.preventDefault();
          focusInModal(last);
        }
        return;
      }

      if (current === last) {
        e.preventDefault();
        focusInModal(first);
      }
    }

    function onKeyDownCapture(e) {
      if (!isVisible()) return;

      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
        return;
      }

      trapTab(e);
    }

    function onViewportKeydown(e) {
      if (!isVisible()) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActive(active - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActive(active + 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActive(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActive(slides.length - 1);
      }
    }

    // Inicializar
    active = 0;
    setActive(0);

    opener.addEventListener('click', () => openModal());

    if (prevBtn) prevBtn.addEventListener('click', () => setActive(active - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => setActive(active + 1));

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.dataset.go || '0', 10);
        setActive(idx);
      });
    });

    if (viewport) viewport.addEventListener('keydown', onViewportKeydown);

    // Mejor UX: al abrir, permitir que el carrusel reciba flechas de inmediato
    modal.addEventListener('transitionend', () => {
      if (!isVisible()) return;
      if (viewport && document.activeElement === closeBtn) {
        // no forzar; solo si el usuario luego tabula llegará al viewport
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

