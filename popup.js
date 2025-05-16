document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup DOM cargado');
    
    let patientsList = [];
    let currentPatientIndex = -1;
    let isFormFilling = false;

    // Obtener referencias a los elementos del formulario
    const form = {
        numAfiliado: document.getElementById('numAfiliado'),
        diagnostico: document.getElementById('diagnostico'),
        presionAlta: document.getElementById('presionAlta'),
        presionBaja: document.getElementById('presionBaja'),
        fillButton: document.getElementById('fillForm'),
        clearButton: document.getElementById('clearForm'),
        patientList: document.getElementById('patientList'),
        loadPatientsButton: document.getElementById('loadPatients'),
        nextPatientButton: document.getElementById('nextPatient'),
        prevPatientButton: document.getElementById('prevPatient'),
        currentPatient: document.getElementById('currentPatient'),
        patientInfo: document.getElementById('patientInfo'),
        progressInfo: document.getElementById('progressInfo')
    };

    // Referencias adicionales para el modo turnos
    const turnosElements = {
        modeAutoFill: document.getElementById('modeAutoFill'),
        modeTurnos: document.getElementById('modeTurnos'),
        autoFillSection: document.getElementById('autoFillSection'),
        turnosSection: document.getElementById('turnosSection'),
        fillFormButton: document.getElementById('fillForm'),
        assignTurnosButton: document.getElementById('assignTurnos'),
        fechaTurno: document.getElementById('fechaTurno'),
        horaInicialManana: document.getElementById('horaInicialManana'),
        minutoInicialManana: document.getElementById('minutoInicialManana'),
        horaFinalManana: document.getElementById('horaFinalManana'),
        minutoFinalManana: document.getElementById('minutoFinalManana'),
        horaInicialTarde: document.getElementById('horaInicialTarde'),
        minutoInicialTarde: document.getElementById('minutoInicialTarde'),
        turnosProgressInfo: document.getElementById('turnosProgressInfo')
    };

    // Tema oscuro/claro
    const themeToggle = document.getElementById('theme-toggle');
    
    // Cargar tema guardado
    chrome.storage.local.get(['theme'], function(result) {
        if (result.theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            themeToggle.textContent = '👁️';
        }
    });

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.body.removeAttribute('data-theme');
            themeToggle.textContent = '👁️';
            chrome.storage.local.set({ theme: 'light' });
        } else {
            document.body.setAttribute('data-theme', 'dark');
            themeToggle.textContent = '👁️';
            chrome.storage.local.set({ theme: 'dark' });
        }
    });

    // Establecer la fecha actual como valor predeterminado
    const today = new Date();
    turnosElements.fechaTurno.value = today.toISOString().split('T')[0];

    // Inicializar botones de navegación como deshabilitados
    form.prevPatientButton.disabled = true;
    form.nextPatientButton.disabled = true;

    // Restaurar estado si existe
    chrome.storage.local.get(['patientsList', 'currentPatientIndex'], function(result) {
        if (result.patientsList && result.patientsList.length > 0) {
            patientsList = result.patientsList;
            currentPatientIndex = result.currentPatientIndex || 0;
            form.patientList.value = patientsList.map(p => 
                `${p.numAfiliado},${p.diagnostico},${p.presionAlta},${p.presionBaja}`
            ).join('\n');
            loadPatientData(currentPatientIndex);
            updateNavigationButtons();
        }
    });

    // Cargar lista de pacientes
    form.loadPatientsButton.addEventListener('click', () => {
        try {
            const text = form.patientList.value.trim();
            if (!text) {
                throw new Error('Por favor, ingrese la lista de pacientes');
            }

            patientsList = text.split('\n')
                .map(line => line.trim())
                .filter(line => line)
                .map(line => {
                    const [numAfiliado, diagnostico, presionAlta, presionBaja, hora, minutos] = line.split(',').map(item => item.trim());
                    if (!numAfiliado || !diagnostico || !presionAlta || !presionBaja || !hora || !minutos) {
                        throw new Error('Formato inválido en la lista. Se esperan 6 campos: número_afiliado,diagnóstico,presión_alta,presión_baja,hora,minutos');
                    }
                    return { 
                        numAfiliado, 
                        diagnostico, 
                        presionAlta, 
                        presionBaja,
                        hora: hora.padStart(2, '0'),
                        minutos: minutos.padStart(2, '0')
                    };
                });

            if (patientsList.length === 0) {
                throw new Error('La lista está vacía');
            }

            currentPatientIndex = 0;
            saveState();
            loadPatientData(currentPatientIndex);
            showMessage(`${patientsList.length} pacientes cargados correctamente`, 'success');
            updateNavigationButtons();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    // Cargar siguiente paciente
    form.nextPatientButton.addEventListener('click', () => {
        if (currentPatientIndex >= patientsList.length - 1) {
            showMessage('Ya no hay más pacientes en la lista', 'success');
            return;
        }

        currentPatientIndex++;
        saveState();
        loadPatientData(currentPatientIndex);
    });

    // Cargar paciente anterior
    form.prevPatientButton.addEventListener('click', () => {
        if (currentPatientIndex <= 0) {
            showMessage('Ya estás en el primer paciente', 'success');
            return;
        }

        currentPatientIndex--;
        saveState();
        loadPatientData(currentPatientIndex);
    });

    form.fillButton.addEventListener('click', async () => {
        if (isFormFilling) {
            showMessage('Ya hay un formulario en proceso...', 'info');
            return;
        }

        try {
            isFormFilling = true;
            const formData = {
                numAfiliado: form.numAfiliado.value,
                diagnostico: form.diagnostico.value,
                presionAlta: form.presionAlta.value,
                presionBaja: form.presionBaja.value
            };

            // Validar que todos los campos estén completos
            if (!formData.numAfiliado || !formData.diagnostico || !formData.presionAlta || !formData.presionBaja) {
                throw new Error('Por favor, complete todos los campos');
            }

            // Obtener la pestaña activa
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                throw new Error('No se encontró una pestaña activa');
            }

            // Verificar si estamos en la página correcta
            if (!tab.url.includes('pe.pami.org.ar')) {
                throw new Error('Esta extensión solo funciona en el sistema de PAMI');
            }

            showMessage('Rellenando formulario...', 'info');

            // Enviar mensaje al content script
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'fillForm',
                data: formData
            });

            if (!response || !response.success) {
                throw new Error(response?.message || 'Error al completar el formulario');
            }

            showMessage('Formulario completado exitosamente', 'success');
            
            // No avanzar automáticamente al siguiente paciente
            // El usuario decidirá cuándo avanzar usando los botones de navegación
            
        } catch (error) {
            console.error('Error:', error);
            showMessage(error.message || 'Error al completar el formulario', 'error');
        } finally {
            isFormFilling = false;
        }
    });

    form.clearButton.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                throw new Error('No se encontró una pestaña activa');
            }

            const response = await chrome.tabs.sendMessage(tab.id, { action: 'clearForm' });
            if (!response || !response.success) {
                throw new Error(response?.message || 'Error al limpiar el formulario');
            }
            showMessage('Formulario limpiado exitosamente', 'success');
        } catch (error) {
            console.error('Error:', error);
            showMessage(error.message || 'Error al limpiar el formulario', 'error');
        }
    });

    // Cambio de modo (AutoFill/Turnos)
    turnosElements.modeAutoFill.addEventListener('click', () => {
        setMode('autoFill');
    });

    turnosElements.modeTurnos.addEventListener('click', () => {
        setMode('turnos');
    });

    function setMode(mode) {
        if (mode === 'autoFill') {
            turnosElements.modeAutoFill.classList.add('active');
            turnosElements.modeTurnos.classList.remove('active');
            turnosElements.autoFillSection.style.display = 'block';
            turnosElements.turnosSection.style.display = 'none';
            turnosElements.fillFormButton.style.display = 'block';
            turnosElements.assignTurnosButton.style.display = 'none';
        } else {
            turnosElements.modeAutoFill.classList.remove('active');
            turnosElements.modeTurnos.classList.add('active');
            turnosElements.autoFillSection.style.display = 'none';
            turnosElements.turnosSection.style.display = 'block';
            turnosElements.fillFormButton.style.display = 'none';
            turnosElements.assignTurnosButton.style.display = 'block';
        }
    }

    // Asignación de turnos
    turnosElements.assignTurnosButton.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                throw new Error('No se encontró una pestaña activa');
            }

            // Verificar que estamos en la página correcta
            if (!tab.url.includes('pe.pami.org.ar/controllers/efector.php')) {
                throw new Error('Esta función solo está disponible en la página de asignación de turnos de PAMI');
            }

            if (patientsList.length === 0) {
                throw new Error('No hay pacientes cargados');
            }

            showMessage('Iniciando asignación de turnos...', 'info');

            // Enviar mensaje al content script con los datos necesarios
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'assignTurno',
                data: {
                    patient: patientsList[currentPatientIndex],
                    turnoData: {
                        fecha: turnosElements.fechaTurno.value,
                        horaInicial: {
                            manana: {
                                hora: turnosElements.horaInicialManana.value,
                                minuto: turnosElements.minutoInicialManana.value
                            },
                            tarde: {
                                hora: turnosElements.horaInicialTarde.value,
                                minuto: turnosElements.minutoInicialTarde.value
                            }
                        },
                        horaFinal: {
                            manana: {
                                hora: turnosElements.horaFinalManana.value,
                                minuto: turnosElements.minutoFinalManana.value
                            }
                        }
                    }
                }
            });

            if (!response || !response.success) {
                throw new Error(response?.message || 'Error al asignar el turno');
            }

            showMessage('Turno asignado exitosamente', 'success');
            
            // Avanzar al siguiente paciente automáticamente
            if (currentPatientIndex < patientsList.length - 1) {
                currentPatientIndex++;
                saveState();
                loadPatientData(currentPatientIndex);
            }
            
        } catch (error) {
            console.error('Error:', error);
            showMessage(error.message || 'Error al asignar el turno', 'error');
        }
    });

    function loadPatientData(index) {
        const patient = patientsList[index];
        if (!patient) return;
        
        // Llenar el formulario con los datos del paciente
        form.numAfiliado.value = patient.numAfiliado;
        form.diagnostico.value = patient.diagnostico;
        form.presionAlta.value = patient.presionAlta;
        form.presionBaja.value = patient.presionBaja;

        // Actualizar los campos de hora si estamos en modo turnos
        if (turnosElements) {
            // Detectar si el horario es de mañana (entre 7:30 y 12:30) o tarde (desde 16:00)
            const hora = parseInt(patient.hora);
            if (hora >= 7 && hora <= 12) {
                // Horario de mañana
                turnosElements.horaInicialManana.value = patient.hora;
                turnosElements.minutoInicialManana.value = patient.minutos;
            } else if (hora >= 16) {
                // Horario de tarde
                turnosElements.horaInicialTarde.value = patient.hora;
                turnosElements.minutoInicialTarde.value = patient.minutos;
            }
        }

        // Mostrar información del paciente actual
        form.currentPatient.style.display = 'block';
        form.patientInfo.textContent = `${patient.numAfiliado} - ${patient.diagnostico} - ${patient.hora}:${patient.minutos}`;
        updateProgressInfo();
        updateNavigationButtons();
    }

    function updateNavigationButtons() {
        form.prevPatientButton.disabled = currentPatientIndex <= 0;
        form.nextPatientButton.disabled = currentPatientIndex >= patientsList.length - 1;
    }

    function updateProgressInfo() {
        if (patientsList.length > 0) {
            const current = currentPatientIndex + 1;
            const total = patientsList.length;
            form.progressInfo.textContent = `Paciente ${current} de ${total}`;
        } else {
            form.progressInfo.textContent = '';
        }
    }

    function saveState() {
        chrome.storage.local.set({
            patientsList: patientsList,
            currentPatientIndex: currentPatientIndex
        });
    }

    function showMessage(message, type) {
        const statusMessage = document.getElementById('statusMessage');
        statusMessage.textContent = message;
        statusMessage.className = type;
        statusMessage.style.display = 'block';
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    }
});
