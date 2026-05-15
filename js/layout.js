/**
 * Carga de layout compartido (header/footer) sin backend.
 * Inserta partials/header.html y partials/footer.html en contenedores:
 * - #site-header
 * - #site-footer
 *
 * Luego dispara el evento: layout:loaded
 */
(function () {
    'use strict';

    async function injectPartial(containerId, partialPath) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const res = await fetch(partialPath, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`No se pudo cargar ${partialPath}: ${res.status}`);
        const html = await res.text();
        container.innerHTML = html;
    }

    function setFooterYear() {
        const yearElement = document.getElementById('current-year');
        if (yearElement) yearElement.textContent = String(new Date().getFullYear());
    }

    async function initLayout() {
        try {
            await Promise.all([
                injectPartial('site-header', 'partials/header.html'),
                injectPartial('site-footer', 'partials/footer.html'),
            ]);
        } catch (e) {
            console.error('[layout] Error cargando partials:', e);
        } finally {
            setFooterYear();
            document.dispatchEvent(new Event('layout:loaded'));
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLayout);
    } else {
        initLayout();
    }
})();

