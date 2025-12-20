/**
 * UI Module - Gestión de interfaz de usuario
 * Maneja modales, menús y barra flotante
 */

import { clearTokens } from './auth.js';

/**
 * Inicializa todos los elementos de UI
 */
export function initUI() {
  console.log('[UI] Inicializando módulo de UI...');
  initMenu();
  initModals();
  initFloatingSidebar();
  initChatInput(); // Inicializar event listeners del chat
  console.log('[UI] Módulo UI inicializado correctamente');
}

/**
 * Inicializa el menú de usuario
 */
function initMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const userMenu = document.getElementById('userMenu');
  const logoutBtn = document.getElementById('logoutBtn');
  const userName = document.getElementById('userName');

  console.log('initMenu - Elementos encontrados:', {
    menuToggle: !!menuToggle,
    userMenu: !!userMenu,
    logoutBtn: !!logoutBtn,
    userName: !!userName
  });

  if (!menuToggle || !userMenu || !logoutBtn) {
    console.warn('initMenu - Faltan elementos del menú');
    return;
  }

  // Mostrar nombre de usuario desde localStorage
  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  if (user.username) {
    userName.textContent = user.username;
  } else {
    userName.textContent = 'Usuario';
  }

  console.log('initMenu - Usuario cargado:', user.username || 'Sin usuario');

  // Toggle del menú
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = userMenu.style.display === 'block';
    userMenu.style.display = isVisible ? 'none' : 'block';
    menuToggle.classList.toggle('active', !isVisible);
    console.log('Menu toggle - visible:', !isVisible);
  });

  // Cerrar menú al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!menuToggle.contains(e.target) && !userMenu.contains(e.target)) {
      userMenu.style.display = 'none';
      menuToggle.classList.remove('active');
    }
  });

  // Logout
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Logout clicked');
    clearTokens();
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  });
}

/**
 * Inicializa todos los modales
 */
function initModals() {
  const modals = {
    news: document.getElementById('newsModal'),
    chat: document.getElementById('chatModal')
  };

  // Cerrar modal al hacer clic en el botón de cerrar
  Object.values(modals).forEach(modal => {
    if (!modal) return;

    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeModal(modal));
    }

    // Cerrar modal al hacer clic fuera del contenido
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // Tecla ESC cierra cualquier modal abierto
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      Object.values(modals).forEach(modal => {
        if (modal && modal.classList.contains('active')) {
          closeModal(modal);
        }
      });
    }
  });
}

/**
 * Inicializa la barra flotante
 */
function initFloatingSidebar() {
  const sidebar = document.getElementById('floatingSidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarContent = document.getElementById('sidebarContent');
  const newsBtn = document.getElementById('newsBtn');
  const chatBtn = document.getElementById('chatBtn');
  const openLeaderboardBtn = document.getElementById('openLeaderboardBtn');
  const openTimerBtn = document.getElementById('openTimerBtn');

  console.log('initFloatingSidebar - Elementos encontrados:', {
    sidebar: !!sidebar,
    sidebarToggle: !!sidebarToggle,
    newsBtn: !!newsBtn,
    chatBtn: !!chatBtn,
    openLeaderboardBtn: !!openLeaderboardBtn,
    openTimerBtn: !!openTimerBtn
  });

  // Toggle de la barra flotante
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      console.log('Sidebar toggle - active:', sidebar.classList.contains('active'));
    });
    // Iniciar expandido
    sidebar.classList.add('active');
  }

  if (newsBtn) {
    newsBtn.addEventListener('click', () => {
      console.log('News button clicked');
      openModal('newsModal');
    });
  }

  if (chatBtn) {
    chatBtn.addEventListener('click', () => {
      console.log('Chat button clicked');
      openModal('chatModal');
    });
  }

  // Botón para abrir overlay de leaderboard
  if (openLeaderboardBtn) {
    openLeaderboardBtn.addEventListener('click', () => {
      console.log('Open leaderboard overlay');
      const overlayUrl = `${window.location.origin}/overlay.html`;
      window.open(overlayUrl, '_blank', 'width=500,height=600');
    });
  }

  // Botón para abrir overlay de timer
  if (openTimerBtn) {
    openTimerBtn.addEventListener('click', () => {
      console.log('Open timer overlay');
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
      
      // Asegurar que los tokens estén disponibles en localStorage para el overlay
      if (token) localStorage.setItem('accessToken', token);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      
      const timerUrl = `${window.location.origin}/overlay-timer.html${token ? '?token=' + encodeURIComponent(token) : ''}`;
      window.open(timerUrl, '_blank', 'width=800,height=400');
    });
  }
}

/**
 * Abre un modal por su ID
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Cargar contenido específico del modal
  if (modalId === 'newsModal') {
    loadNews();
  } else if (modalId === 'chatModal') {
    loadChat();
  }
}

/**
 * Cierra un modal
 */
function closeModal(modal) {
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

/**
 * Carga las noticias
 */
async function loadNews() {
  const newsList = document.getElementById('newsList');
  const newsLoading = document.getElementById('newsLoading');
  const newsEmpty = document.getElementById('newsEmpty');

  if (!newsList) {
    console.warn('loadNews: newsList element not found');
    return;
  }

  // Verificar que todos los elementos necesarios existan
  if (newsLoading) {
    newsLoading.style.display = 'block';
  }
  if (newsEmpty) {
    newsEmpty.style.display = 'none';
  }
  newsList.innerHTML = '';

  try {
    const response = await fetch('/api/news');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const news = await response.json();

    if (newsLoading) {
      newsLoading.style.display = 'none';
    }

    if (!news || news.length === 0) {
      if (newsEmpty) {
        newsEmpty.style.display = 'block';
      }
      return;
    }

    news.forEach(item => {
      const newsItem = createNewsItem(item);
      newsList.appendChild(newsItem);
    });
  } catch (error) {
    console.error('Error loading news:', error);
    
    if (newsLoading) {
      newsLoading.style.display = 'none';
    }
    if (newsEmpty) {
      newsEmpty.textContent = 'Error al cargar las novedades';
      newsEmpty.style.display = 'block';
    }
  }
}

/**
 * Crea un elemento de noticia
 */
function createNewsItem(news) {
  const div = document.createElement('div');
  div.className = 'news-item';

  const date = new Date(news.created_at).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Formatear URL de imagen correctamente
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // Si ya es una URL completa, usarla como está
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // Si empieza con /uploads, usarla directamente
    if (imageUrl.startsWith('/uploads')) {
      return imageUrl;
    }
    
    // Si empieza con uploads (sin /), agregar la /
    if (imageUrl.startsWith('uploads')) {
      return '/' + imageUrl;
    }
    
    // Para cualquier otro caso, asumir que es un path relativo
    return '/uploads/news/' + imageUrl;
  };

  const imageUrl = getImageUrl(news.image_url);
  
  div.innerHTML = `
    <div class="news-item-header">
      <h3 class="news-item-title">${escapeHtml(news.title)}</h3>
      <span class="news-item-date">${date}</span>
    </div>
    <p class="news-item-content">${escapeHtml(news.content)}</p>
    ${imageUrl ? `
      <div class="news-item-image-container">
        <img src="${imageUrl}" 
             class="news-item-image" 
             alt="${escapeHtml(news.title)}"
             onerror="handleImageError(this, '${imageUrl}');"
             onload="console.log('Image loaded successfully:', '${imageUrl}');">
      </div>
    ` : ''}
  `;

  return div;
}

/**
 * Maneja errores de carga de imagen
 */
window.handleImageError = function(img, originalUrl) {
  console.error('Failed to load image:', originalUrl);
  
  // Intentar diferentes variantes de URL
  const alternatives = [
    originalUrl.replace('/uploads/', '/uploads/news/'),
    originalUrl.replace('/uploads/news/', '/uploads/'),
    originalUrl.startsWith('/') ? originalUrl : '/' + originalUrl
  ];
  
  // Si ya intentamos todas las alternativas, ocultar imagen
  if (img.dataset.attempts) {
    const attempts = parseInt(img.dataset.attempts);
    if (attempts >= alternatives.length) {
      img.style.display = 'none';
      
      // Mostrar mensaje de error más amigable
      const container = img.parentElement;
      if (container) {
        container.innerHTML = `
          <div style="padding: 20px; background: rgba(255,71,87,0.1); border-radius: 8px; text-align: center; color: #ff4757;">
            <div style="font-size: 32px; margin-bottom: 8px;">🚫</div>
            <div style="font-size: 14px;">Imagen no disponible</div>
          </div>
        `;
      }
      return;
    }
    img.dataset.attempts = (attempts + 1).toString();
  } else {
    img.dataset.attempts = '1';
  }
  
  // Intentar siguiente alternativa
  const nextUrl = alternatives[parseInt(img.dataset.attempts) - 1];
  if (nextUrl && nextUrl !== img.src) {
    console.log(`Intentando URL alternativa: ${nextUrl}`);
    img.src = nextUrl;
  }
}

/**
 * Carga el chat
 */
async function loadChat() {
  const chatMessages = document.getElementById('chatMessages');
  const chatLoading = document.getElementById('chatLoading');

  if (!chatMessages) return;

  if (chatLoading) chatLoading.style.display = 'block';
  chatMessages.innerHTML = '';

  try {
    // Obtener usuario y token de ambos storages
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

    // El usuario puede tener 'id' o 'userId' dependiendo de cómo se guardó
    const userId = user.id || user.userId;

    if (!user || !userId || !token) {
      if (chatLoading) chatLoading.style.display = 'none';
      chatMessages.innerHTML = '<p class="info-text">Debes iniciar sesión para ver el chat.</p>';
      return;
    }

    const response = await fetch(`/api/chat/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 401) {
      if (chatLoading) chatLoading.style.display = 'none';
      chatMessages.innerHTML = '<p class="info-text">Sesión expirada. Por favor recarga la página.</p>';
      return;
    }
    
    if (!response.ok) throw new Error('Error en la respuesta del servidor');

    const messages = await response.json();

    if (chatLoading) chatLoading.style.display = 'none';

    if (!messages || messages.length === 0) {
      chatMessages.innerHTML = '<p class="info-text">No hay mensajes aún. ¡Inicia la conversación!</p>';
      return;
    }

    messages.forEach(message => {
      const messageEl = createChatMessage(message, userId);
      chatMessages.appendChild(messageEl);
    });

    // Scroll al final
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (error) {
    console.error('Error loading chat:', error);
    if (chatLoading) chatLoading.style.display = 'none';
    chatMessages.innerHTML = '<p class="info-text">Error al cargar el chat</p>';
  }

  // Inicializar envío de mensajes
  initChatInput();
}

/**
 * Crea un elemento de mensaje de chat
 */
function createChatMessage(message, currentUserId) {
  const div = document.createElement('div');
  div.className = `chat-message${message.sender_id === currentUserId ? ' own' : ''}`;

  const time = new Date(message.created_at).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });

  div.innerHTML = `
    <div class="chat-sender">${message.sender_id === currentUserId ? 'Tú' : 'Admin'}</div>
    <div class="chat-bubble">
      <p class="chat-text">${escapeHtml(message.message)}</p>
      ${message.image_url ? `<img src="${message.image_url}" class="chat-image" alt="Imagen">` : ''}
      <div class="chat-time">${time}</div>
    </div>
  `;

  return div;
}

// Flag para evitar duplicación de event listeners
let chatInputInitialized = false;

/**
 * Inicializa el input de chat (solo una vez)
 */
function initChatInput() {
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatFileBtn = document.getElementById('chatFileBtn');
  const chatFileInput = document.getElementById('chatFileInput');

  console.log('[CHAT-INIT] Inicializando chat input...', {
    hasInput: !!chatInput,
    hasBtn: !!chatSendBtn,
    alreadyInit: chatInputInitialized
  });

  if (!chatInput || !chatSendBtn) {
    console.warn('[CHAT-INIT] Elementos no encontrados');
    return;
  }

  // Si ya está inicializado, no duplicar listeners
  if (chatInputInitialized) {
    console.log('[CHAT-INIT] Ya estaba inicializado, saltando...');
    return;
  }
  chatInputInitialized = true;
  console.log('[CHAT-INIT] Configurando event listeners...');

  // Obtener token
  const getToken = () => localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

  // Enviar mensaje
  const sendMessage = async () => {
    const message = chatInput.value.trim();
    console.log('[CHAT-SEND] Intentando enviar:', message);

    if (!message) {
      console.log('[CHAT-SEND] Mensaje vacío');
      return;
    }

    const token = getToken();
    if (!token) {
      console.error('[CHAT-SEND] Sin token');
      alert('Sesión expirada. Por favor recarga la página.');
      return;
    }

    console.log('[CHAT-SEND] Enviando mensaje...');
    // Deshabilitar botón mientras envía
    chatSendBtn.disabled = true;
    chatSendBtn.textContent = 'Enviando...';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      });

      console.log('[CHAT-SEND] Respuesta:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[CHAT-SEND] Error:', errorData);
        throw new Error(errorData.error || 'Error al enviar mensaje');
      }

      console.log('[CHAT-SEND] Mensaje enviado exitosamente');
      chatInput.value = '';
      await loadChat(); // Recargar chat
    } catch (error) {
      console.error('[CHAT-SEND] Error:', error);
      alert('Error al enviar el mensaje: ' + error.message);
    } finally {
      chatSendBtn.disabled = false;
      chatSendBtn.textContent = 'Enviar';
      console.log('[CHAT-SEND] Proceso finalizado');
    }
  };

  chatSendBtn.addEventListener('click', () => {
    console.log('[CHAT-INIT] Click en botón enviar');
    sendMessage();
  });

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      console.log('[CHAT-INIT] Enter presionado');
      e.preventDefault();
      sendMessage();
    }
  });

  console.log('[CHAT-INIT] Event listeners configurados correctamente');

  // Subir imagen
  if (chatFileBtn && chatFileInput) {
    chatFileBtn.addEventListener('click', () => chatFileInput.click());
    chatFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const token = getToken();
      if (!token) {
        alert('Sesión expirada. Por favor recarga la página.');
        return;
      }

      const formData = new FormData();
      formData.append('image', file);
      formData.append('message', chatInput.value.trim() || 'Imagen');

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error('Error al subir imagen');
        }

        chatInput.value = '';
        chatFileInput.value = '';
        loadChat();
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error al subir la imagen');
      }
    });
  }
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
