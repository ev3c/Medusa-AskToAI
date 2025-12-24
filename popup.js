// Función de notificación personalizada
function showNotification(message, type = 'info') {
    // Eliminar notificación existente si hay una
    const existing = document.querySelector('.custom-notification');
    if (existing) existing.remove();
    
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `custom-notification notification-${type}`;
    notification.textContent = message;
    
    // Añadir al DOM
    document.body.appendChild(notification);
    
    // Mostrar con animación
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Función de confirmación personalizada
function showConfirm(message) {
    return new Promise((resolve) => {
        // Eliminar confirmación existente si hay una
        const existing = document.querySelector('.custom-confirm-overlay');
        if (existing) existing.remove();
        
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'custom-confirm-overlay';
        
        // Crear diálogo
        const dialog = document.createElement('div');
        dialog.className = 'custom-confirm-dialog';
        
        // Mensaje
        const messageEl = document.createElement('p');
        messageEl.className = 'confirm-message';
        messageEl.textContent = message;
        
        // Contenedor de botones
        const buttons = document.createElement('div');
        buttons.className = 'confirm-buttons';
        
        // Botón Cancelar
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'confirm-btn confirm-btn-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 200);
            resolve(false);
        };
        
        // Botón Confirmar
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'confirm-btn confirm-btn-confirm';
        confirmBtn.textContent = 'Confirm';
        confirmBtn.onclick = () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 200);
            resolve(true);
        };
        
        // Ensamblar
        buttons.appendChild(cancelBtn);
        buttons.appendChild(confirmBtn);
        dialog.appendChild(messageEl);
        dialog.appendChild(buttons);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Mostrar con animación
        requestAnimationFrame(() => {
            overlay.classList.add('show');
        });
    });
}

// Cargar preferencia guardada
async function loadUserPreference() {
    try {
        const result = await chrome.storage.sync.get(['selectedAI']);
        const value = result.selectedAI || 'chatgpt';
        const radioButton = document.querySelector(`input[name="aiService"][value="${value}"]`);
        if (radioButton) radioButton.checked = true;
    } catch (error) {
        console.error('Error cargando preferencia:', error);
    }
}

// Guardar preferencia
async function saveUserPreference(selectedAI) {
    try {
        await chrome.storage.sync.set({ selectedAI: selectedAI });
    } catch (error) {
        console.error('Error guardando preferencia:', error);
    }
}

// Guardar prompt usado
async function savePromptUsage(prompt) {
    try {
        const result = await chrome.storage.local.get(['promptHistory']);
        let promptHistory = result.promptHistory || {};
        
        promptHistory[prompt] = (promptHistory[prompt] || 0) + 1;
        
        await chrome.storage.local.set({ promptHistory: promptHistory });
        await displayFrequentPrompts();
    } catch (error) {
        console.error('Error guardando prompt:', error);
    }
}

// Obtener los 5 prompts más usados
async function getTopPrompts() {
    try {
        const result = await chrome.storage.local.get(['promptHistory']);
        const promptHistory = result.promptHistory || {};
        
        return Object.entries(promptHistory)
            .map(([prompt, count]) => ({ prompt, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    } catch (error) {
        console.error('Error obteniendo prompts frecuentes:', error);
        return [];
    }
}

// Mostrar prompts frecuentes en la interfaz
async function displayFrequentPrompts() {
    const topPrompts = await getTopPrompts();
    const container = document.getElementById('frequentPromptsContainer');
    const list = document.getElementById('frequentPromptsList');
    
    if (topPrompts.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    list.innerHTML = '';
    
    topPrompts.forEach(item => {
        const promptElement = document.createElement('div');
        promptElement.className = 'frequent-prompt-item';
        promptElement.title = item.prompt;
        
        const promptText = document.createElement('span');
        promptText.className = 'prompt-text';
        promptText.textContent = item.prompt;
        
        const promptCount = document.createElement('span');
        promptCount.className = 'prompt-count';
        promptCount.textContent = `×${item.count}`;
        
        promptElement.appendChild(promptText);
        promptElement.appendChild(promptCount);
        
        promptElement.addEventListener('click', () => {
            const askInput = document.getElementById('askInput');
            askInput.value = item.prompt;
            askInput.focus();
        });
        
        list.appendChild(promptElement);
    });
}

// Borrar todo el historial de prompts
async function clearPromptHistory() {
    const confirmed = await showConfirm('Are you sure you want to delete all prompt history?');
    if (confirmed) {
        try {
            await chrome.storage.local.remove('promptHistory');
            await displayFrequentPrompts();
            showNotification('History cleared successfully.', 'success');
        } catch (error) {
            console.error('Error deleting history:', error);
            showNotification('Error deleting history. Please try again.', 'error');
        }
    }
}

// Obtener servicio seleccionado
function getSelectedAI() {
    const selectedRadio = document.querySelector('input[name="aiService"]:checked');
    return selectedRadio ? selectedRadio.value : null;
}

// Obtener texto seleccionado de la pestaña activa
async function getSelectedText(tabId) {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => window.getSelection().toString()
        });
        return (results && results[0] && results[0].result) ? results[0].result.trim() : '';
    } catch (error) {
        console.warn('No se pudo obtener el texto seleccionado:', error.message);
        return '';
    }
}

// Actualizar el campo de texto y el preview con el contexto
async function updateContext() {
    try {
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!currentTab?.url || currentTab.url.startsWith('chrome://')) {
            return;
        }

        const contextPreview = document.getElementById('contextPreview');
        const askInput = document.getElementById('askInput');
        
        // Prioridad 1: Datos del menú contextual
        const contextData = await chrome.storage.local.get(['contextSelection', 'contextUrl', 'contextTimestamp']);
        if (contextData.contextTimestamp && (Date.now() - contextData.contextTimestamp) < 2000) {
            chrome.storage.local.remove(['contextSelection', 'contextUrl', 'contextTimestamp']); // Limpiar
            
            // Marcar automáticamente el checkbox addContext cuando viene del menú contextual
            const addContextCheckbox = document.getElementById('addContext');
            if (addContextCheckbox) {
                addContextCheckbox.checked = true;
            }
            
            if (contextData.contextSelection) {
                // Hay texto seleccionado
                const selection = contextData.contextSelection.trim();
                contextPreview.textContent = selection.substring(0, 200) + (selection.length > 200 ? '...' : '');
                console.log('Contexto (texto seleccionado) cargado desde menú contextual.');
            } else if (contextData.contextUrl) {
                // Solo hay URL (sin texto seleccionado)
                contextPreview.textContent = contextData.contextUrl;
                console.log('Contexto (URL) cargado desde menú contextual.');
            }
            return;
        }
        
        // Prioridad 2: Texto seleccionado en la pestaña activa
        const selection = await getSelectedText(currentTab.id);
        if (selection) {
            contextPreview.textContent = selection.substring(0, 200) + (selection.length > 200 ? '...' : '');
        } else {
            contextPreview.textContent = currentTab.url;
        }
        console.log('Preview de contexto actualizado.');

    } catch (error) {
        console.error('Error actualizando contexto:', error);
    }
}


// Inicialización del popup
document.addEventListener('DOMContentLoaded', async function() {
    await loadUserPreference();
    await updateContext();
    await displayFrequentPrompts();
    
    document.getElementById('askInput').focus();
    
    document.querySelectorAll('input[name="aiService"]').forEach(radio => {
        radio.addEventListener('change', (event) => saveUserPreference(event.target.value));
    });

    document.getElementById('askInput').addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            document.getElementById('yesButton').click();
        }
    });

    document.getElementById('yesButton').addEventListener('click', handleAskButtonClick);
    
    // Event listener para borrar historial
    document.getElementById('clearHistoryButton').addEventListener('click', clearPromptHistory);
    
    // Event listeners para los iconos del header
    document.getElementById('shareIcon').addEventListener('click', () => {
        const subject = 'Medusa - Ask to AI';
        const body = `Hi!👋 

I found a Chrome extension that I think you'll find useful.

It's called Medusa Ask to AI, and it lets you send prompts to ChatGPT, Claude, DeepSeek, Copilot, Gemini, Grok, Meta, Mistral, Google, and Perplexity.
And also you can send the same prompt to all the AIs at once.

🔗 You can install it for free here from the Google Chrome Store: 
https://chromewebstore.google.com/detail/fhmnjlphalkbleldbkomopkofcajinng?utm_source=item-share-cb

--- 

¡Hola!👋 

Encontré una extensión de Chrome que creo que te va a ser útil.

Se llama Medusa Ask to AI y te permite enviar prompts a ChatGPT, Claude, DeepSeek, Copilot, Gemini, Grok, Meta, Mistral, Google y Perplexity.
También puedes enviar un mismo prompt a todas las AI a la vez.

🔗 La puedes instalar gratis aquí desde la Chrome Store de Google:
https://chromewebstore.google.com/detail/fhmnjlphalkbleldbkomopkofcajinng?utm_source=item-share-cb`;
        
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl);
    });
    
    document.getElementById('rateIcon').addEventListener('click', () => {
        chrome.tabs.create({
            url: 'https://chromewebstore.google.com/detail/fhmnjlphalkbleldbkomopkofcajinng?utm_source=item-share-cb'
        });
    });
});


// Solicitar permiso tabs para reutilizar pestañas (solo se pide una vez)
async function requestTabsPermission() {
    try {
        const hasPermission = await chrome.permissions.contains({ permissions: ['tabs'] });
        if (!hasPermission) {
            // Solicitar el permiso al usuario
            const granted = await chrome.permissions.request({ permissions: ['tabs'] });
            console.log(granted ? '✅ Permiso tabs concedido.' : 'ℹ️ Permiso tabs denegado.');
        }
    } catch (e) {
        console.log('ℹ️ No se pudo solicitar permiso tabs:', e.message);
    }
}

// Manejador del botón "ASK"
async function handleAskButtonClick() {
    const button = document.getElementById('yesButton');
    button.disabled = true;

    try {
        const selectedAI = getSelectedAI();
        if (!selectedAI) {
            showNotification('Please select an AI service.', 'warning');
            return;
        }

        let textPrompt = document.getElementById('askInput').value.trim();
        if (!textPrompt) {
            showNotification('Please write a question.', 'warning');
            return;
        }

        // Solicitar permiso tabs (solo la primera vez, para reutilizar pestañas)
        await requestTabsPermission();

        // Si el checkbox addContext está marcado, añadir el contexto al prompt
        const addContextCheckbox = document.getElementById('addContext');
        if (addContextCheckbox && addContextCheckbox.checked) {
            const contextPreview = document.getElementById('contextPreview');
            const contextText = contextPreview?.textContent?.trim();
            
            if (contextText) {
                // Añadir el contexto al final del prompt
                textPrompt = `${textPrompt}\n\n--- Context ---\n${contextText}`;
                console.log('Contexto añadido al prompt.');
            }
        }

        // Guardar el prompt en el historial (sin el contexto para mantener limpio el historial)
        await savePromptUsage(document.getElementById('askInput').value.trim());

        // Enviar la petición al script de fondo (background.js) para que la procese
        console.log(`Enviando petición a background para '${selectedAI}'...`);
        chrome.runtime.sendMessage({
            action: 'sendToAI',
            aiService: selectedAI,
            prompt: textPrompt
        });

        // Limpiar el campo de texto y cerrar el popup
        document.getElementById('askInput').value = '';
        // window.close(); // Opcional: cerrar el popup automáticamente

    } catch (error) {
        console.error('Error in popup:', error);
        showNotification('An error occurred: ' + error.message, 'error');
    } finally {
        button.disabled = false;
    }
}