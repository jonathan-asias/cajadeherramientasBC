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
const categoriaSelect = document.getElementById('categoria');
const nuevaCategoriaInput = document.getElementById('nueva-categoria');
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
        inicializarCategorias();
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
 * Inicializa el select de categorías con las existentes
 */
function inicializarCategorias() {
    // Obtener categorías únicas de las herramientas existentes
    const categorias = [...new Set(herramientasExistentes.map(h => h.categoria))].sort();
    
    categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria;
        categoriaSelect.appendChild(option);
    });
    
    // Agregar opción para nueva categoría
    const nuevaOption = document.createElement('option');
    nuevaOption.value = '__nueva__';
    nuevaOption.textContent = '➕ Crear nueva categoría';
    categoriaSelect.appendChild(nuevaOption);
    
    // Inicialmente ocultar el input de nueva categoría
    nuevaCategoriaInput.style.display = 'none';
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
    
    // Select de categoría
    categoriaSelect.addEventListener('change', manejarCambioCategoria);
    
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
 * Maneja el cambio en el select de categoría
 */
function manejarCambioCategoria() {
    if (categoriaSelect.value === '__nueva__') {
        nuevaCategoriaInput.style.display = 'block';
        nuevaCategoriaInput.required = true;
        nuevaCategoriaInput.focus();
    } else {
        nuevaCategoriaInput.style.display = 'none';
        nuevaCategoriaInput.required = false;
        nuevaCategoriaInput.value = '';
    }
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
    
    // Obtener categoría
    let categoria = categoriaSelect.value;
    if (categoria === '__nueva__') {
        categoria = nuevaCategoriaInput.value.trim();
        if (!categoria) {
            mostrarError('Debes ingresar un nombre para la nueva categoría.');
            return;
        }
    }
    
    try {
        // Crear objeto de herramienta
        const nuevaHerramienta = crearObjetoHerramienta(categoria, materiales, pasos);
        
        // Agregar a la lista existente
        const herramientasActualizadas = [...herramientasExistentes, nuevaHerramienta];
        
        // Generar y descargar JSON
        descargarJSON(herramientasActualizadas);
        
        // Mostrar mensaje de éxito
        mostrarExito();
        
        // Deshabilitar botón de guardar temporalmente
        const btnGuardar = document.getElementById('btn-guardar');
        btnGuardar.disabled = true;
        
        // Opcional: Resetear formulario después de 2 segundos
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
                btnGuardar.disabled = false;
                ocultarMensajes();
            } else {
                window.location.href = 'index.html';
            }
        }, 2000);
        
    } catch (error) {
        console.error('Error al crear herramienta:', error);
        mostrarError('Error al crear la herramienta. Por favor, intenta nuevamente.');
    }
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
function crearObjetoHerramienta(categoria, materiales, pasos) {
    // Calcular nuevo ID
    const nuevoID = herramientasExistentes.length > 0
        ? Math.max(...herramientasExistentes.map(h => h.id)) + 1
        : 1;
    
    const herramienta = {
        id: nuevoID,
        titulo: document.getElementById('titulo').value.trim(),
        categoria: categoria,
        duracion: document.getElementById('duracion').value.trim(),
        participantes: document.getElementById('participantes').value.trim(),
        descripcion: document.getElementById('descripcion').value.trim(),
        objetivo: document.getElementById('objetivo').value.trim(),
        materiales: materiales,
        pasos: pasos
    };
    
    // Agregar imagen si existe
    if (imagenBase64) {
        herramienta.imagen = imagenBase64;
    }
    
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

