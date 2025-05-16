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
        } else if (request.action === "assignTurno") {
            console.log("Iniciando asignación de turno:", request.data);
            assignTurno(request.data)
                .then(() => sendResponse({success: true, message: "Turno asignado exitosamente"}))
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
        await delay(500);

        // Llenar valores de presión
        await setInputValues([
            {
                selector: ".of-form-control.ofl-input.ofl-arterial.of-ta-left",
                value: presionAlta
            },
            {
                selector: "#tension-2-1",
                value: presionBaja
            },
            {
                selector: "textarea#of-observaciones[preguntaid='221']",
                value: diagnostico
            },
            {
                selector: "textarea#of-observaciones[preguntaid='223']",
                value: diagnostico
            },
            {
                selector: "textarea#of-observaciones[preguntaid='224']",
                value: "CONSULTA GRAL."
            },
            {
                selector: "textarea#of-observaciones[preguntaid='222']",
                value: `REGISTRO TA ${presionAlta}/${presionBaja}`
            }
        ]);
        
        await delay(800);        // Guardar el formulario y esperar que el usuario maneje los primeros dos popups
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

// Función para asignar un turno
async function assignTurno(data) {
    try {
        const { patient, turnoData } = data;
        console.log("Asignando turno para:", patient.numAfiliado);

        // Ingresar número de afiliado
        const inputAfiliado = document.querySelector("input[name='n_afiliado']");
        if (!inputAfiliado) {
            throw new Error("No se encontró el campo de número de afiliado");
        }

        inputAfiliado.value = patient.numAfiliado;
        inputAfiliado.dispatchEvent(new Event('input', { bubbles: true }));
        inputAfiliado.dispatchEvent(new KeyboardEvent('keypress', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            bubbles: true
        }));

        await delay(1000);

        // Buscar y hacer clic en el botón de asignación de turno
        const botonTurno = document.querySelector("i.boton-historial.btn-sm.btn-success.fas.fa-check[data-modalidad='POR PRESTACION']");
        if (!botonTurno) {
            throw new Error("No se encontró el botón para asignar turno");
        }

        botonTurno.click();
        await delay(1000);

        // Hacer clic en el campo de fecha y establecer la fecha
        const inputFecha = document.querySelector("input.form-control.datepicker.fecha");
        if (!inputFecha) {
            throw new Error("No se encontró el campo de fecha");
        }

        inputFecha.click();
        await delay(500);

        inputFecha.dispatchEvent(new KeyboardEvent('keypress', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            bubbles: true
        }));

        // Seleccionar la hora y minutos
        const selectHora = document.querySelector("select.form-control.hora");
        const selectMinuto = document.querySelector("select.form-control.minuto");

        if (!selectHora || !selectMinuto) {
            throw new Error("No se encontraron los selectores de hora y minuto");
        }

        // Determinar la hora y minutos basados en el horario actual
        const { hora, minutos } = calcularHorarioTurno(turnoData);

        selectHora.value = hora;
        selectHora.dispatchEvent(new Event('change', { bubbles: true }));
        
        selectMinuto.value = minutos;
        selectMinuto.dispatchEvent(new Event('change', { bubbles: true }));

        await delay(500);

        // Seleccionar el médico (KARDASZ, IVANA NOELIA)
        const selectMedico = document.querySelector("select.form-control.bocas");
        if (!selectMedico) {
            throw new Error("No se encontró el selector de médico");
        }

        // Buscar la opción que contiene "KARDASZ"
        const opcionMedico = Array.from(selectMedico.options).find(option => 
            option.text.includes("KARDASZ"));

        if (!opcionMedico) {
            throw new Error("No se encontró el médico KARDASZ");
        }

        selectMedico.value = opcionMedico.value;
        selectMedico.dispatchEvent(new Event('change', { bubbles: true }));
        selectMedico.dispatchEvent(new KeyboardEvent('keypress', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            bubbles: true
        }));

        await delay(1000);

        console.log("Turno asignado exitosamente");
    } catch (error) {
        console.error("Error al asignar turno:", error);
        throw error;
    }
}

// Función para calcular el horario del turno
function calcularHorarioTurno(turnoData) {
    const horaActual = new Date().getHours();
    const minutoActual = new Date().getMinutes();

    let hora, minutos;

    // Si es horario de mañana (entre 7:30 y 12:30)
    if (horaActual >= 7 && horaActual < 12 || 
        (horaActual === 12 && minutoActual <= 30)) {
        hora = turnoData.horaInicial.manana.hora.toString().padStart(2, '0');
        minutos = turnoData.horaInicial.manana.minuto.toString().padStart(2, '0');
    }
    // Si es horario de tarde (desde 16:00)
    else {
        hora = turnoData.horaInicial.tarde.hora.toString().padStart(2, '0');
        minutos = turnoData.horaInicial.tarde.minuto.toString().padStart(2, '0');
    }

    return { hora, minutos };
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
