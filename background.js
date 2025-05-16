console.log("Service Worker iniciado");

chrome.runtime.onInstalled.addListener(() => {
    console.log("AutoFill Médica instalada y lista para usar.");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Mensaje recibido en background:", request);
    
    if (request.type === "fillForm" || request.type === "clearForm") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs.length === 0) {
                console.error("No hay pestañas activas");
                return;
            }
            
            chrome.tabs.sendMessage(tabs[0].id, request)
                .then(response => {
                    console.log("Respuesta de content script:", response);
                    sendResponse(response);
                })
                .catch(error => {
                    console.error("Error al enviar mensaje al content script:", error);
                    sendResponse({ success: false, message: error.message });
                });
        });
    }
    
    return true; // Mantiene la conexión abierta para la respuesta asíncrona
});