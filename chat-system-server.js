/* ============================================
   СИСТЕМА ЧАТОВ METRO 2033 (Серверная версия)
   ============================================ */

const chatSystem = (function() {
  'use strict';

  // Конфигурация API
  const API_BASE_URL = 'http://localhost:3000/api';
  const SETTINGS_KEY = 'metro2033_settings';
  
  // Кэш чатов
  let chatsCache = [];
  let currentChatId = null;

  function getSettings(){
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { maxChatsPerUser: 3 }; }
    catch(e){ return { maxChatsPerUser: 3 }; }
  }

  const CHAT_RULES = {
    title: 'ПРАВИЛА ОБЩЕНИЯ В ЧАТЕ',
    content: `
      <p style="margin-bottom: 1rem;">⚠️ ВНИМАНИЕ! Нарушение правил приведет к блокировке аккаунта!</p>
      <ul style="list-style: none; padding-left: 0;">
        <li>• Будьте вежливы и уважительны</li>
        <li>• Не используйте нецензурную лексику</li>
        <li>• Не спамьте сообщениями</li>
        <li>• Не оскорбляйте других участников</li>
        <li>• Соблюдайте тематику обращения</li>
        <li>• Ожидайте ответа модератора (обычно в течение 24 часов)</li>
      </ul>
      <p style="margin-top: 1rem; color: var(--metro-accent-red);">
        При нарушении правил ваш аккаунт может быть заблокирован без предупреждения!
      </p>
    `
  };

  // Вспомогательная функция для API запросов
  async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('metro2033_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка запроса');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Получение московского времени
  function getMoscowTime() {
    const now = new Date();
    const moscowOffset = 3;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const moscow = new Date(utc + (3600000 * moscowOffset));
    
    const day = String(moscow.getDate()).padStart(2, '0');
    const month = String(moscow.getMonth() + 1).padStart(2, '0');
    const year = moscow.getFullYear();
    const hours = String(moscow.getHours()).padStart(2, '0');
    const minutes = String(moscow.getMinutes()).padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }

  // Инициализация системы
  function init() {
    if (!authSystem.isAuthenticated()) {
      return;
    }

    createChatButton();
  }

  // Создание кнопки "Обращения"
  function createChatButton() {
    const button = document.createElement('div');
    button.id = 'chatButton';
    button.className = 'metro-chat-button';
    button.style.position = 'fixed';
    button.style.bottom = '24px';
    button.style.left = '24px';
    button.style.zIndex = '1200';
    button.style.background = 'rgba(0, 255, 170, 0.12)';
    button.style.border = '2px solid var(--metro-terminal-cyan)';
    button.style.color = 'var(--metro-terminal-cyan)';
    button.style.borderRadius = '14px';
    button.style.padding = '10px 12px';
    button.style.cursor = 'pointer';
    button.style.backdropFilter = 'blur(2px)';
    button.style.boxShadow = '0 0 12px rgba(0,255,255,0.25)';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.gap = '0';
    button.innerHTML = `<i class="fas fa-comments" style="font-size:18px;"></i>`;
    
    button.onclick = async function() {
      if (!authSystem.isAuthenticated()) {
        alert('Для использования чатов необходимо авторизоваться!');
        authSystem.openAuthModal('login');
        return;
      }

      const ciExisting = document.getElementById('chatInterface');
      if (ciExisting) {
        ciExisting.style.transition = 'opacity .25s ease, transform .25s ease';
        ciExisting.style.opacity = '0';
        ciExisting.style.transform = 'translateY(10px)';
        setTimeout(()=>{ ciExisting.remove(); }, 260);
        return;
      }

      try {
        const chats = await loadChats();
        if (chats.length > 0) {
          showChatInterface();
        } else {
          showCreateChatModal();
        }
        setTimeout(() => {
          const ci = document.getElementById('chatInterface');
          if (ci) ci.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        showCreateChatModal();
      }
    };

    // Добавляем кнопку в body, чтобы она была видна на всех страницах
    document.body.appendChild(button);
  }

  // Загрузка чатов с сервера
  async function loadChats() {
    try {
      const response = await apiRequest('/chats');
      chatsCache = response.chats || [];
      return chatsCache;
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
      return [];
    }
  }

  // Получение чата с сервера
  async function getChat(chatId) {
    try {
      const response = await apiRequest(`/chats/${chatId}`);
      return response.chat;
    } catch (error) {
      console.error('Ошибка получения чата:', error);
      return null;
    }
  }

  // Модальное окно создания чата
  function showCreateChatModal() {
    const user = authSystem.getCurrentUser();
    
    const modal = document.createElement('div');
    modal.id = 'createChatModal';
    modal.className = 'metro-chat-modal';
    modal.innerHTML = `
      <div class="metro-chat-modal-content">
        <div class="metro-chat-modal-header">
          <h2 class="metro-chat-modal-title">СОЗДАТЬ ОБРАЩЕНИЕ</h2>
          <button class="metro-chat-modal-close" onclick="closeCreateChatModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form id="createChatForm">
          <div class="metro-chat-form-group">
            <label class="metro-chat-label" for="chatDiscordNick">НИК В DISCORD</label>
            <input 
              type="text" 
              id="chatDiscordNick" 
              class="metro-chat-input" 
              placeholder="Ваш ник в Discord" 
              value="${user.discord || ''}"
              required
            >
          </div>
          <div class="metro-chat-form-group">
            <label class="metro-chat-label" for="chatIssue">ЧТО У ВАС СЛУЧИЛОСЬ?</label>
            <textarea 
              id="chatIssue" 
              class="metro-chat-textarea" 
              placeholder="Опишите вашу проблему или вопрос..."
              required
              rows="5"
            ></textarea>
          </div>
          <div class="metro-chat-form-group">
            <label class="metro-chat-label" for="chatUrgency">УРОВЕНЬ СРОЧНОСТИ</label>
            <select id="chatUrgency" class="metro-chat-select" required>
              <option value="low">Низкий</option>
              <option value="medium" selected>Средний</option>
              <option value="high">Высокий</option>
            </select>
          </div>
          <button type="submit" class="metro-chat-submit-btn">СОЗДАТЬ ОБРАЩЕНИЕ</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeCreateChatModal();
      }
    });

    document.getElementById('createChatForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      await createChat();
    });
  }

  function closeCreateChatModal() {
    const modal = document.getElementById('createChatModal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
  }

  // Создание нового чата
  async function createChat() {
    const discord = document.getElementById('chatDiscordNick').value.trim();
    const issue = document.getElementById('chatIssue').value.trim();
    const urgency = document.getElementById('chatUrgency').value;

    if (!discord || !issue) {
      alert('Заполните все поля!');
      return;
    }

    try {
      const response = await apiRequest('/chats', {
        method: 'POST',
        body: JSON.stringify({ discord, issue, urgency })
      });

      closeCreateChatModal();
      await loadChats(); // Обновляем кэш
      showChatInterface(response.chat._id);
    } catch (error) {
      alert(error.message || 'Ошибка создания чата');
    }
  }

  // Показать интерфейс чатов
  async function showChatInterface(selectedChatId = null) {
    await loadChats(); // Загружаем актуальные чаты

    const user = authSystem.getCurrentUser();
    const isAdminOrMod = authSystem.isAdmin() || authSystem.isModerator();
    
    // Фильтруем чаты для обычных пользователей
    let chats = chatsCache;
    if (!isAdminOrMod) {
      chats = chats.filter(chat => chat.userId === user.username);
    }

    let chatInterface = document.getElementById('chatInterface');
    if (!chatInterface) {
      chatInterface = document.createElement('div');
      chatInterface.id = 'chatInterface';
      chatInterface.className = 'metro-chat-interface';
      chatInterface.style.marginTop = '96px';
      chatInterface.style.scrollMarginTop = '24px';
      chatInterface.style.opacity = '0';
      chatInterface.style.transform = 'translateY(10px)';
      
      const mainArea = document.querySelector('.main-area') || document.querySelector('.container');
      if (mainArea) {
        mainArea.appendChild(chatInterface);
      }
      
      setTimeout(()=>{ 
        chatInterface.style.transition='opacity .25s ease, transform .25s ease'; 
        chatInterface.style.opacity='1'; 
        chatInterface.style.transform='translateY(0)'; 
      }, 10);
    }

    // Загружаем выбранный чат если указан
    let selectedChat = null;
    if (selectedChatId) {
      selectedChat = await getChat(selectedChatId);
      currentChatId = selectedChatId;
    }

    chatInterface.innerHTML = `
      <div class="metro-chat-list-container">
        <div class="metro-chat-list-header">
          <h3 class="metro-chat-list-title">АКТИВНЫЕ ЧАТЫ</h3>
          <button class="metro-chat-new-btn" onclick="chatSystem.showCreateChatModal()">
            <i class="fas fa-plus"></i> НОВЫЙ
          </button>
        </div>
        <div class="metro-chat-list" id="chatList">
          ${renderChatList(chats)}
        </div>
      </div>
      <div class="metro-chat-window-container" id="chatWindowContainer">
        ${selectedChat ? await renderChatWindow(selectedChat) : renderEmptyChat()}
      </div>
    `;

    attachChatListHandlers();
    
    if (selectedChat) {
      attachChatWindowHandlers(selectedChatId);
    }
  }

  // Рендер списка чатов
  function renderChatList(chats) {
    if (chats.length === 0) {
      return `
        <div class="metro-chat-empty-list">
          <i class="fas fa-inbox"></i>
          <p>Нет активных обращений</p>
          <button class="metro-chat-new-btn" onclick="chatSystem.showCreateChatModal()">
            Создать обращение
          </button>
        </div>
      `;
    }

    return chats.map(chat => {
      const lastMessage = chat.messages && chat.messages.length > 0 
        ? chat.messages[chat.messages.length - 1] 
        : null;
      
      const urgencyClass = `urgency-${chat.urgency}`;
      const statusClass = `status-${chat.status}`;
      const chatId = chat._id || chat.id;
      
      return `
        <div class="metro-chat-item ${urgencyClass} ${statusClass}" data-chat-id="${chatId}">
          <div class="metro-chat-item-header">
            <span class="metro-chat-item-id">#${String(chatId).slice(-6)}</span>
            <span class="metro-chat-item-urgency">${getUrgencyLabel(chat.urgency)}</span>
          </div>
          <div class="metro-chat-item-preview">
            ${chat.issue.substring(0, 50)}${chat.issue.length > 50 ? '...' : ''}
          </div>
          ${lastMessage ? `
          <div class="metro-chat-item-last">
            <span class="metro-chat-item-time">${getMoscowTimeFromISO(lastMessage.timestamp)}</span>
          </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  // Рендер окна чата
  async function renderChatWindow(chat) {
    if (!chat) {
      return renderEmptyChat();
    }

    const user = authSystem.getCurrentUser();
    const isAdmin = authSystem.isAdmin();
    const isMod = authSystem.isModerator();
    const chatId = chat._id || chat.id;

    return `
      <div class="metro-chat-window-header">
        <div class="metro-chat-window-info">
          <h3 class="metro-chat-window-title">Обращение #${String(chatId).slice(-6)}</h3>
          <span class="metro-chat-window-urgency urgency-${chat.urgency}">${getUrgencyLabel(chat.urgency)}</span>
          ${chat.status === 'closed' ? '<span class="metro-chat-status-closed">ЗАКРЫТ</span>' : ''}
        </div>
        ${isAdmin || isMod ? `
        <div class="metro-chat-admin-controls">
          <button class="metro-chat-admin-btn" onclick="chatSystem.editChat('${chatId}')" title="Редактировать">
            <i class="fas fa-edit"></i>
          </button>
          <button class="metro-chat-admin-btn" onclick="chatSystem.toggleChatStatus('${chatId}')" title="${chat.status === 'open' ? 'Закрыть' : 'Открыть'}">
            <i class="fas fa-${chat.status === 'open' ? 'lock' : 'unlock'}"></i>
          </button>
        </div>
        ` : ''}
      </div>
      <div class="metro-chat-messages" id="chatMessages" style="min-height: 52vh; max-height: 62vh; overflow-y: auto;">
        ${renderMessages(chat.messages || [])}
      </div>
      ${chat.status === 'open' || isAdmin || isMod ? `
      <div class="metro-chat-input-container">
        <input 
          type="text" 
          id="chatMessageInput" 
          class="metro-chat-message-input" 
          placeholder="Введите сообщение..."
        >
        <button class="metro-chat-attach-btn" onclick="chatSystem.attachFile()" title="Прикрепить файл">
          <i class="fas fa-paperclip"></i>
        </button>
        <button class="metro-chat-settings-btn" onclick="chatSystem.openUiSettings()" title="Настройки интерфейса" style="margin:0 6px;">
          <i class="fas fa-cog"></i>
        </button>
        <button class="metro-chat-send-btn" onclick="chatSystem.sendMessage('${chatId}')">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
      ` : '<div class="metro-chat-closed-notice">Чат закрыт</div>'}
      ${isAdmin || isMod ? `
      <aside class="metro-chat-admin-right" style="margin-top:12px;border-left:2px solid var(--metro-terminal-green);padding-left:12px;">
        <h4 style="color:var(--metro-terminal-green);margin-bottom:8px;">Активные чаты</h4>
        <div id="adminActiveChats">${renderAdminActiveChats()}</div>
      </aside>
      ` : ''}
    `;
  }

  // Рендер сообщений
  function renderMessages(messages) {
    if (!messages || messages.length === 0) {
      return '<div class="metro-chat-empty">Нет сообщений</div>';
    }

    return messages.map(msg => {
      const isSystem = msg.isSystem || msg.sender === 'system';
      const role = msg.senderRole || 'user';
      
      let senderColor = 'var(--metro-text)';
      if (role === 'admin') senderColor = '#ff9f43';
      else if (role === 'moderator') senderColor = '#00e5ff';
      else if (!isSystem) senderColor = 'var(--metro-terminal-green)';

      return `
        <div class="metro-chat-message ${isSystem ? 'system-message' : ''}">
          <div class="metro-chat-message-header">
            <span class="metro-chat-message-sender" style="color: ${senderColor}">
              ${isSystem ? '⚙️' : '👤'} ${escapeHtml(msg.senderName || msg.sender)}
            </span>
            <span class="metro-chat-message-time">${getMoscowTimeFromISO(msg.timestamp)}</span>
          </div>
          <div class="metro-chat-message-content">
            ${isSystem ? msg.message : escapeHtml(msg.message)}
            ${msg.file ? `<div style="margin-top:6px"><a href="${msg.file.url}" download="${escapeHtml(msg.file.name)}" style="color: var(--metro-terminal-cyan); text-decoration: underline;">Скачать файл (${escapeHtml(msg.file.name)})</a></div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderAdminActiveChats(){
    const active = chatsCache.filter(c => c.status !== 'closed');
    if (active.length === 0) return '<div class="metro-chat-empty">Нет активных чатов</div>';
    return active.sort((a,b)=> new Date(b.updated||b.created) - new Date(a.updated||a.created))
      .map(c => {
        const chatId = c._id || c.id;
        return `
          <div class="metro-chat-item" data-chat-id="${chatId}" style="cursor:pointer;margin-bottom:6px;padding:8px;border:1px solid var(--metro-border);border-radius:6px;background:rgba(20,20,30,0.6)">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span>#${String(chatId).slice(-6)}</span>
              <span class="urgency-${c.urgency}">${getUrgencyLabel(c.urgency)}</span>
            </div>
            <div style="font-size:0.95em;color:#aaa;">${c.userId}</div>
          </div>
        `;
      }).join('');
  }

  function renderEmptyChat() {
    return `
      <div class="metro-chat-empty-window">
        <i class="fas fa-comments"></i>
        <p>Выберите чат из списка</p>
      </div>
    `;
  }

  // Отправка сообщения
  async function sendMessage(chatId) {
    const input = document.getElementById('chatMessageInput');
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    try {
      const response = await apiRequest(`/chats/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message })
      });

      input.value = '';
      await updateChatWindow(chatId);
      await updateChatList();
    } catch (error) {
      alert(error.message || 'Ошибка отправки сообщения');
    }
  }

  // Обновление окна чата
  async function updateChatWindow(chatId) {
    const chat = await getChat(chatId);
    if (!chat) return;

    const container = document.getElementById('chatWindowContainer');
    if (container) {
      container.innerHTML = await renderChatWindow(chat);
      attachChatWindowHandlers(chatId);
      
      const messagesContainer = document.getElementById('chatMessages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }

  // Обновление списка чатов
  async function updateChatList() {
    await loadChats();
    const user = authSystem.getCurrentUser();
    const isAdminOrMod = authSystem.isAdmin() || authSystem.isModerator();
    
    let chats = chatsCache;
    if (!isAdminOrMod) {
      chats = chats.filter(chat => chat.userId === user.username);
    }

    const list = document.getElementById('chatList');
    if (list) {
      list.innerHTML = renderChatList(chats);
      attachChatListHandlers();
    }
  }

  // Привязка обработчиков списка
  function attachChatListHandlers() {
    const items = document.querySelectorAll('.metro-chat-item');
    items.forEach(item => {
      item.addEventListener('click', async function() {
        const chatId = this.dataset.chatId;
        await showChatInterface(chatId);
      });
    });

    const adminChats = document.querySelectorAll('#adminActiveChats .metro-chat-item');
    adminChats.forEach(item => {
      item.addEventListener('click', async function() {
        const chatId = this.dataset.chatId;
        await showChatInterface(chatId);
      });
    });
  }

  // Привязка обработчиков окна чата
  function attachChatWindowHandlers(chatId) {
    const input = document.getElementById('chatMessageInput');
    if (input) {
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          sendMessage(chatId);
        }
      });
    }
  }

  // Редактирование чата
  async function editChat(chatId) {
    const chat = await getChat(chatId);
    if (!chat) return;

    const newIssue = prompt('Измените описание проблемы:', chat.issue);
    if (newIssue && newIssue.trim() !== chat.issue) {
      try {
        await apiRequest(`/chats/${chatId}`, {
          method: 'PATCH',
          body: JSON.stringify({ issue: newIssue.trim() })
        });
        
        await updateChatWindow(chatId);
        await updateChatList();
      } catch (error) {
        alert(error.message || 'Ошибка обновления чата');
      }
    }
  }

  // Переключение статуса чата
  async function toggleChatStatus(chatId) {
    const chat = await getChat(chatId);
    if (!chat) return;

    const newStatus = chat.status === 'open' ? 'closed' : 'open';
    
    try {
      await apiRequest(`/chats/${chatId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      
      await updateChatWindow(chatId);
      await updateChatList();
    } catch (error) {
      alert(error.message || 'Ошибка обновления статуса');
    }
  }

  // Прикрепление файла (упрощенная версия)
  function attachFile() {
    alert('Прикрепление файлов будет реализовано позже');
  }

  // Настройки UI
  function openUiSettings() {
    alert('Настройки интерфейса');
  }

  function applyUiSettings() {
    // Применение настроек UI
  }

  // Вспомогательные функции
  function getUrgencyLabel(urgency) {
    const labels = {
      'low': 'Низкий',
      'medium': 'Средний',
      'high': 'Высокий'
    };
    return labels[urgency] || urgency;
  }

  function getMoscowTimeFromISO(isoString) {
    const date = new Date(isoString);
    const moscowOffset = 3;
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const moscow = new Date(utc + (3600000 * moscowOffset));
    
    const day = String(moscow.getDate()).padStart(2, '0');
    const month = String(moscow.getMonth() + 1).padStart(2, '0');
    const year = moscow.getFullYear();
    const hours = String(moscow.getHours()).padStart(2, '0');
    const minutes = String(moscow.getMinutes()).padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Публичный API
  return {
    init: init,
    showCreateChatModal: showCreateChatModal,
    showChatInterface: showChatInterface,
    sendMessage: sendMessage,
    attachFile: attachFile,
    openUiSettings: openUiSettings,
    applyUiSettings: applyUiSettings,
    editChat: editChat,
    toggleChatStatus: toggleChatStatus,
    getMoscowTime: getMoscowTime,
    closeCreateChatModal: closeCreateChatModal
  };
})();

// Глобальные функции
function closeCreateChatModal() {
  chatSystem.closeCreateChatModal();
}

// Инициализация
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => chatSystem.init(), 1000);
  });
} else {
  setTimeout(() => chatSystem.init(), 1000);
}

