// URLs de los servicios de IA
const AI_URLS = {
    chatgpt: 'https://chat.openai.com',
    claude: 'https://claude.ai',
    deepseek: 'https://chat.deepseek.com',
    copilot: 'https://copilot.microsoft.com',
    gemini: 'https://gemini.google.com',
    grok: 'https://x.ai', // Corregido: La ruta no debe estar en la URL base
    meta: 'https://meta.ai',
    mistral: 'https://chat.mistral.ai',
    google: 'https://www.google.com',
    perplexity: 'https://www.perplexity.ai'
};

// Script de fondo que maneja la extensión

// Función para actualizar el menú contextual con la URL actual
function updateContextMenu(url) {
  if (url) {
    chrome.contextMenus.update('askToAIPage', {
      title: `Ask To AI: ${url}`
    });
  }
}

// Función que se ejecuta cuando se instala la extensión
chrome.runtime.onInstalled.addListener(() => {
  console.log('🚀 Extensión Ask to AI instalada correctamente');
  
  // Menú contextual en el icono de la extensión
  chrome.contextMenus.create({
    id: 'Share',
    title: '🚀 Share',
    contexts: ['action']
  });
  
  chrome.contextMenus.create({
    id: 'Rate',
    title: '⭐ Rate',
    contexts: ['action']
  });
  
  // Menú contextual en las páginas web cuando hay texto seleccionado
  chrome.contextMenus.create({
    id: 'askToAISelection',
    title: 'Ask To AI: "%s"',
    contexts: ['selection']
  });
  
  // Menú contextual en las páginas web cuando NO hay texto seleccionado
  chrome.contextMenus.create({
    id: 'askToAIPage',
    title: 'Ask To AI: (Current page URL)',
    contexts: ['page']
  });
});

// Actualizar el menú contextual cuando cambia la pestaña activa
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      updateContextMenu(tab.url);
    }
  });
});

// Actualizar el menú contextual cuando se actualiza una pestaña
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id === tabId) {
        updateContextMenu(changeInfo.url);
      }
    });
  }
});

// Manejar clicks en el menú contextual
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'share') {
    // Abrir página para compartir la extensión
    chrome.tabs.create({
      url: 'https://github.com/yourusername/ask-to-ai'  // Cambia esto por tu URL
    });
  } else if (info.menuItemId === 'rate') {
    // Abrir página de Chrome Web Store para calificar
    chrome.tabs.create({
      url: 'https://chrome.google.com/webstore/detail/your-extension-id'  // Cambia esto por tu URL
    });
  } else if (info.menuItemId === 'askToAISelection') {
    // Guardar el texto seleccionado y la URL para usarlo en el popup
    chrome.storage.local.set({
      contextSelection: info.selectionText,
      contextUrl: tab.url,
      contextTimestamp: Date.now()
    }, () => {
      // Abrir el popup (esto abrirá la extensión)
      chrome.action.openPopup();
    });
  } else if (info.menuItemId === 'askToAIPage') {
    // Guardar la URL para usarla en el popup
    chrome.storage.local.set({
      contextSelection: null,
      contextUrl: tab.url,
      contextTimestamp: Date.now()
    }, () => {
      // Abrir el popup
      chrome.action.openPopup();
    });
  }
});


// =================================================================================
// NUEVA LÓGICA DE ORQUESTACIÓN
// =================================================================================

// Listener para mensajes desde el popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendToAI') {
        if (request.aiService === 'allAI') {
            console.log('Recibida petición para enviar a All AI.');
            sendToAllAIs(request.prompt);
        } else {
            console.log(`Recibida petición para enviar a ${request.aiService}`);
            sendPromptToAI(request.aiService, request.prompt);
        }
        // Devolver true indica que la respuesta se enviará de forma asíncrona.
        return true;
    }
});

/**
 * Envía un prompt a todos los servicios de IA de forma secuencial.
 * @param {string} prompt - El texto a enviar.
 */
async function sendToAllAIs(prompt) {
    console.log('Iniciando envío de prompt a todas las IAs...');
    // Se excluye 'google' ya que no es una IA conversacional del mismo tipo.
    const aiServices = Object.keys(AI_URLS).filter(key => key !== 'google');
    
    for (const aiService of aiServices) {
        console.log(`--- Procesando ${aiService} ---`);
        await sendPromptToAI(aiService, prompt);
    }
    console.log('--- Envío a todas las IAs completado ---');
}

/**
 * Orquestador principal: busca o crea una pestaña y le envía el prompt.
 * @param {string} aiService - El nombre del servicio (ej. 'chatgpt').
 * @param {string} prompt - El texto a enviar.
 */
async function sendPromptToAI(aiService, prompt) {
    try {
        const { tab, isNew } = await findOrCreateTab(aiService);
        console.log(`Pestaña para ${aiService} gestionada (es nueva: ${isNew}):`, tab);

        // Esperar a que la pestaña esté completamente cargada antes de continuar.
        await waitForTabLoad(tab);

        // Inyectar el script de contenido y enviarle el mensaje con el prompt.
        await injectAndSendMessage(tab.id, prompt, isNew);

    } catch (error) {
        console.error(`Error procesando la petición para ${aiService}:`, error);
    }
}

/**
 * Busca una pestaña existente para el servicio de IA o crea una nueva.
 * @param {string} aiService - El nombre del servicio.
 * @returns {Promise<{tab: chrome.tabs.Tab, isNew: boolean}>} Un objeto con la pestaña y un booleano que indica si es nueva.
 */
async function findOrCreateTab(aiService) {
    const url = AI_URLS[aiService];
    if (!url) throw new Error(`URL no encontrada para el servicio: ${aiService}`);

    let urlPatterns = [`${url}/*`];
    if (aiService === 'chatgpt') {
        urlPatterns.push('https://chatgpt.com/*');
    }
    
    console.log(`[Medusa-AskToAI] Buscando pestaña con patrones:`, urlPatterns);

    try {
        const tabs = await chrome.tabs.query({ url: urlPatterns });
        console.log(`[Medusa-AskToAI] Pestañas encontradas:`, tabs);

        if (tabs.length > 0) {
            const targetTab = tabs[0];
            console.log(`[Medusa-AskToAI] Pestaña EXISTENTE encontrada para ${aiService}`);
            await chrome.tabs.update(targetTab.id, { active: true });
            return { tab: targetTab, isNew: false };
        } else {
            console.log(`[Medusa-AskToAI] No se encontró pestaña para ${aiService}. Creando una NUEVA.`);
            const newTab = await chrome.tabs.create({ url: url, active: true });
            return { tab: newTab, isNew: true };
        }
    } catch (error) {
        console.error(`[Medusa-AskToAI] Error en findOrCreateTab para "${aiService}":`, error);
        console.log(`[Medusa-AskToAI] Fallback: Creando una NUEVA pestaña debido a error.`);
        const newTab = await chrome.tabs.create({ url: url, active: true });
        return { tab: newTab, isNew: true };
    }
}

/**
 * Espera a que una pestaña termine de cargar.
 * @param {chrome.tabs.Tab} tab - La pestaña a observar.
 */
async function waitForTabLoad(tab) {
    // Si la pestaña ya está cargada, no hay nada que hacer.
    if (tab.status === 'complete') {
        return;
    }

    return new Promise(resolve => {
        const listener = (tabId, changeInfo, updatedTab) => {
            // Escuchar hasta que la pestaña correcta esté 'complete'.
            if (tabId === tab.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    });
}

/**
 * Inyecta el content script si es necesario y envía el mensaje con el prompt.
 * @param {number} tabId - El ID de la pestaña de destino.
 * @param {string} prompt - El texto a enviar.
 * @param {boolean} isNew - True si la pestaña es nueva.
 */
async function injectAndSendMessage(tabId, prompt, isNew) {
    // Si la pestaña es nueva, necesita más tiempo para cargar todos los scripts (React, etc.)
    // Si ya existía, es probable que esté lista, por lo que la espera es mucho menor.
    const waitTime = isNew ? 5000 : 500; // 5s para pestañas nuevas, 0.5s para existentes
    console.log(`La pestaña es ${isNew ? 'NUEVA' : 'EXISTENTE'}. Esperando ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    try {
        // Primer intento: enviar el mensaje directamente.
        await chrome.tabs.sendMessage(tabId, { action: 'insertarTexto', texto: prompt });
        console.log(`Prompt enviado a la pestaña ${tabId} exitosamente.`);
    } catch (error) {
        console.warn(`Fallo al enviar mensaje a la pestaña ${tabId}. Inyectando script y reintentando...`, error.message);
        
        // Si falla, es probable que el script no esté inyectado (ej. en una pestaña recién creada).
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js'],
        });
        
        // Esperar un momento para asegurar que el script se cargue antes de reintentar.
        await new Promise(resolve => setTimeout(resolve, 500)); 

        // Segundo intento: enviar el mensaje de nuevo.
        await chrome.tabs.sendMessage(tabId, { action: 'insertarTexto', texto: prompt });
        console.log(`Prompt enviado a la pestaña ${tabId} exitosamente en el segundo intento.`);
    }
}