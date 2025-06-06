console.log("Content script cargado");

// Escuchar mensajes desde el popup
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log("Mensaje recibido en content script:", request);
        
        if (request.action === "fillForm") {
            console.log("Iniciando llenado de formulario con datos:", request.data);
            fillForm(request.data)
                .then(() => sendResponse({success: true, message: "Formulario completado exitosamente"}))
                .catch(error => sendResponse({success: false, message: error.message}));
        } else if (request.action === "clearForm") {
            console.log("Limpiando formulario");
            clearForm()
                .then(() => sendResponse({success: true, message: "Formulario limpiado exitosamente"}))
                .catch(error => sendResponse({success: false, message: error.message}));
        }
        return true; // Mantiene la conexión abierta para la respuesta asíncrona
    }
);

// Función para llenar el formulario
async function fillForm(data) {
    try {
        // Primero limpiar el formulario
        console.log("Limpiando formulario antes de rellenar");
        await clearForm();
        await delay(1000); // Esperar a que se complete la limpieza

        const { numAfiliado, diagnostico, presionAlta, presionBaja } = data;
        console.log("Llenando formulario con:", data);        // Escribir número de afiliado
        await setInputValue("pe-n_afiliado", numAfiliado);
        await delay(500);

        // Simular TAB para activar la búsqueda del afiliado
        const inputAfiliado = document.getElementById("pe-n_afiliado");
        if (inputAfiliado) {
            inputAfiliado.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", keyCode: 9, bubbles: true }));
            console.log("TAB simulado después del número de afiliado");
            
            // Esperar a que se carguen los datos del afiliado
            await new Promise(resolve => {
                const checkFields = setInterval(() => {
                    const nombreField = document.querySelector("[name='pe-nom_afiliado']");
                    const docField = document.querySelector("[name='pe-nro_doc']");
                    
                    if (nombreField && nombreField.value && docField && docField.value) {
                        clearInterval(checkFields);
                        console.log("Datos del afiliado cargados correctamente");
                        resolve();
                    }
                }, 500);
                
                // Timeout después de 10 segundos si no se encuentran los campos
                setTimeout(() => {
                    clearInterval(checkFields);
                    console.log("Timeout esperando datos del afiliado");
                    resolve();
                }, 1500);
            });
        }
        
        await delay(1000); // Esperar un segundo adicional para asegurar que todo esté listo
          // Limpiar cualquier diagnóstico previo y cerrar modales si están abiertos
        const modalCerrar = document.querySelector(".modal-header .close, .modal .close-button");
        if (modalCerrar) {
            modalCerrar.click();
            await delay(500);
        }

        // Limpiar los campos de diagnóstico existentes
        const diagnosticoExistente = document.querySelector("[id*='diagnostico'], [name*='diagnostico']");
        if (diagnosticoExistente) {
            diagnosticoExistente.value = '';
            diagnosticoExistente.dispatchEvent(new Event('input', { bubbles: true }));
            diagnosticoExistente.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Clic en botón de búsqueda de diagnóstico
        await clickElement("pe-btn-bsq-diagnostico");
        await delay(500);        // Configurar y realizar la búsqueda de diagnóstico
        const criterioSelect = document.getElementById("bsq_avz_diagnostico_criterio");
        const inputDiagnostico = document.getElementById("bsq_avz_diagnostico_valor");
        
        if (criterioSelect && inputDiagnostico) {
            // Limpiar el campo de búsqueda
            inputDiagnostico.value = '';
            await delay(500);

            // Determinar si el diagnóstico es un código
            const esCodigo = /^[A-Z0-9]+$/.test(diagnostico.trim());
            
            // Establecer el criterio de búsqueda
            criterioSelect.value = esCodigo ? 'cod' : 'desc';
            criterioSelect.dispatchEvent(new Event('change', { bubbles: true }));
            await delay(500);

            // Ingresar el valor de búsqueda
            inputDiagnostico.value = diagnostico.trim();
            inputDiagnostico.dispatchEvent(new Event('input', { bubbles: true }));
            inputDiagnostico.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Buscando diagnóstico por ${esCodigo ? 'código' : 'descripción'}: ${diagnostico}`);
        }
        await delay(1000);

        // Clic en botón de búsqueda y esperar resultados
        await clickElement("#modal-busqueda-diagnostico button[type='submit']");
        await delay(2000); // Aumentamos el tiempo de espera inicial

        // Esperar a que se carguen los resultados y encontrar el diagnóstico correcto
        let diagnosticoEncontrado = false;
        await new Promise((resolve, reject) => {
            let intentos = 0;
            const maxIntentos = 15; // Aumentamos el número de intentos
            const buscarDiagnostico = setInterval(async () => {
                const results = document.querySelectorAll("#modal-busqueda-diagnostico table tbody tr");
                  if (results.length > 0) {
                    clearInterval(buscarDiagnostico);
                    console.log(`Encontrados ${results.length} resultados de diagnóstico`);
                    
                    // Si estamos buscando por código, seleccionar el primer resultado
                    const esCodigo = /^[A-Z0-9]+$/.test(diagnostico.trim());
                    if (esCodigo) {
                        console.log('Búsqueda por código: seleccionando primer resultado');
                        results[0].querySelector('td').click();
                        diagnosticoEncontrado = true;
                    } else {
                        // Si es búsqueda por descripción, intentar encontrar la mejor coincidencia
                        for (let i = 0; i < results.length; i++) {
                            const descripcion = results[i].cells[1]?.textContent?.trim() || '';
                            console.log(`Comparando descripción: [${descripcion}]`);

                            if (descripcion.toLowerCase().includes(diagnostico.toLowerCase())) {
                                console.log('Encontrada coincidencia en descripción');
                                results[i].querySelector('td').click();
                                diagnosticoEncontrado = true;
                                break;
                            }
                        }

                        // Si no se encontró coincidencia en descripción, seleccionar el primer resultado
                        if (!diagnosticoEncontrado && results.length > 0) {
                            console.log('No se encontró coincidencia exacta, seleccionando primer resultado');
                            results[0].querySelector('td').click();
                            diagnosticoEncontrado = true;
                        }
                    }
                    
                    if (!diagnosticoEncontrado) {
                        console.log("Diagnósticos disponibles:");
                        results.forEach(row => console.log(row.textContent));
                    }
                    
                    resolve();
                }
                
                intentos++;
                if (intentos >= maxIntentos) {
                    clearInterval(buscarDiagnostico);
                    console.log("Tiempo de espera agotado buscando diagnósticos");
                    resolve();
                }
            }, 500);
        });

        if (!diagnosticoEncontrado) {
            throw new Error("No se pudo encontrar el diagnóstico especificado");
        }
        
        await delay(1000); // Espera adicional después de seleccionar

        // Buscar práctica
        await clickElement("pe-btn-bsq-practica");
        await delay(500);

        // Configurar modalidad
        await setSelectValue("bsq_modalidad_practica", "1");
        await delay(500);

        // Configurar agrupador
        await setSelectValue("bsq_agrupador_practica", "41");
        await delay(500);

        // Configurar módulo
        await setSelectValue("bsq_modulo_practica", "1");
        await delay(500);

        // Buscar "pres"
        await setInputValue("bsq_desc_practica", "pres");
        await delay(500);

        // Clic en botón de filtro
        await clickElement("#pe-form-filtro-practicas > div:nth-child(3) > div.col-sm-offset-2.col-sm-2 > button");
        await delay(1000);

        // Seleccionar primera opción
        await clickElement("#pe-listado-bsq-practicas > table > tbody > tr > td:nth-child(1) > input[type=checkbox]");
        await delay(500);

        // Clic en Aceptar
        await clickElement("#pe-btn-agregar-practicas");
        await delay(500);

        // Abrir formulario de presión
        await clickElement("#pe-btn-form-427109");
        await delay(1000); // Aumentado el delay para asegurar que el formulario esté completamente cargado

        // Función para verificar y reintentar el llenado de campos
        async function setInputValueWithRetry(selector, value, maxRetries = 3) {
            for (let i = 0; i < maxRetries; i++) {
                try {
                    const element = document.querySelector(selector);
                    if (!element) {
                        console.log(`Intento ${i + 1}: Campo no encontrado: ${selector}`);
                        await delay(1000);
                        continue;
                    }

                    element.value = value;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));

                    // Verificar si el valor se estableció correctamente
                    await delay(500);
                    if (element.value === value) {
                        console.log(`Campo ${selector} rellenado exitosamente con: ${value}`);
                        return true;
                    }
                    
                    console.log(`Intento ${i + 1}: Valor no establecido correctamente en ${selector}`);
                } catch (error) {
                    console.error(`Error en intento ${i + 1} para ${selector}:`, error);
                }
                await delay(1000);
            }
            throw new Error(`No se pudo establecer el valor en ${selector} después de ${maxRetries} intentos`);
        }

        // Array con los campos a llenar y sus valores
        const camposACompletar = [
            {
                selector: ".of-form-control.ofl-input.ofl-arterial.of-ta-left",
                value: presionAlta,
                description: "Presión Alta"
            },
            {
                selector: "#tension-2-1",
                value: presionBaja,
                description: "Presión Baja"
            },
            {
                selector: "textarea#of-observaciones[preguntaid='221']",
                value: diagnostico,
                description: "Diagnóstico 1"
            },
            {
                selector: "textarea#of-observaciones[preguntaid='223']",
                value: diagnostico,
                description: "Diagnóstico 2"
            },
            {
                selector: "textarea#of-observaciones[preguntaid='224']",
                value: "CONSULTA GRAL.",
                description: "Tipo Consulta"
            },
            {
                selector: "textarea#of-observaciones[preguntaid='222']",
                value: `REGISTRO TA ${presionAlta}/${presionBaja}`,
                description: "Registro TA"
            }
        ];

        // Intentar llenar cada campo y verificar
        for (const campo of camposACompletar) {
            try {
                await setInputValueWithRetry(campo.selector, campo.value);
            } catch (error) {
                console.error(`Error al llenar ${campo.description}:`, error);
                throw new Error(`No se pudo completar el campo ${campo.description}`);
            }
        }

        // Verificación final antes de guardar
        async function verificarCamposCompletos() {
            let todosCamposCompletos = true;
            for (const campo of camposACompletar) {
                const element = document.querySelector(campo.selector);
                if (!element || element.value !== campo.value) {
                    console.log(`Verificación fallida para ${campo.description}`);
                    todosCamposCompletos = false;
                    break;
                }
            }
            return todosCamposCompletos;
        }

        // Verificar y reintentar si es necesario
        if (!await verificarCamposCompletos()) {
            console.log("Reintentando llenar campos incompletos...");
            for (const campo of camposACompletar) {
                const element = document.querySelector(campo.selector);
                if (!element || element.value !== campo.value) {
                    await setInputValueWithRetry(campo.selector, campo.value);
                }
            }
        }
        
        await delay(1000); // Delay adicional antes de guardar
        // ===== FIN DE LA SECCIÓN DE LLENADO DE PRESIÓN Y DIAGNÓSTICO =====
        // Guardar el formulario y esperar que el usuario maneje los primeros dos popups
        await guardarFormulario();
        
        // Esperar un tiempo para que el usuario maneje los popups manualmente
        await delay(800); // Reducido de 5000 a 2000 ms

        // Iniciar la secuencia de finalización
        await handleFinalizacion();

        console.log("Formulario completado y finalizado exitosamente");
    } catch (error) {
        console.error("Error al llenar el formulario:", error);
        throw error;
    }
}

// Función para manejar la secuencia de finalización
async function handleFinalizacion() {
    try {
        // Esperar a que el botón Finalizar esté disponible
        let finalizarButton = null;
        let intentos = 0;
        while (!finalizarButton && intentos < 20) {
            finalizarButton = document.querySelector('#pe-btn-generar-orden');
            if (!finalizarButton) {
                await delay(500);
                intentos++;
            }
        }

        if (!finalizarButton) {
            throw new Error('No se encontró el botón Finalizar');
        }

        console.log('Botón Finalizar encontrado, haciendo clic...');
        finalizarButton.click();
        await delay(1000);

        // Esperar y hacer clic en el botón Confirmar
        let confirmarButton = null;
        intentos = 0;
        while (!confirmarButton && intentos < 20) {
            confirmarButton = document.querySelector('#pe-btn-confirmar-generar-orden');
            if (!confirmarButton) {
                await delay(500);
                intentos++;
            }
        }

        if (!confirmarButton) {
            throw new Error('No se encontró el botón Confirmar');
        }

        console.log('Botón Confirmar encontrado, haciendo clic...');
        confirmarButton.click();
        await delay(1000);        // Esperar y hacer clic en el botón cerrar (x)
        let cerrarButton = null;
        intentos = 0;
        while (!cerrarButton && intentos < 20) {
            cerrarButton = document.querySelector("body > div.alert.rin-alert.text-center.alert-success > button > span");
            if (!cerrarButton) {
                await delay(500);
                intentos++;
            }
        }

        if (!cerrarButton) {
            throw new Error('No se encontró el botón cerrar');
        }

        console.log('Botón cerrar encontrado, haciendo clic...');
        cerrarButton.click();

    } catch (error) {
        console.error('Error en la secuencia de finalización:', error);
        throw error;
    }
}

// Función para manejar los popups secuenciales
async function handleSequentialPopups() {
    try {
        // Esperar por los popups y manejarlos secuencialmente
        for (let i = 0; i < 3; i++) {
            await new Promise(resolve => {
                const checkPopup = setInterval(() => {
                    // Buscar botones de aceptar en cualquier modal visible
                    const aceptarButtons = Array.from(document.querySelectorAll('button')).filter(button => {
                        return button.offsetParent !== null && // Asegurarse que el botón es visible
                            (button.textContent.includes('Aceptar') ||
                             button.classList.contains('btn-primary'));
                    });

                    if (aceptarButtons.length > 0) {
                        console.log(`Popup ${i + 1}: Encontrado botón aceptar`);
                        // Simular presionar Enter y hacer clic
                        aceptarButtons[0].dispatchEvent(new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            bubbles: true
                        }));
                        aceptarButtons[0].click();
                        clearInterval(checkPopup);
                        resolve();
                    }
                }, 500);

                // Timeout después de 5 segundos si no se encuentra el popup
                setTimeout(() => {
                    clearInterval(checkPopup);
                    console.log(`Popup ${i + 1}: Timeout esperando`);
                    resolve();
                }, 5000);
            });

            // Esperar entre popups
            await delay(1000);
        }
    } catch (error) {
        console.error('Error manejando popups:', error);
    }
}

// Función para guardar el formulario
async function guardarFormulario() {
    try {
        // Buscar el botón guardar
        const guardarButton = document.querySelector('#of-aceptar');
        if (!guardarButton) {
            throw new Error('No se encontró el botón guardar');
        }

        // Simular presionar Enter y hacer clic en el botón
        guardarButton.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            bubbles: true
        }));
        guardarButton.click();
        console.log('Botón guardar presionado');

        // Manejar los popups subsecuentes
        await handleSequentialPopups();

    } catch (error) {
        console.error('Error al guardar el formulario:', error);
        throw error;
    }
}

// Función para limpiar el formulario
async function clearForm() {
    try {
        // Buscar y hacer clic en el botón Cancelar
        const cancelarButton = document.querySelector("#pe-btn-cancelar-orden");
        if (cancelarButton) {
            cancelarButton.click();
            console.log("Botón CANCELAR clickeado");
            await delay(500);
            
            // Confirmar la cancelación
            const confirmarButton = document.querySelector("#pe-btn-confirmar-cancelar-orden");
            if (confirmarButton) {
                confirmarButton.click();
                console.log("Cancelación confirmada");
            }
        }
        
        // Limpiar cualquier diagnóstico cacheado
        const diagnosticoInputs = document.querySelectorAll("[id*='diagnostico'], [name*='diagnostico']");
        for (const input of diagnosticoInputs) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Limpiar cualquier modal abierto
        const modalCerrar = document.querySelector(".modal-header .close, .modal .close-button");
        if (modalCerrar) {
            modalCerrar.click();
            console.log("Modal cerrado si estaba abierto");
        }
        
        console.log("Formulario limpiado exitosamente");
    } catch (error) {
        console.error("Error al limpiar el formulario:", error);
    }
}

// Funciones auxiliares
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function setInputValue(selector, value) {
    const element = document.getElementById(selector) || document.querySelector(selector);
    if (element) {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    }
    throw new Error(`Elemento no encontrado: ${selector}`);
}

async function setSelectValue(selector, value) {
    const element = document.getElementById(selector);
    if (element) {
        element.value = value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }
    throw new Error(`Select no encontrado: ${selector}`);
}

async function clickElement(selector) {
    const element = document.getElementById(selector) || document.querySelector(selector);
    if (element) {
        element.click();
        return true;
    }
    throw new Error(`Elemento no encontrado para clic: ${selector}`);
}

async function setInputValues(inputs) {
    for (const input of inputs) {
        await setInputValue(input.selector, input.value);
        await delay(200);
    }
}