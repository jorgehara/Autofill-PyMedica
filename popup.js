document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup DOM cargado');
    
    // Obtener referencias a los elementos del formulario
    const form = {
        numAfiliado: document.getElementById('numAfiliado'),
        diagnostico: document.getElementById('diagnostico'),
        presionAlta: document.getElementById('presionAlta'),
        presionBaja: document.getElementById('presionBaja'),
        fillButton: document.getElementById('fillForm'),
        clearButton: document.getElementById('clearForm')
    };

        form.fillButton.addEventListener('click', async () => {
        try {
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

            // Validar con el backend
            const verificacionResponse = await fetch('http://localhost:5000/api/verificar-afiliado', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ numAfiliado: formData.numAfiliado })
            });

            const verificacionData = await verificacionResponse.json();
            if (!verificacionData.success) {
                throw new Error(verificacionData.mensaje);
            }

            // Obtener la pestaña activa
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });            // Verificar si estamos en la página correcta
            if (!tab.url.includes('pe.pami.org.ar')) {
                throw new Error('Esta extensión solo funciona en el sistema de PAMI');
            }

            // Enviar mensaje al content script
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'fillForm',
                data: formData
            });

            if (!response || !response.success) {
                throw new Error(response?.message || 'Error al completar el formulario');
            }

            showMessage('Formulario completado exitosamente', 'success');
        } catch (error) {
            console.error('Error:', error);
            showMessage(error.message || 'Error al completar el formulario', 'error');
        }
    });

    form.clearButton.addEventListener('click', async () => {        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                throw new Error('No se encontró una pestaña activa');
            }

            // Verificar si estamos en la página correcta
            if (!tab.url.includes('pe.pami.org.ar')) {
                throw new Error('Esta extensión solo funciona en el sistema de PAMI');
            }

            const response = await chrome.tabs.sendMessage(tab.id, { action: 'clearForm' });
            if (!response || !response.success) {
                throw new Error(response?.message || 'Error al limpiar el formulario');
            }
            showMessage('Formulario limpiado exitosamente', 'success');
        } catch (error) {
            console.error('Error:', error);
            if (error.message.includes('Receiving end does not exist')) {
                showMessage('Error: Por favor, recarga la página de PAMI', 'error');
            } else {
                showMessage(error.message || 'Error al limpiar el formulario', 'error');
            }
        }
    });

    function showMessage(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = type;
        statusMessage.style.display = 'block';
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    }
});
