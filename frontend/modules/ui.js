/**
 * UI Module - Gestión de interfaz de usuario
 * Maneja modales, menús y barra flotante
 */

import { clearTokens } from './auth.js';

/**
 * Inicializa todos los elementos de UI
 */
export function initUI() {
  initMenu();
  initModals();
  initFloatingSidebar();
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
    chat: document.getElementById('chatModal'),
    overlay: document.getElementById('overlayModal')
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
  const overlayBtn = document.getElementById('overlayBtn');
  const openLeaderboardBtn = document.getElementById('openLeaderboardBtn');
  const openTimerBtn = document.getElementById('openTimerBtn');

  console.log('initFloatingSidebar - Elementos encontrados:', {
    sidebar: !!sidebar,
    sidebarToggle: !!sidebarToggle,
    newsBtn: !!newsBtn,
    chatBtn: !!chatBtn,
    overlayBtn: !!overlayBtn,
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

  if (overlayBtn) {
    overlayBtn.addEventListener('click', () => {
      console.log('Overlay button clicked');
      openModal('overlayModal');
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
      const timerUrl = `${window.location.origin}/overlay-timer.html`;
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
  } else if (modalId === 'overlayModal') {
    loadOverlaySettings();
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

  if (!newsList) return;

  newsLoading.style.display = 'block';
  newsEmpty.style.display = 'none';
  newsList.innerHTML = '';

  try {
    const response = await fetch('/api/news');
    const news = await response.json();

    newsLoading.style.display = 'none';

    if (!news || news.length === 0) {
      newsEmpty.style.display = 'block';
      return;
    }

    news.forEach(item => {
      const newsItem = createNewsItem(item);
      newsList.appendChild(newsItem);
    });
  } catch (error) {
    console.error('Error loading news:', error);
    newsLoading.style.display = 'none';
    newsEmpty.textContent = 'Error al cargar las novedades';
    newsEmpty.style.display = 'block';
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

  div.innerHTML = `
    <div class="news-item-header">
      <h3 class="news-item-title">${escapeHtml(news.title)}</h3>
      <span class="news-item-date">${date}</span>
    </div>
    <p class="news-item-content">${escapeHtml(news.content)}</p>
    ${news.image_url ? `<img src="${news.image_url}" class="news-item-image" alt="${escapeHtml(news.title)}">` : ''}
  `;

  return div;
}

/**
 * Carga el chat
 */
async function loadChat() {
  const chatMessages = document.getElementById('chatMessages');
  const chatLoading = document.getElementById('chatLoading');

  if (!chatMessages) return;

  chatLoading.style.display = 'block';
  chatMessages.innerHTML = '';

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user || !user.id) {
      chatLoading.style.display = 'none';
      chatMessages.innerHTML = '<p class="info-text">Debes iniciar sesión para ver el chat.</p>';
      return;
    }

    const response = await fetch(`/api/chat/${user.id}`);
    if (!response.ok) throw new Error('Error en la respuesta del servidor');

    const messages = await response.json();

    chatLoading.style.display = 'none';

    if (!messages || messages.length === 0) {
      chatMessages.innerHTML = '<p class="info-text">No hay mensajes aún. ¡Inicia la conversación!</p>';
      return;
    }

    messages.forEach(message => {
      const messageEl = createChatMessage(message, user.id);
      chatMessages.appendChild(messageEl);
    });

    // Scroll al final
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (error) {
    console.error('Error loading chat:', error);
    chatLoading.style.display = 'none';
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

/**
 * Inicializa el input de chat
 */
function initChatInput() {
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatFileBtn = document.getElementById('chatFileBtn');
  const chatFileInput = document.getElementById('chatFileInput');

  if (!chatInput || !chatSendBtn) return;

  // Enviar mensaje
  const sendMessage = async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      chatInput.value = '';
      loadChat(); // Recargar chat
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  chatSendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Subir imagen
  if (chatFileBtn && chatFileInput) {
    chatFileBtn.addEventListener('click', () => chatFileInput.click());
    chatFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);
      formData.append('message', chatInput.value.trim() || 'Imagen');

      try {
        await fetch('/api/chat', {
          method: 'POST',
          body: formData
        });

        chatInput.value = '';
        chatFileInput.value = '';
        loadChat();
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    });
  }
}

/**
 * Carga la configuración de overlay
 */
async function loadOverlaySettings() {
  const overlayLeftPreview = document.getElementById('overlayLeftPreview');
  const overlayRightPreview = document.getElementById('overlayRightPreview');
  const overlayLink = document.getElementById('overlayLink');
  const overlayLinkInput = document.getElementById('overlayLinkInput');

  try {
    const response = await fetch('/api/overlays/my');
    const settings = await response.json();

    if (settings.left_image_url) {
      overlayLeftPreview.src = settings.left_image_url;
    }
    if (settings.right_image_url) {
      overlayRightPreview.src = settings.right_image_url;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const identifier = user.username || user.id;
    const overlayUrl = `${window.location.origin}/overlay/${identifier}`;
    overlayLinkInput.value = overlayUrl;
  } catch (error) {
    console.error('Error loading overlay settings:', error);
  }

  // Inicializar inputs de archivo
  initOverlayInputs();
}

/**
 * Inicializa los inputs de overlay
 */
function initOverlayInputs() {
  const overlayLeft = document.getElementById('overlayLeft');
  const overlayRight = document.getElementById('overlayRight');
  const overlayLeftPreview = document.getElementById('overlayLeftPreview');
  const overlayRightPreview = document.getElementById('overlayRightPreview');
  const overlaySaveBtn = document.getElementById('overlaySaveBtn');

  // Preview de imágenes
  if (overlayLeft) {
    overlayLeft.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        overlayLeftPreview.src = URL.createObjectURL(file);
      }
    });
  }

  if (overlayRight) {
    overlayRight.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        overlayRightPreview.src = URL.createObjectURL(file);
      }
    });
  }

  // Guardar overlay
  if (overlaySaveBtn) {
    overlaySaveBtn.addEventListener('click', async () => {
      const formData = new FormData();

      if (overlayLeft.files[0]) {
        formData.append('leftImage', overlayLeft.files[0]);
      }
      if (overlayRight.files[0]) {
        formData.append('rightImage', overlayRight.files[0]);
      }

      try {
        overlaySaveBtn.disabled = true;
        overlaySaveBtn.textContent = 'Guardando...';

        await fetch('/api/overlays', {
          method: 'POST',
          body: formData
        });

        overlaySaveBtn.textContent = '✅ Guardado';
        setTimeout(() => {
          overlaySaveBtn.textContent = 'Guardar Cambios';
          overlaySaveBtn.disabled = false;
        }, 2000);
      } catch (error) {
        console.error('Error saving overlay:', error);
        overlaySaveBtn.textContent = '❌ Error';
        setTimeout(() => {
          overlaySaveBtn.textContent = 'Guardar Cambios';
          overlaySaveBtn.disabled = false;
        }, 2000);
      }
    });
  }

  // Copiar URL del overlay
  const copyOverlayBtn = document.getElementById('copyOverlayBtn');
  if (copyOverlayBtn) {
    copyOverlayBtn.addEventListener('click', () => {
      const overlayLinkInput = document.getElementById('overlayLinkInput');
      if (overlayLinkInput) {
        overlayLinkInput.select();
        document.execCommand('copy');

        const originalText = copyOverlayBtn.textContent;
        copyOverlayBtn.textContent = '✅ Copiado';
        setTimeout(() => {
          copyOverlayBtn.textContent = originalText;
        }, 2000);
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
