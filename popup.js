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
        const contextData = await chrome.storage.local.get(['contextSelection', 'contextTimestamp']);
        if (contextData.contextTimestamp && (Date.now() - contextData.contextTimestamp) < 2000) {
            chrome.storage.local.remove(['contextSelection', 'contextTimestamp']); // Limpiar
            if (contextData.contextSelection) {
                const selection = contextData.contextSelection.trim();
                askInput.value = selection;
                contextPreview.textContent = selection.substring(0, 200) + (selection.length > 200 ? '...' : '');
                console.log('Contexto cargado desde menú contextual.');
                return;
            }
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
});


// Manejador del botón "ASK"
async function handleAskButtonClick() {
    const button = this;
    button.disabled = true;

    try {
        const selectedAI = getSelectedAI();
        if (!selectedAI) {
            alert("Por favor, selecciona un servicio de IA.");
            return;
        }

        const textPrompt = document.getElementById('askInput').value.trim();
        if (!textPrompt) {
            alert("Por favor, escribe una pregunta.");
            return;
        }

        // Guardar el prompt en el historial
        await savePromptUsage(textPrompt);

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
        console.error('Error en el popup:', error);
        alert('Se produjo un error: ' + error.message);
    } finally {
        button.disabled = false;
    }
}