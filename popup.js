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
                    const [numAfiliado, diagnostico, presionAlta, presionBaja] = line.split(',').map(item => item.trim());
                    if (!numAfiliado || !diagnostico || !presionAlta || !presionBaja) {
                        throw new Error('Formato inválido en la lista');
                    }
                    return { numAfiliado, diagnostico, presionAlta, presionBaja };
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

    function loadPatientData(index) {
        const patient = patientsList[index];
        if (!patient) return;
        
        // Llenar el formulario con los datos del paciente
        form.numAfiliado.value = patient.numAfiliado;
        form.diagnostico.value = patient.diagnostico;
        form.presionAlta.value = patient.presionAlta;
        form.presionBaja.value = patient.presionBaja;

        // Mostrar información del paciente actual
        form.currentPatient.style.display = 'block';
        form.patientInfo.textContent = `${patient.numAfiliado} - ${patient.diagnostico}`;
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