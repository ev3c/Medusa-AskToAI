// Content script universal para insertar texto en múltiples sitios web
console.log('🔌 Content script cargado en:', window.location.href);

// Función helper para crear pausas
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Función para detectar el tipo de sitio web
function detectarSitio() {
  const hostname = window.location.hostname.toLowerCase();
  
  if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) {
    return 'chatgpt';
  } else if (hostname.includes('gemini.google.com')) {
    return 'gemini';
  } else if (hostname.includes('meta.ai')) {
    return 'meta';
  } else if (hostname.includes('claude.ai')) {
    return 'claude';
  } else if (hostname.includes('copilot.microsoft.com')) {
    return 'copilot';
  } else if (hostname.includes('deepseek.com') || hostname.includes('chat.deepseek.com')) {
    return 'deepseek';
  } else if (hostname.includes('grok.com') || hostname.includes('x.ai')) {
    return 'grok';
  } else if (hostname.includes('mistral.ai') || hostname.includes('chat.mistral.ai')) {
    return 'mistral';
  } else if (hostname.includes('perplexity.ai')) {
    return 'perplexity';
  } else {
    return 'generico';
  }
}

// Selectores específicos por sitio web
function obtenerSelectores(sitio) {
    const selectores = {
    chatgpt: [
      'textarea[data-id]',
      'textarea[id*="prompt"]',
      '#prompt-textarea',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="mensaje"]',
      'div[contenteditable="true"][role="textbox"]',
      'main textarea',
      'form textarea'
    ],
    gemini: [
      'div[contenteditable="true"][data-placeholder*="Enter a prompt"]',
      'div[contenteditable="true"][data-placeholder*="Introduce un mensaje"]',
      'div[contenteditable="true"][role="textbox"]',
      'rich-textarea div[contenteditable="true"]',
      '.ql-editor[contenteditable="true"]'
    ],
    google: [ 'input[name="q"]', 'textarea[name="q"]', '#searchboxinput', '.gLFyf' ],
    meta: [ 'div[contenteditable="true"][role="textbox"]', 'textarea[placeholder*="What\'s on your mind"]' ],
    wikipedia: [ 'input[name="search"]', 'input#searchInput' ],
    claude: [ 'div[contenteditable="true"][role="textbox"]', 'textarea[placeholder*="Talk to Claude"]' ],
    copilot: [ 'cib-text-input textarea', 'textarea[placeholder*="Ask me anything"]' ],
    deepseek: [ 'textarea[placeholder*="Send a message"]', 'div[contenteditable="true"][role="textbox"]' ],
    grok: [ 'textarea[data-testid*="compose"]', 'div[contenteditable="true"][role="textbox"]' ],
    mistral: [ 'textarea[placeholder*="Send a message"]', 'div[contenteditable="true"][role="textbox"]' ],
    perplexity: [ 'textarea[class*="TextareaAutosize"]', 'textarea[placeholder*="Ask anything"]' ],
    generico: [
      'textarea:not([disabled])',
      'input[type="text"]:not([disabled])',
      'input[type="search"]:not([disabled])',
      'div[contenteditable="true"]',
      '[role="textbox"]'
    ]
  };
  
  return selectores[sitio] || selectores.generico;
}

// Función principal (ahora asíncrona) para insertar texto
async function enviarTextoUniversal(texto) {
  const sitio = detectarSitio();
  console.log('🌐 Sitio detectado:', sitio);
  const selectores = obtenerSelectores(sitio);
  console.log('🔍 Selectores a usar:', selectores);

  for (const selector of selectores) {
    const elemento = document.querySelector(selector);
    
    if (elemento && elemento.offsetParent !== null && !elemento.disabled) {
      console.log(`✅ Elemento válido encontrado con selector: ${selector}`);
      
      try {
        elemento.focus();
        elemento.click();

        if (elemento.tagName === 'TEXTAREA' || elemento.tagName === 'INPUT') {
          elemento.value = '';
        } else if (elemento.contentEditable === 'true') {
          elemento.textContent = '';
        }

        await delay(100);

        if (elemento.tagName === 'TEXTAREA' || elemento.tagName === 'INPUT') {
          elemento.value = texto;
        } else {
          elemento.textContent = texto;
        }
        
        elemento.dispatchEvent(new Event('input', { bubbles: true }));
        elemento.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('✅ Texto insertado correctamente');

        await delay(1500);

        console.log('⏎ Presionando ENTER o buscando botón de envío...');
        
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });
        elemento.dispatchEvent(enterEvent);
        
        const botonesEnvio = [
            'button[type="submit"]',
            'button[data-testid*="send"]',
            'button[aria-label*="Send"]', 'button[aria-label*="Enviar"]',
            'button:has(svg[data-icon="send"])'
        ];

        for (const selBoton of botonesEnvio) {
            const boton = document.querySelector(selBoton);
            if (boton && !boton.disabled && boton.offsetParent !== null) {
                console.log('🔘 Botón de envío encontrado, haciendo clic...');
                boton.click();
                break;
            }
        }

        console.log('✅ Proceso de envío completado en content script.');
        return true; // Indicar éxito

      } catch (error) {
        console.error(`❌ Error durante la inserción/envío con el selector ${selector}:`, error);
        continue; // Probar el siguiente selector
      }
    }
  }
  
  console.log('❌ No se encontró ningún campo de texto válido en la página.');
  return false; // Indicar fallo
}

// Escuchar mensajes del background script de forma asíncrona
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Mensaje recibido:', request);
  
  if (request.action === 'insertarTexto') {
    // La función ahora devuelve una promesa, la encadenamos con .then()
    enviarTextoUniversal(request.texto)
      .then(exito => {
        console.log(`📤 Enviando respuesta al background: ${exito}`);
        sendResponse({ success: exito });
      })
      .catch(error => {
        console.error('Error en enviarTextoUniversal:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Devolver true es CRÍTICO para indicar que sendResponse se llamará de forma asíncrona
    return true; 
  }
  
  if (request.action === 'getSelection') {
    const selectedText = window.getSelection().toString();
    sendResponse(selectedText);
  }
});