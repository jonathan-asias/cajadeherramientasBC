/**
 * Crear Herramienta - Lógica de la aplicación
 * Maneja la carga de JSON, conversión a Base64, creación de objetos y descarga
 */

// Estado global
let herramientasExistentes = [];
let imagenBase64 = null;
let archivoAdjunto = null;

// Elementos del DOM
const formulario = document.getElementById('formulario-herramienta');
const materialesContainer = document.getElementById('materiales-container');
const pasosContainer = document.getElementById('pasos-container');
const btnAgregarMaterial = document.getElementById('btn-agregar-material');
const btnAgregarPaso = document.getElementById('btn-agregar-paso');
const imagenInput = document.getElementById('imagen');
const archivoInput = document.getElementById('archivo-adjunto');
const imagenPreview = document.getElementById('imagen-preview');
const imagenPreviewImg = document.getElementById('imagen-preview-img');
const archivoInfo = document.getElementById('archivo-info');
const mensajeExito = document.getElementById('mensaje-exito');
const mensajeError = document.getElementById('mensaje-error');
const btnCancelar = document.getElementById('btn-cancelar');

/**
 * Inicialización de la aplicación
 */
async function init() {
    try {
        await cargarHerramientas();
        configurarEventListeners();
    } catch (error) {
        console.error('Error al inicializar:', error);
        mostrarError('No se pudieron cargar las herramientas existentes.');
    }
}

/**
 * Carga las herramientas existentes desde JSON
 */
async function cargarHerramientas() {
    try {
        const response = await fetch('./data/herramientas.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        herramientasExistentes = await response.json();
    } catch (error) {
        console.error('Error al cargar herramientas:', error);
        // Si no se puede cargar, empezar con array vacío
        herramientasExistentes = [];
    }
}

/**
 * Obtiene valores seleccionados de un grupo de checkboxes
 */
function obtenerCheckboxSeleccionados(nombre) {
    const checkboxes = document.querySelectorAll(`input[name="${nombre}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * Configura todos los event listeners
 */
function configurarEventListeners() {
    // Formulario
    formulario.addEventListener('submit', manejarSubmit);
    
    // Botones de agregar
    btnAgregarMaterial.addEventListener('click', agregarMaterial);
    btnAgregarPaso.addEventListener('click', agregarPaso);
    
    // Archivos
    imagenInput.addEventListener('change', manejarImagen);
    archivoInput.addEventListener('change', manejarArchivo);
    
    // Botones de remover
    document.getElementById('btn-remover-imagen').addEventListener('click', removerImagen);
    document.getElementById('btn-remover-archivo').addEventListener('click', removerArchivo);
    
    // Cancelar
    btnCancelar.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres cancelar? Se perderán todos los datos ingresados.')) {
            window.location.href = 'index.html';
        }
    });
    
    // Agregar un material y paso inicial
    agregarMaterial();
    agregarPaso();
}

/**
 * Agrega un nuevo campo de material
 */
function agregarMaterial() {
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    item.innerHTML = `
        <input 
            type="text" 
            class="dynamic-item-input" 
            placeholder="Ej: Post-its de colores"
            name="material"
        >
        <button type="button" class="btn-remove-item" onclick="this.parentElement.remove()" aria-label="Eliminar material">×</button>
    `;
    materialesContainer.appendChild(item);
    
    // Focus en el nuevo input
    const input = item.querySelector('.dynamic-item-input');
    input.focus();
}

/**
 * Agrega un nuevo campo de paso
 */
function agregarPaso() {
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    item.innerHTML = `
        <input 
            type="text" 
            class="dynamic-item-input" 
            placeholder="Ej: Define el perfil del usuario objetivo..."
            name="paso"
        >
        <button type="button" class="btn-remove-item" onclick="this.parentElement.remove()" aria-label="Eliminar paso">×</button>
    `;
    pasosContainer.appendChild(item);
    
    // Focus en el nuevo input
    const input = item.querySelector('.dynamic-item-input');
    input.focus();
}

/**
 * Maneja la selección de imagen
 */
function manejarImagen(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        mostrarError('Por favor, selecciona un archivo de imagen válido.');
        return;
    }
    
    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
        mostrarError('La imagen es demasiado grande. Máximo 5MB.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        imagenBase64 = e.target.result;
        imagenPreviewImg.src = imagenBase64;
        imagenPreview.style.display = 'block';
        document.getElementById('imagen-texto').textContent = file.name;
    };
    reader.onerror = () => {
        mostrarError('Error al leer la imagen.');
    };
    reader.readAsDataURL(file);
}

/**
 * Maneja la selección de archivo adjunto
 */
function manejarArchivo(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
        mostrarError('El archivo es demasiado grande. Máximo 10MB.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result.split(',')[1]; // Remover el prefijo data:...
        archivoAdjunto = {
            filename: file.name,
            data: base64
        };
        document.getElementById('archivo-nombre').textContent = file.name;
        archivoInfo.style.display = 'flex';
        document.getElementById('archivo-texto').textContent = file.name;
    };
    reader.onerror = () => {
        mostrarError('Error al leer el archivo.');
    };
    reader.readAsDataURL(file);
}

/**
 * Remueve la imagen seleccionada
 */
function removerImagen() {
    imagenInput.value = '';
    imagenBase64 = null;
    imagenPreview.style.display = 'none';
    document.getElementById('imagen-texto').textContent = 'Seleccionar imagen';
}

/**
 * Remueve el archivo adjunto
 */
function removerArchivo() {
    archivoInput.value = '';
    archivoAdjunto = null;
    archivoInfo.style.display = 'none';
    document.getElementById('archivo-texto').textContent = 'Seleccionar archivo';
}

/**
 * Maneja el envío del formulario
 */
async function manejarSubmit(event) {
    event.preventDefault();
    
    // Ocultar mensajes anteriores
    ocultarMensajes();
    
    // Validar formulario
    if (!formulario.checkValidity()) {
        formulario.reportValidity();
        return;
    }
    
    // Validar que haya al menos un material y un paso
    const materiales = obtenerMateriales();
    const pasos = obtenerPasos();
    
    if (materiales.length === 0) {
        mostrarError('Debes agregar al menos un material.');
        return;
    }
    
    if (pasos.length === 0) {
        mostrarError('Debes agregar al menos un paso.');
        return;
    }
    
    // Validar checkboxes
    const usuarios = obtenerCheckboxSeleccionados('usuarios');
    const uso = obtenerCheckboxSeleccionados('uso');
    const tipo = obtenerCheckboxSeleccionados('tipo');
    
    if (usuarios.length === 0) {
        mostrarError('Debes seleccionar al menos un usuario.');
        return;
    }
    
    if (uso.length === 0) {
        mostrarError('Debes seleccionar al menos un área de uso.');
        return;
    }
    
    if (tipo.length === 0) {
        mostrarError('Debes seleccionar al menos un tipo de recurso.');
        return;
    }
    
    try {
        // Crear objeto de herramienta
        const nuevaHerramienta = crearObjetoHerramienta(usuarios, uso, tipo, materiales, pasos);
        
        // Mostrar modal de preview
        mostrarModalPreview(nuevaHerramienta);
        
    } catch (error) {
        console.error('Error al crear herramienta:', error);
        mostrarError('Error al crear la herramienta. Por favor, intenta nuevamente.');
    }
}

// Variable para guardar la herramienta temporal
let herramientaTemporal = null;

/**
 * Obtiene el icono según el tipo de herramienta
 */
function obtenerIconoPorTipo(tipos) {
    if (!tipos || tipos.length === 0) return 'build';
    
    const tipo = tipos[0].toLowerCase();
    
    if (tipo.includes('guía') || tipo.includes('guias')) return 'menu_book';
    if (tipo.includes('manual')) return 'description';
    if (tipo.includes('infografía') || tipo.includes('infografia')) return 'insert_chart';
    if (tipo.includes('plantilla')) return 'dashboard';
    
    return 'build';
}

/**
 * Muestra el modal de preview con los datos de la herramienta
 */
function mostrarModalPreview(herramienta) {
    herramientaTemporal = herramienta;
    
    const modal = document.getElementById('modal-preview');
    
    // Llenar datos del modal
    document.getElementById('preview-titulo').textContent = herramienta.titulo;
    document.getElementById('preview-descripcion').textContent = herramienta.descripcion;
    document.getElementById('preview-objetivo').textContent = herramienta.objetivo;
    
    // Usuarios
    const usuariosContainer = document.getElementById('preview-usuarios');
    usuariosContainer.innerHTML = `
        <span class="modal-tag-label"><span class="material-icons-outlined tag-icon" aria-hidden="true">person</span>Para:</span>
        ${herramienta.usuarios.map(u => `<span class="modal-tag usuarios">${u}</span>`).join('')}
    `;
    
    // Uso
    const usoContainer = document.getElementById('preview-uso');
    usoContainer.innerHTML = `
        <span class="modal-tag-label"><span class="material-icons-outlined tag-icon" aria-hidden="true">business</span>Uso:</span>
        ${herramienta.uso.map(u => `<span class="modal-tag uso">${u}</span>`).join('')}
    `;
    
    // Tipo
    const tipoContainer = document.getElementById('preview-tipo');
    tipoContainer.innerHTML = `
        <span class="modal-tag-label"><span class="material-icons-outlined tag-icon" aria-hidden="true">widgets</span>Tipo:</span>
        ${herramienta.tipo.map(t => `<span class="modal-tag tipo">${t}</span>`).join('')}
    `;
    
    // Materiales
    const materialesLista = document.getElementById('preview-materiales');
    materialesLista.innerHTML = herramienta.materiales.map(m => `<li>${m}</li>`).join('');
    
    // Pasos
    const pasosLista = document.getElementById('preview-pasos');
    pasosLista.innerHTML = herramienta.pasos.map(p => `<li>${p}</li>`).join('');
    
    // Imagen o icono placeholder
    const imageContainer = document.getElementById('preview-image-container');
    imageContainer.style.display = 'flex';
    imageContainer.style.backgroundColor = '#fdda24';
    imageContainer.style.justifyContent = 'center';
    imageContainer.style.alignItems = 'center';
    imageContainer.style.minHeight = '200px';
    
    if (herramienta.imagen) {
        imageContainer.innerHTML = `<img src="${herramienta.imagen}" alt="${herramienta.titulo}" class="modal-image" />`;
        imageContainer.style.backgroundColor = '#fdda24';
    } else {
        // Mostrar icono según el tipo de herramienta
        const icono = obtenerIconoPorTipo(herramienta.tipo);
        imageContainer.innerHTML = `<span class="material-icons-outlined modal-icon">${icono}</span>`;
    }
    
    // Mostrar modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Configurar eventos del modal
    configurarEventosModal();
}

/**
 * Configura los eventos del modal de preview
 */
function configurarEventosModal() {
    const modal = document.getElementById('modal-preview');
    const btnCerrar = document.getElementById('modal-preview-close');
    const btnEditar = document.getElementById('btn-editar');
    const btnConfirmar = document.getElementById('btn-confirmar');
    const overlay = modal.querySelector('.modal-overlay');
    
    // Cerrar modal
    const cerrarModal = () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    };
    
    btnCerrar.onclick = cerrarModal;
    btnEditar.onclick = cerrarModal;
    overlay.onclick = cerrarModal;
    
    // Confirmar herramienta
    btnConfirmar.onclick = () => {
        if (herramientaTemporal) {
            // Agregar a la lista existente
            const herramientasActualizadas = [...herramientasExistentes, herramientaTemporal];
            
            // Generar y descargar JSON
            descargarJSON(herramientasActualizadas);
            
            // Cerrar modal
            cerrarModal();
            
            // Mostrar mensaje de éxito
            mostrarExito();
            
            // Preguntar si desea crear otra
            setTimeout(() => {
                if (confirm('¿Deseas crear otra herramienta?')) {
                    formulario.reset();
                    materialesContainer.innerHTML = '';
                    pasosContainer.innerHTML = '';
                    imagenBase64 = null;
                    archivoAdjunto = null;
                    imagenPreview.style.display = 'none';
                    archivoInfo.style.display = 'none';
                    agregarMaterial();
                    agregarPaso();
                    ocultarMensajes();
                } else {
                    window.location.href = 'index.html';
                }
            }, 1500);
        }
    };
}

/**
 * Obtiene los materiales del formulario
 */
function obtenerMateriales() {
    const inputs = materialesContainer.querySelectorAll('.dynamic-item-input');
    return Array.from(inputs)
        .map(input => input.value.trim())
        .filter(valor => valor !== '');
}

/**
 * Obtiene los pasos del formulario
 */
function obtenerPasos() {
    const inputs = pasosContainer.querySelectorAll('.dynamic-item-input');
    return Array.from(inputs)
        .map(input => input.value.trim())
        .filter(valor => valor !== '');
}

/**
 * Crea el objeto de herramienta con todos los datos
 */
function crearObjetoHerramienta(usuarios, uso, tipo, materiales, pasos) {
    // Calcular nuevo ID
    const nuevoID = herramientasExistentes.length > 0
        ? Math.max(...herramientasExistentes.map(h => h.id)) + 1
        : 1;
    
    const herramienta = {
        id: nuevoID,
        titulo: document.getElementById('titulo').value.trim(),
        imagen: imagenBase64,
        descripcion: document.getElementById('descripcion').value.trim(),
        usuarios: usuarios,
        uso: uso,
        tipo: tipo,
        objetivo: document.getElementById('objetivo').value.trim(),
        materiales: materiales,
        pasos: pasos
    };
    
    // Agregar archivo adjunto si existe
    if (archivoAdjunto) {
        herramienta.archivoAdjunto = archivoAdjunto;
    }
    
    return herramienta;
}

/**
 * Genera y descarga el archivo JSON
 */
function descargarJSON(datos) {
    // Convertir a JSON con formato legible
    const jsonString = JSON.stringify(datos, null, 2);
    
    // Crear blob
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Crear URL temporal
    const url = URL.createObjectURL(blob);
    
    // Crear link de descarga
    const link = document.createElement('a');
    link.href = url;
    link.download = 'herramientas_actualizado.json';
    link.style.display = 'none';
    
    // Agregar al DOM, hacer clic y remover
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Liberar URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Muestra mensaje de éxito
 */
function mostrarExito() {
    mensajeError.style.display = 'none';
    mensajeExito.style.display = 'flex';
    mensajeExito.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Muestra mensaje de error
 */
function mostrarError(mensaje) {
    mensajeExito.style.display = 'none';
    document.getElementById('mensaje-error-texto').textContent = mensaje;
    mensajeError.style.display = 'flex';
    mensajeError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Oculta todos los mensajes
 */
function ocultarMensajes() {
    mensajeExito.style.display = 'none';
    mensajeError.style.display = 'none';
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

