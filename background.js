// URLs de los servicios de IA - ESTA SECCIÓN SERÁ REEMPLAZADA
// const AI_URLS = { ... };

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
// NUEVA LÓGICA DE ORQUESTACIÓN (REPLICADA DE AI-PROMPT-ASSISTANT)
// =================================================================================

let motorDataCache = null;

async function getMotorData() {
  if (motorDataCache) {
    return motorDataCache;
  }
  try {
    const response = await fetch(chrome.runtime.getURL('motorAI.json'));
    const data = await response.json();
    motorDataCache = data.motoresIA;
    return motorDataCache;
  } catch (error) {
    console.error('Error loading motorAI.json:', error);
    return [];
  }
}

async function getAIConfig(aiId) {
    const motors = await getMotorData();
    return motors.find(m => m.id === aiId);
}


/**
 * Busca o abre la pestaña de la IA y envía el prompt usando content script.
 */
async function openAIWithPrompt(prompt, aiModel, submit = true) {
  
  // Helper para esperar a que una pestaña cargue o recargue completamente
  const waitForTabLoad = (tabId) => {
    return new Promise(resolve => {
      const listener = (tabIdUpdated, info) => {
        if (tabIdUpdated === tabId && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  };

  // Helper para procesar una IA: la busca, la activa, la recarga (si es nueva) y le envía el prompt
  const processAI = async (ai) => {
    const aiConfig = await getAIConfig(ai);
    if (!aiConfig) {
      console.error(`Configuración para ${ai} no encontrada.`);
      return;
    }

    const allTabs = await chrome.tabs.query({});

    // Lógica mejorada para encontrar una pestaña existente
    let targetTab = allTabs.find(tab => {
    if (!tab.url) return false;
      try {
        const tabHostname = new URL(tab.url).hostname.toLowerCase();
        if (ai === 'meta') return tabHostname.includes('meta.ai');
        if (ai === 'google') return tabHostname.includes('google.com') && !tabHostname.includes('mail.google.com');

        const web1Hostname = new URL(aiConfig.web).hostname.toLowerCase().replace('www.', '');
        let matches = tabHostname.includes(web1Hostname);
        if (aiConfig.web2) {
          const web2Hostname = new URL(aiConfig.web2).hostname.toLowerCase().replace('www.', '');
          matches = matches || tabHostname.includes(web2Hostname);
        }
        return matches;
      } catch (e) {
        return false; // URL inválida en la pestaña
      }
    });

    let tabToUse;
    if (targetTab) {
      console.log(`✅ Pestaña existente encontrada para ${ai}:`, targetTab.id);
      tabToUse = targetTab;
      // Solo activar, no recargar para preservar la conversación
      await chrome.tabs.update(tabToUse.id, { active: true });
      console.log(`➡️ Pestaña ${ai} activada sin recargar.`);
    } else {
      console.log(`❌ No se encontró pestaña para ${ai}, creando nueva.`);
      tabToUse = await chrome.tabs.create({ url: aiConfig.web, active: false });
      await waitForTabLoad(tabToUse.id);
      console.log(`✅ Pestaña nueva ${ai} cargada.`);
      
      // Activar y recargar la pestaña NUEVA
      await chrome.tabs.update(tabToUse.id, { active: true });
      console.log(`🔄 Recargando pestaña nueva ${ai}...`);
      await chrome.tabs.reload(tabToUse.id);
      await waitForTabLoad(tabToUse.id);
      console.log(`✅ Pestaña ${ai} recargada.`);
    }

    // Enviar el prompt con el tiempo de espera específico de la IA.
    await sendPromptToTab(tabToUse.id, prompt, ai, submit);
  };

  // Lógica principal: procesar todas las IAs o solo una.
  if (aiModel === 'allai' || aiModel === 'allAI') { // Soporta ambas capitalizaciones
    console.log('🤖 Procesando All AI en el orden especificado...');
    const allMotors = await getMotorData();
    const supportedAIs = allMotors
      .filter(m => m.orden) // Filtrar solo los que tienen la propiedad 'orden'
      .sort((a, b) => a.orden - b.orden) // Ordenar por 'orden'
      .map(m => m.id); // Obtener solo los IDs

    console.log('📋 Orden de IAs a procesar:', supportedAIs);

    for (const ai of supportedAIs) {
      try {
        await processAI(ai, submit);
      } catch (error) {
        console.error(`Error procesando ${ai}:`, error);
      }
    }
  } else {
    // Procesar una única IA
    try {
      await processAI(aiModel, submit);
    } catch (error)
    {
      console.error(`Error procesando ${aiModel}:`, error);
    }
  }
}

/**
 * Envía el prompt al content script de la pestaña, respetando los tiempos de espera.
 */
async function sendPromptToTab(tabId, prompt, aiModel, submit = true) {
  const aiConfig = await getAIConfig(aiModel);
  // Valor por defecto de 1.5 segundos si no se especifica.
  let delay = 1500; 

  if (aiConfig && aiConfig.segundos) {
    // Si hay un valor específico en motorAI.json, lo usamos (convertido a ms).
    delay = aiConfig.segundos * 1000;
    console.log(`⏳ Usando delay específico para ${aiModel}: ${delay}ms`);
  } else {
    console.log(`⏳ Usando delay por defecto para ${aiModel || 'AI desconocida'}: ${delay}ms`);
  }

  // Asegurarse de que el content script esté inyectado y listo.
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js'] // ADAPTADO para Medusa-AskToAI
    });
    console.log(`✅ Content script 'content.js' inyectado/asegurado en la pestaña ${tabId}`);
  } catch (e) {
    // No fallar si el script ya estaba inyectado.
    if (!e.message.includes('previously injected')) {
        console.error(`❌ Error al inyectar el content script en la pestaña ${tabId}:`, e);
        return; // No podemos enviar el mensaje si el script no se inyectó
    } else {
        console.log(`ℹ️ El content script ya estaba inyectado en la pestaña ${tabId}.`);
    }
  }

  // Espera el tiempo configurado para asegurar que el content script está listo.
  await new Promise(resolve => setTimeout(resolve, delay));
  
  console.log(`💬 Inyectando prompt en la pestaña ${tabId} para ${aiModel}`);
  chrome.tabs.sendMessage(tabId, {
    action: 'insertarTexto',
    texto: prompt,
    submit: submit
  });
}


// Listener para mensajes desde el popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendToAI') {
        const aiModel = request.aiService;
        const prompt = request.prompt;
        
        console.log(`Recibida petición para enviar a ${aiModel}`);
        openAIWithPrompt(prompt, aiModel, true);

        sendResponse({success: true});
        return true; // para respuesta asíncrona
    }
});