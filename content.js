// Content script universal para insertar texto en múltiples sitios web
console.log('🔌 Content script cargado en:', window.location.href);

// OJU
// Función para detectar el tipo de sitio web
function detectarSitio() {
  const hostname = window.location.hostname.toLowerCase();
  
  if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) {
    return 'chatgpt';
  } else if (hostname.includes('gemini.google.com')) {
    return 'gemini';
  } else if (hostname.includes('google.com') && !hostname.includes('mail.google.com')) {
    return 'google';
  } else if (hostname.includes('facebook.com') || hostname.includes('meta.ai')) {
    return 'meta';
  } else if (hostname.includes('wikipedia.org')) {
    return 'wikipedia';
  } else if (hostname.includes('claude.ai') || hostname.includes('anthropic.com')) {
    return 'claude';
  } else if (hostname.includes('copilot.microsoft.com') || hostname.includes('github.com/features/copilot')) {
    return 'copilot';
  } else if (hostname.includes('deepseek.com') || hostname.includes('chat.deepseek.com')) {
    return 'deepseek';
      } else if (hostname.includes('grok.com')) {
    return 'grok';
  } else if (hostname.includes('mistral.ai') || hostname.includes('chat.mistral.ai')) {
    return 'mistral';
  } else if (hostname.includes('perplexity.ai')) {
    return 'perplexity';
  } else if (hostname.includes('mail.google.com') || hostname.includes('gmail.com')) {
    return 'gmail';
  } else {
    return 'generico';
  }
}

// Selectores específicos por sitio web
function obtenerSelectores(sitio) {
  const selectores = {
    chatgpt: {
      input: [
        'textarea[data-id]', 'textarea[id*="prompt"]', '#prompt-textarea',
        'textarea[placeholder*="Message"]', 'textarea[placeholder*="mensaje"]',
        'div[contenteditable="true"][role="textbox"]', 'main textarea', 'form textarea'
      ],
      sendButton: [
        'button[data-testid="send-button"]', 'button[class*="bottom-"] > button', 'form button[type="submit"]'
      ]
    },
    gemini: {
      input: [
        'div[contenteditable="true"][data-placeholder*="Enter a prompt"]', 'div[contenteditable="true"][data-placeholder*="Introduce un mensaje"]',
        'div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"][aria-label*="Message"]',
        'div[contenteditable="true"][aria-label*="Prompt"]', 'textarea[placeholder*="Enter a prompt"]',
        'textarea[placeholder*="Introduce un mensaje"]', 'rich-textarea div[contenteditable="true"]',
        '.ql-editor[contenteditable="true"]', 'div[contenteditable="true"]',
        'textarea[aria-label*="Message"]', 'main textarea', 'form textarea'
      ],
      sendButton: [
        'button.send-button', 'button[aria-label*="Send"]', 'button[aria-label*="Enviar"]', 'button[data-testid="send-button"]'
      ]
    },
    google: {
      input: [
        // Selectors for AI follow-up questions
        'textarea[placeholder*="Pregunta lo que quieras"]',
        'textarea[placeholder*="Ask anything..."]',
        'textarea[aria-label*="Pregunta lo que quieras"]',
        'textarea[aria-label*="Ask anything..."]',
        // Original selectors for standard search
        'input[name="q"]', 'textarea[name="q"]', 'input[title*="Buscar"]',
        'input[title*="Search"]', 'input[role="combobox"]', 'input[type="search"]',
        '#searchboxinput', '.gLFyf'
      ],
      sendButton: [
        // Selector for AI send button
        'button[aria-label*="Send"]', 'button[aria-label*="Enviar"]',
        // Original selectors
        'input[name="btnK"]', 'button[aria-label*="Search"]', 'button[aria-label*="Buscar"]', 'form[role="search"] button'
      ]
    },
    meta: {
      input: [
        // --- Selectores de alta prioridad para Meta AI (meta.ai) ---
        'div[aria-placeholder*="Ask Meta AI"]',
        'div[aria-placeholder*="Pregunta a Meta AI"]',
        'div[aria-label*="Ask Meta AI"]',
        'div[aria-label*="Pregunta a Meta AI"]',
        'div[data-lexical-editor="true"]',
        'div[role="searchbox"]',
        'textarea[placeholder*="Ask me anything"]',
        // --- Selectores para Facebook (facebook.com) ---
        'textarea[placeholder*="What\'s on your mind"]',
        'textarea[placeholder*="¿Qué estás pensando"]',
        'div[data-testid="status-attachment-mentions-input"]',
        // --- Selectores genéricos de respaldo ---
        'div[contenteditable="true"][role="textbox"]',
        '[role="textbox"]',
        'textarea'
      ],
      sendButton: [
        'div[aria-label="Enviar"][role="button"]',
        'div[aria-label="Send"][role="button"]',
        'div[aria-label="Send message"][role="button"]',
        'div[aria-label="Enviar mensaje"][role="button"]',
        'div[role="button"][aria-label*="message"]', // Más genérico para inglés
        'div[role="button"][aria-label*="mensaje"]', // Más genérico para español
        'button[type="submit"]' // Selector de respaldo para botones nativos
      ]
    },
    wikipedia: {
      input: [
        'input[name="search"]', 'input#searchInput', 'input.searchboxInput',
        'textarea[name="wpTextbox1"]', 'input[placeholder*="Search"]',
        'input[placeholder*="Buscar"]', 'textarea', 'input[type="search"]'
      ],
      sendButton: [
        'button[type="submit"]', '#searchform button'
      ]
    },
    claude: {
      input: [
        // Selector específico para el editor de Claude
        'div[data-testid="chat-input"]',
        'div.tiptap.ProseMirror[contenteditable="true"]',
        // Selectores de respaldo
        'textarea[placeholder*="Talk to Claude"]',
        'textarea[placeholder*="Habla con Claude"]',
        'div[contenteditable="true"]',
        '[role="textbox"]',
        'textarea'
      ],
      sendButton: [
        'button[aria-label="Send Message"]', 'button[aria-label="Enviar mensaje"]', 'form button[type="submit"]'
      ]
    },
    copilot: {
      input: [
        'textarea[placeholder*="Ask Copilot"]', 'textarea[placeholder*="Ask me anything"]',
        'div[contenteditable="true"][role="textbox"]', 'textarea[aria-label*="Chat"]',
        'cib-text-input textarea', 'main textarea', '[role="textbox"]', 'textarea'
      ],
      sendButton: [
        // Priorizar el selector más específico proporcionado en el HTML
        'button[data-testid="submit-button"][aria-label="Enviar mensaje"]',
        'button[aria-label="Submit"]', 
        'button[title="Submit"]', 
        '#searchboxform button[type="submit"]'
      ]
    },
    deepseek: {
      input: [
        'textarea[placeholder*="Send a message"]', 'div[contenteditable="true"][role="textbox"]',
        'textarea[data-testid*="chat-input"]', 'main textarea', '[role="textbox"]', 'textarea'
      ],
      sendButton: [
        'div._7436101', // Alta prioridad por tipo de clase. 
        'div[role="button"]:has(div.ds-icon)', // La segunda opción es si tiene un div con ds-icon, pero hay más elementos y puede dar conflicto
        'button[data-testid="submit-button"]',
        'button[class*="absolute"] > svg', 'form button[type="submit"]'
      ]
    },
    grok: {
      input: [
        // Selector específico para el editor Tiptap/ProseMirror de Grok
        'div.tiptap.ProseMirror[contenteditable="true"]',
        // Selectores de respaldo que estaban antes
        'textarea[placeholder*="Ask Grok"]',
        'textarea[placeholder*="¿Qué quieres saber?"]',
        'div[contenteditable="true"][role="textbox"]',
        'textarea[data-testid*="compose"]',
        'main textarea',
        '[role="textbox"]',
        'textarea'
      ],
      sendButton: [
        // Selector de alta prioridad y muy específico basado en el HTML actual.
        'button[aria-label="Submit a query to Grok"]',
        // Selectores de respaldo basados en el tipo y los selectores antiguos.
        'button[type="submit"]',
        'button[data-testid="send-button"]', 'button[aria-label*="Send"]'
      ]
    },
    mistral: {
      input: [
        'textarea[placeholder*="Send a message"]', 'textarea[placeholder*="Message"]', 
        'div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]',
        'textarea[data-testid*="chat-input"]', 'textarea[class*="chat-input"]',
        'div[role="textbox"]', 'textarea[id*="input"]', 'main textarea', 'textarea'
      ],
      sendButton: [
        'button[type="submit"]', 'button[aria-label*="Send"]', 'button[aria-label*="Enviar"]',
        'button[data-testid*="send"]', 'button[class*="send"]', 'button[class*="submit"]',
        'button[class*="absolute"] > svg', 'form button[type="submit"]', 'button > svg'
      ]
    },
    perplexity: {
      input: [
        '#ask-input',
        'div[data-lexical-editor="true"]',
        'div[aria-placeholder*="Pregunta cualquier cosa"]',
        'textarea[placeholder*="Ask anything..."]'
      ],
      sendButton: [
        'button[aria-label="Enviar"]',
        'button[aria-label="Submit"]',
        'button[type="submit"]'
      ]
    },
    gmail: {
      input: [
        'div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"][aria-label*="Message Body"]',
        'div[contenteditable="true"][aria-label*="Cuerpo del mensaje"]', 'div[g_editable="true"]',
        'div.Am.Al.editable', 'div[role="textbox"]', 'textarea'
      ],
      sendButton: [
        'div[role="button"][data-tooltip*="Send"]', 'div[role="button"][data-tooltip*="Enviar"]'
      ]
    },
    generico: {
      input: [
        'textarea:not([disabled])', 'input[type="text"]:not([disabled])',
        'input[type="search"]:not([disabled])', 'div[contenteditable="true"]',
        '[role="textbox"]', 'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
        'textarea'
      ],
      sendButton: [
        'button[type="submit"]', 'button[aria-label*="Send"]', 'button[aria-label*="Enviar"]',
        'button[id*="submit"]', 'input[type="submit"]'
      ]
    }
  };
  
  return selectores[sitio] || selectores.generico;
}

// Función principal para insertar texto
function enviarTextoUniversal(texto, submit = false) {
  const sitio = detectarSitio();
  console.log('🌐 Sitio detectado:', sitio);
  console.log('🎯 Intentando insertar texto:', texto);
  
  // Debug específico para Mistral
  if (sitio === 'mistral') {
    console.log('🔧 DEBUG MISTRAL - URL actual:', window.location.href);
    console.log('🔧 DEBUG MISTRAL - Hostname:', window.location.hostname);
  }
  
  const { input: inputSelectors, sendButton: sendButtonSelectors } = obtenerSelectores(sitio);
  console.log('🔍 Selectores de input a usar:', inputSelectors);
  console.log('🚀 Selectores de botón de envío a usar:', sendButtonSelectors);

  for (let i = 0; i < inputSelectors.length; i++) {
    const selector = inputSelectors[i];
    console.log(`🔍 Probando selector de input ${i + 1}/${inputSelectors.length}: ${selector}`);
    
    try {
      const elemento = document.querySelector(selector);
      
      if (elemento) {
        console.log('🎯 Elemento encontrado:', elemento);
        console.log('👁️ ¿Es visible?', elemento.offsetParent !== null);
        console.log('🚫 ¿Está deshabilitado?', elemento.disabled);
        console.log('📝 Tipo de elemento:', elemento.tagName);
        console.log('✏️ ¿Es contenteditable?', elemento.contentEditable);
        
        if (elemento.offsetParent !== null && !elemento.disabled) {
          console.log(`✅ Elemento válido encontrado con selector: ${selector}`);
          
          try {
            // Enfocar el elemento
            console.log('🎯 Enfocando elemento...');
            elemento.focus();
            elemento.click();
            
            // Limpiar contenido existente
            if (elemento.tagName === 'TEXTAREA' || elemento.tagName === 'INPUT') {
              elemento.value = '';
            } else if (elemento.contentEditable === 'true') {
              elemento.textContent = '';
              elemento.innerHTML = '';
            }
            
            // Pausa para que el sitio se prepare y el DOM se estabilice
            setTimeout(() => {
              // Insertar el texto
              if (elemento.tagName === 'TEXTAREA' || elemento.tagName === 'INPUT') {
                console.log('📝 Insertando en TEXTAREA/INPUT...');
                elemento.value = texto;
                elemento.dispatchEvent(new Event('input', { bubbles: true }));
                elemento.dispatchEvent(new Event('change', { bubbles: true }));
                elemento.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
              } else if (elemento.contentEditable === 'true') {
                console.log('📝 Insertando en elemento contentEditable...');
                
                // Para Gemini y otros editores rich text
                if (sitio === 'perplexity') {
                  // Perplexity usa un editor Lexical que es complejo. La mejor manera de insertar
                  // texto es simular un evento de "pegado" (paste).
                  console.log('🔧 Usando método de inserción por "pegado" para Perplexity...');
                  
                  // 1. Enfocar el elemento para que sea el objetivo de los eventos.
                  elemento.focus();
                  
                  // 2. Crear un objeto DataTransfer para contener el texto.
                  const dataTransfer = new DataTransfer();
                  dataTransfer.setData('text/plain', texto);

                  // 3. Crear un evento de pegado (ClipboardEvent).
                  const pasteEvent = new ClipboardEvent('paste', {
                      clipboardData: dataTransfer,
                      bubbles: true,
                      cancelable: true
                  });

                  // 4. Despachar el evento en el elemento. El editor debería manejarlo.
                  elemento.dispatchEvent(pasteEvent);

                } else if (sitio === 'gemini' || sitio === 'claude') {
                  // Método específico y simplificado para Gemini y Claude
                  // 1. Limpiar el campo
                  elemento.textContent = '';
                  elemento.innerHTML = '';
                  // 2. Asignar el texto directamente
                  elemento.textContent = texto;
                  // 3. Disparar el evento 'input' que React escucha
                  const inputEvent = new Event('input', {
                    bubbles: true,
                    cancelable: true,
                  });
                  elemento.dispatchEvent(inputEvent);
                } else {
                  // Método estándar para otros sitios
                  elemento.textContent = texto;
                  elemento.innerHTML = texto;
                  elemento.dispatchEvent(new Event('input', { bubbles: true }));
                  elemento.dispatchEvent(new Event('keyup', { bubbles: true }));
                  elemento.dispatchEvent(new InputEvent('input', {
                    bubbles: true,
                    cancelable: true,
                    inputType: 'insertText',
                    data: texto
                  }));
                }
              }
              
              // Eventos adicionales que algunos sitios necesitan
              elemento.dispatchEvent(new Event('focus', { bubbles: true }));
              elemento.dispatchEvent(new Event('blur', { bubbles: true }));
              elemento.focus(); // Volver a enfocar

              console.log('✅ Texto insertado correctamente');

              // Si se solicitó, intentar hacer clic en el botón de enviar
              if (submit) {
                console.log('🚀 Intentando enviar el prompt...');
                // Pequeña pausa para que la UI (ej. el botón) se actualice y se habilite
                setTimeout(() => {
                  for (const btnSelector of sendButtonSelectors) {
                    const sendButton = document.querySelector(btnSelector);
                    // Comprobación robusta: funciona para <button> (propiedad .disabled) y para <div> (atributo aria-disabled)
                    const isDisabled = sendButton?.disabled || sendButton?.getAttribute('aria-disabled') === 'true';

                    if (sendButton && !isDisabled) {
                      console.log(`✅ Botón de envío encontrado y habilitado con selector: ${btnSelector}`);
                      sendButton.click();
                      console.log('🎉 ¡Prompt enviado!');
                      return; // Salir del bucle de botones
                    } else {
                      console.log(`❌ Botón no encontrado o deshabilitado con selector: ${btnSelector}`);
                    }
                  }
                  console.error('❌ No se pudo encontrar un botón de envío válido.');
                }, 750); // 750ms de espera es un valor más seguro
              }

            }, 500); // Increased from 100 to 500
            
            return true;
            
          } catch (error) {
            console.log(`❌ Error insertando con selector ${selector}:`, error);
          }
        } else {
          console.log(`⚠️ Elemento encontrado pero no es válido (oculto o deshabilitado)`);
        }
      } else {
        console.log(`❌ No se encontró elemento con selector: ${selector}`);
      }
    } catch (error) {
      console.log(`💥 Error con selector ${selector}:`, error);
    }
  }
  
  console.log('❌ No se encontró ningún campo de texto válido');
  
  // Información de depuración adicional
  console.log('🔍 Información de depuración:');
  console.log('- Sitio detectado:', sitio);
  console.log('- Todos los textareas:', document.querySelectorAll('textarea'));
  console.log('- Todos los inputs de texto:', document.querySelectorAll('input[type="text"], input[type="search"]'));
  console.log('- Elementos contenteditable:', document.querySelectorAll('[contenteditable="true"]'));
  console.log('- Elementos con role="textbox":', document.querySelectorAll('[role="textbox"]'));
  console.log('- URL actual:', window.location.href);
  
  // Debug específico para Mistral
  if (sitio === 'mistral') {
    console.log('🔧 Debug específico para Mistral:');
    console.log('- Elementos con placeholder que contenga "message":', document.querySelectorAll('[placeholder*="message" i]'));
    console.log('- Botones con type="submit":', document.querySelectorAll('button[type="submit"]'));
    console.log('- Botones con aria-label que contenga "send":', document.querySelectorAll('button[aria-label*="send" i]'));
    console.log('- Todos los botones:', document.querySelectorAll('button'));
  }
  
  return false;
}

// Escuchar mensajes del background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Mensaje recibido:', request);
  
  if (request.action === 'insertarTexto') {
    const exito = enviarTextoUniversal(request.texto, request.submit);
    const response = {
      success: exito,
      error: exito ? null : 'No se encontró ningún campo de texto válido o el campo no estaba listo',
      site: detectarSitio(),
      url: window.location.href
    };
    console.log('📤 Enviando respuesta:', { success: exito });
    sendResponse({ success: exito });
  } else if (request.action === 'getSelectedText') {
    // Obtener el texto seleccionado actual de la página
    try {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const selectedText = selection.toString().trim();
        sendResponse({ selectedText: selectedText || '' });
      } else {
        sendResponse({ selectedText: '' });
      }
    } catch (error) {
      console.error('Error al obtener texto seleccionado:', error);
      sendResponse({ selectedText: '' });
    }
  }
  
  return true; // Importante: mantener el canal abierto para respuesta asíncrona
});
