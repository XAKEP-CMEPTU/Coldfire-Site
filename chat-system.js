/* ============================================
   СИСТЕМА ЧАТОВ METRO 2033
   ============================================ */

const chatSystem = (function() {
  'use strict';

  const STORAGE_KEY = 'metro2033_chats';
  const SETTINGS_KEY = 'metro2033_settings';
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

  // Получение московского времени
  function getMoscowTime() {
    const now = new Date();
    const moscowOffset = 3; // UTC+3
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
      return; // Система доступна только авторизованным
    }

    createChatButton();
    loadUserChats();
  }

  // Создание кнопки "Обращения"
  function createChatButton() {
    const button = document.createElement('div');
    button.id = 'chatButton';
    button.className = 'metro-chat-button';
    button.style.position = 'fixed';
    button.style.bottom = '24px';
    button.style.right = '24px';
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
    // Иконка без текста
    button.innerHTML = `<i class="fas fa-comments" style="font-size:18px;"></i>`;
    button.onclick = function() {
      if (!authSystem.isAuthenticated()) {
        alert('Для использования чатов необходимо авторизоваться!');
        window.location.href = 'login.html';
        return;
      }

      const user = authSystem.getCurrentUser();
      const chats = getUserChats(user.username);
      
      // Если есть чаты, показываем интерфейс, иначе - модальное окно создания
      const ciExisting = document.getElementById('chatInterface');
      if (ciExisting) {
        // Тоггл: скрыть с анимацией
        ciExisting.style.transition = 'opacity .25s ease, transform .25s ease';
        ciExisting.style.opacity = '0';
        ciExisting.style.transform = 'translateY(10px)';
        setTimeout(()=>{ ciExisting.remove(); }, 260);
        return;
      }

      if (chats.length > 0) {
        showChatInterface();
      } else {
        showCreateChatModal();
      }
      setTimeout(() => {
        const ci = document.getElementById('chatInterface');
        if (ci) ci.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    };

    // Добавляем кнопку справа от контейнера
    const container = document.querySelector('.container');
    if (container) {
      container.appendChild(button);
    }
  }

  // Модальное окно создания чата
  function showCreateChatModal() {
    const user = authSystem.getCurrentUser();
    const chats = getUserChats(user.username);
    
    // Проверка лимита (настройки)
    const limit = (getSettings().maxChatsPerUser || 3);
    const activeChats = chats.filter(chat => chat.status !== 'closed').length;
    if (activeChats >= limit) {
      alert(`Достигнут лимит активных чатов (${limit}). Закройте один из существующих чатов для создания нового.`);
      showChatInterface();
      return;
    }

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

    // Закрытие по клику вне модального окна
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeCreateChatModal();
      }
    });

    // Обработчик формы
    document.getElementById('createChatForm').addEventListener('submit', function(e) {
      e.preventDefault();
      createChat();
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
  function createChat() {
    const user = authSystem.getCurrentUser();
    const discord = document.getElementById('chatDiscordNick').value.trim();
    const issue = document.getElementById('chatIssue').value.trim();
    const urgency = document.getElementById('chatUrgency').value;

    if (!discord || !issue) {
      alert('Заполните все поля!');
      return;
    }

    const chat = {
      id: Date.now().toString(),
      userId: user.username,
      discord: discord,
      issue: issue,
      urgency: urgency,
      status: 'open',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      messages: []
    };

    // Добавляем приветственное сообщение с правилами
    chat.messages.push({
      id: 'welcome',
      sender: 'system',
      senderName: 'Система',
      message: CHAT_RULES.content,
      isSystem: true,
      timestamp: new Date().toISOString()
    });

    // Сохраняем чат
    const chats = getAllChats();
    chats[chat.id] = chat;
    saveChats(chats);

    closeCreateChatModal();
    showChatInterface(chat.id);
  }

  // Показать интерфейс чатов
  function showChatInterface(selectedChatId = null) {
    const user = authSystem.getCurrentUser();
    const chats = getUserChats(user.username);

    // Оставляем основной контент видимым; чаты идут ниже
    const mainContent = document.getElementById('mainContent');

    // Создаем интерфейс чатов
    let chatInterface = document.getElementById('chatInterface');
    if (!chatInterface) {
      chatInterface = document.createElement('div');
      chatInterface.id = 'chatInterface';
      chatInterface.className = 'metro-chat-interface';
      chatInterface.style.marginTop = '96px';
      chatInterface.style.scrollMarginTop = '24px';
      chatInterface.style.opacity = '0';
      chatInterface.style.transform = 'translateY(10px)';
      
      const mainArea = document.querySelector('.main-area');
      if (mainArea) {
        mainArea.appendChild(chatInterface);
      }
      const divider = document.createElement('div');
      divider.style.height = '16px';
      divider.style.margin = '24px 0 24px 0';
      divider.style.borderTop = '2px dashed rgba(0,255,0,0.25)';
      chatInterface.parentNode.insertBefore(divider, chatInterface);
      // Анимация появления
      setTimeout(()=>{ chatInterface.style.transition='opacity .25s ease, transform .25s ease'; chatInterface.style.opacity='1'; chatInterface.style.transform='translateY(0)'; }, 10);
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
        ${selectedChatId ? renderChatWindow(selectedChatId) : renderEmptyChat()}
      </div>
    `;

    // Привязываем обработчики
    attachChatListHandlers();
    
    if (selectedChatId) {
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
      
      return `
        <div class="metro-chat-item ${urgencyClass} ${statusClass}" data-chat-id="${chat.id}">
          <div class="metro-chat-item-header">
            <span class="metro-chat-item-id">#${chat.id.slice(-6)}</span>
            <span class="metro-chat-item-urgency">${getUrgencyLabel(chat.urgency)}</span>
          </div>
          <div class="metro-chat-item-preview">
            ${chat.issue.substring(0, 50)}${chat.issue.length > 50 ? '...' : ''}
          </div>
          ${lastMessage ? `
          <div class="metro-chat-item-last">
            <span class="metro-chat-item-time">${getMoscowTime()}</span>
          </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  // Рендер окна чата
  function renderChatWindow(chatId) {
    const chat = getChat(chatId);
    if (!chat) {
      return renderEmptyChat();
    }

    const user = authSystem.getCurrentUser();
    const isAdmin = authSystem.isAdmin();
    const canEdit = isAdmin || chat.userId === user.username;

    return `
      <div class="metro-chat-window-header">
        <div class="metro-chat-window-info">
          <h3 class="metro-chat-window-title">Обращение #${chat.id.slice(-6)}</h3>
          <span class="metro-chat-window-urgency urgency-${chat.urgency}">${getUrgencyLabel(chat.urgency)}</span>
          ${chat.status === 'closed' ? '<span class="metro-chat-status-closed">ЗАКРЫТ</span>' : ''}
        </div>
        ${isAdmin ? `
        <div class="metro-chat-admin-controls">
          <button class="metro-chat-admin-btn" onclick="chatSystem.editChat('${chat.id}')" title="Редактировать">
            <i class="fas fa-edit"></i>
          </button>
          <button class="metro-chat-admin-btn" onclick="chatSystem.toggleChatStatus('${chat.id}')" title="${chat.status === 'open' ? 'Закрыть' : 'Открыть'}">
            <i class="fas fa-${chat.status === 'open' ? 'lock' : 'unlock'}"></i>
          </button>
        </div>
        ` : ''}
      </div>
      <div class="metro-chat-messages" id="chatMessages" style="min-height: 52vh; max-height: 62vh; overflow-y: auto;">
        ${renderMessages(chat.messages)}
      </div>
      ${chat.status === 'open' || isAdmin ? `
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
        <button class="metro-chat-send-btn" onclick="chatSystem.sendMessage('${chat.id}')">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
      ` : '<div class="metro-chat-closed-notice">Чат закрыт</div>'}
      ${isAdmin ? `
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
      const isUser = msg.sender !== 'system' && !authSystem.isAdmin() && msg.sender === authSystem.getCurrentUser().username;
      const isAdmin = msg.sender !== 'system' && (authSystem.isAdmin() || msg.sender.includes('admin') || msg.sender.includes('moderator'));
      
      // Цвета ролей: пользователь — зелёный, модератор — голубой, администратор — оранжевый
      const role = msg.senderRole || inferRoleForSender(msg.sender);
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

  function inferRoleForSender(sender){
    if (!sender || sender === 'system') return 'system';
    try {
      const staff = JSON.parse(localStorage.getItem('metro2033_staff_json')) || {};
      const entry = staff[(sender||'').toLowerCase()];
      return entry && entry.role ? entry.role : 'user';
    } catch(e) { return 'user'; }
  }

  // Рендер пустого чата
  function renderEmptyChat() {
    return `
      <div class="metro-chat-empty-window">
        <i class="fas fa-comments"></i>
        <p>Выберите чат из списка</p>
      </div>
    `;
  }

  function renderAdminActiveChats(){
    const all = Object.values(getAllChats());
    const active = all.filter(c => c.status !== 'closed');
    if (active.length === 0) return '<div class="metro-chat-empty">Нет активных чатов</div>';
    return active.sort((a,b)=> (new Date(b.updated||b.created)) - (new Date(a.updated||a.created)))
      .map(c => `
        <div class="metro-chat-item" data-chat-id="${c.id}" style="cursor:pointer;margin-bottom:6px;padding:8px;border:1px solid var(--metro-border);border-radius:6px;background:rgba(20,20,30,0.6)">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span>#${c.id.slice(-6)}</span>
            <span class="urgency-${c.urgency}">${getUrgencyLabel(c.urgency)}</span>
          </div>
          <div style="font-size:0.95em;color:#aaa;">${c.userId}</div>
        </div>
      `).join('');
  }

  // Отправка сообщения
  function sendMessage(chatId) {
    const input = document.getElementById('chatMessageInput');
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    const user = authSystem.getCurrentUser();
    const chat = getChat(chatId);
    
    if (!chat || (chat.status === 'closed' && !authSystem.isAdmin())) {
      alert('Чат закрыт');
      return;
    }

    // Проверка мута
    try {
      const users = JSON.parse(localStorage.getItem('metro2033_users')) || {};
      const u = users[(user.username||'').toLowerCase()];
      if (u && u.mute && u.mute.until) {
        const until = new Date(u.mute.until).getTime();
        if (!isNaN(until) && Date.now() < until) {
          alert('У вас действует мут до ' + new Date(u.mute.until).toLocaleString('ru-RU') + (u.mute.reason ? ('\nПричина: ' + u.mute.reason) : ''));
          return;
        }
      }
    } catch (_) {}

    // Команда модератора: /мут <ник> <время> <причина>
    if ((authSystem.isAdmin() || (authSystem.isModerator && authSystem.isModerator())) && message.startsWith('/мут ')) {
      const parts = message.replace(/^\/мут\s+/i,'').split(/\s+/);
      const target = parts.shift();
      const durStr = parts.shift();
      const reason = parts.join(' ') || '';
      if (!target || !durStr) {
        alert('Использование: /мут <ник> <время> <причина>');
        return;
      }
      const ms = parseDurationToMs(durStr);
      if (!ms) { alert('Неверный формат времени мута'); return; }
      if (applyMute(target, ms, reason)) {
        // Системное сообщение в чат
        const sysMsg = {
          id: Date.now().toString(), sender:'system', senderName:'Система', isSystem:true,
          message: `Пользователь ${escapeHtml(target)} получил мут на ${durStr}. ${reason ? ('Причина: ' + escapeHtml(reason)) : ''}`,
          timestamp: new Date().toISOString()
        };
        chat.messages.push(sysMsg);
        chat.updated = new Date().toISOString();
        const chats = getAllChats(); chats[chatId]=chat; saveChats(chats);
        input.value = '';
        updateChatWindow(chatId); updateChatList();
        return;
      } else { alert('Не удалось применить мут'); return; }
    }

    const newMessage = {
      id: Date.now().toString(),
      sender: user.username,
      senderName: user.username + (user.isAdmin ? ' (Администратор)' : ''),
      senderRole: (authSystem.getCurrentUser().role || (authSystem.isAdmin() ? 'admin' : (authSystem.isModerator && authSystem.isModerator() ? 'moderator' : 'user'))),
      message: message,
      timestamp: new Date().toISOString()
    };

    chat.messages.push(newMessage);
    chat.updated = new Date().toISOString();

    const chats = getAllChats();
    chats[chatId] = chat;
    saveChats(chats);

    input.value = '';
    updateChatWindow(chatId);
    updateChatList();
  }

  // ===== Контекстные меню и модерация =====
  function ensureContextMenu(){
    let menu = document.getElementById('contextMenu');
    if (!menu){
      menu = document.createElement('div');
      menu.id = 'contextMenu';
      menu.style.position = 'fixed';
      menu.style.zIndex = '3000';
      menu.style.background = 'rgba(10,10,20,0.98)';
      menu.style.border = '1px solid var(--metro-border)';
      menu.style.borderRadius = '6px';
      menu.style.minWidth = '200px';
      menu.style.boxShadow = '0 6px 24px rgba(0,0,0,0.5)';
      menu.style.display = 'none';
      document.body.appendChild(menu);
      document.addEventListener('click', () => menu.style.display = 'none');
      window.addEventListener('scroll', () => menu.style.display = 'none');
    }
    return menu;
  }

  function showMenu(x,y,items){
    const menu = ensureContextMenu();
    menu.innerHTML = items.map(it => `
      <div data-key="${it.key}" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);color:${it.danger?'var(--metro-accent-red)':'var(--metro-text)'}">${it.label}</div>
    `).join('');
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
    Array.from(menu.children).forEach(child => {
      child.addEventListener('click', (e)=>{
        const key = child.getAttribute('data-key');
        const item = items.find(i=>i.key===key);
        if (item && typeof item.onClick === 'function') item.onClick();
        menu.style.display = 'none';
      });
    });
  }

  function parseDurationToMs(str){
    // поддержка форматов: 15m, 2h, 3d, 1w
    const m = String(str||'').trim().match(/^(\d+)\s*(m|h|d|w)?$/i);
    if (!m) return null;
    const num = parseInt(m[1],10);
    const unit = (m[2]||'m').toLowerCase();
    const map = { m: 60*1000, h: 60*60*1000, d: 24*60*60*1000, w: 7*24*60*60*1000 };
    return num * (map[unit] || map.m);
  }

  function applyMute(username, ms, reason){
    try{
      const users = JSON.parse(localStorage.getItem('metro2033_users')) || {};
      const key = (username||'').toLowerCase();
      if (!users[key]) return false;
      const untilISO = new Date(Date.now()+ms).toISOString();
      users[key].mute = { until: untilISO, reason: reason||'' };
      localStorage.setItem('metro2033_users', JSON.stringify(users));
      return true;
    }catch(_){ return false; }
  }

  function addWarn(username, reason){
    try{
      const users = JSON.parse(localStorage.getItem('metro2033_users')) || {};
      const key = (username||'').toLowerCase();
      if (!users[key]) return { ok:false };
      if (!users[key].warns) users[key].warns = { count:0, list:[] };
      users[key].warns.count += 1;
      users[key].warns.list.push({ reason: reason||'', at: new Date().toISOString() });
      // 3 варна = бан на месяц
      let autoBanApplied = false;
      if (users[key].warns.count >= 3) {
        const untilISO = new Date(Date.now() + 30*24*60*60*1000).toISOString();
        users[key].ban = { isBanned: true, until: untilISO, reason: '3 предупреждения' };
        autoBanApplied = true;
      }
      localStorage.setItem('metro2033_users', JSON.stringify(users));
      return { ok:true, autoBanApplied };
    }catch(_){ return { ok:false }; }
  }

  // Прикрепление файла (до 30 МБ, сохраняется объектный URL – сессионно)
  function attachFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.onchange = function(){
      const file = input.files && input.files[0];
      if (!file) return;
      const max = 30 * 1024 * 1024;
      if (file.size > max) { alert('Файл слишком большой. Лимит: 30 МБ.'); return; }
      const container = document.getElementById('chatWindowContainer');
      if (!container) return;
      const sendBtn = container.querySelector('.metro-chat-send-btn');
      if (!sendBtn) return;
      const match = sendBtn.getAttribute('onclick') && sendBtn.getAttribute('onclick').match(/sendMessage\('(.+?)'\)/);
      if (!match) return;
      const chatId = match[1];
      const user = authSystem.getCurrentUser();
      const chat = getChat(chatId);
      if (!chat) return;
      const url = URL.createObjectURL(file);
      const newMessage = {
        id: Date.now().toString(),
        sender: user.username,
        senderName: user.username + (user.isAdmin ? ' (Администратор)' : ''),
        senderRole: (authSystem.getCurrentUser().role || (authSystem.isAdmin() ? 'admin' : (authSystem.isModerator && authSystem.isModerator() ? 'moderator' : 'user'))),
        message: `Прикреплён файл: ${file.name}`,
        file: { name: file.name, size: file.size, type: file.type || 'application/octet-stream', url: url },
        timestamp: new Date().toISOString()
      };
      chat.messages.push(newMessage);
      chat.updated = new Date().toISOString();
      const chats = getAllChats();
      chats[chatId] = chat;
      saveChats(chats);
      updateChatWindow(chatId);
      updateChatList();
    };
    input.click();
  }

  // Панель настроек интерфейса
  function openUiSettings(){
    let modal = document.getElementById('uiSettingsModal');
    if (modal) { modal.classList.add('show'); return; }
    modal = document.createElement('div');
    modal.id = 'uiSettingsModal';
    modal.className = 'metro-user-modal';
    const ui = getUiSettings();
    modal.innerHTML = `
      <div class="metro-user-modal-content">
        <div class="metro-user-modal-header">
          <h2 class="metro-user-modal-title">НАСТРОЙКИ ИНТЕРФЕЙСА</h2>
          <button class="metro-user-modal-close" onclick="(function(){const m=document.getElementById('uiSettingsModal'); if(m){m.classList.remove('show'); setTimeout(()=>m.remove(),300);} })()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div style="padding:12px;display:grid;gap:10px;">
          <label>Масштаб интерфейса</label>
          <input id="uiScale" type="range" min="80" max="130" step="5" value="${Math.round((ui.scale||1)*100)}">
          <label>Высота окна сообщений</label>
          <select id="uiHeight" class="metro-chat-select">
            <option value="short" ${ui.height==='short'?'selected':''}>Ниже</option>
            <option value="medium" ${(!ui.height||ui.height==='medium')?'selected':''}>Средняя</option>
            <option value="tall" ${ui.height==='tall'?'selected':''}>Выше</option>
          </select>
          <button class="metro-user-action-btn" onclick="(function(){
            const scale = (document.getElementById('uiScale').value/100); 
            const height = document.getElementById('uiHeight').value;
            const s = { scale: scale, height: height };
            localStorage.setItem('metro2033_ui', JSON.stringify(s));
            // Применяем сразу
            try { chatSystem.applyUiSettings(); } catch(e){}
            alert('Сохранено');
          })()">Сохранить</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setTimeout(()=>modal.classList.add('show'),10);
  }

  function getUiSettings(){
    try { return JSON.parse(localStorage.getItem('metro2033_ui')) || { scale:1, height:'medium' }; }
    catch(e){ return { scale:1, height:'medium' }; }
  }

  function applyUiSettings(){
    const ui = getUiSettings();
    const ci = document.getElementById('chatInterface');
    if (ci) {
      ci.style.transformOrigin = 'top center';
      ci.style.transform = `scale(${ui.scale||1})`;
    }
    const msgs = document.getElementById('chatMessages');
    if (msgs) {
      const map = { short: ['42vh','52vh'], medium: ['52vh','62vh'], tall: ['62vh','72vh'] };
      const h = map[ui.height||'medium'] || map.medium;
      msgs.style.minHeight = h[0];
      msgs.style.maxHeight = h[1];
    }
  }

  // Обновление окна чата
  function updateChatWindow(chatId) {
    const container = document.getElementById('chatWindowContainer');
    if (container) {
      container.innerHTML = renderChatWindow(chatId);
      attachChatWindowHandlers(chatId);
      // Применяем пользовательские настройки UI
      try { applyUiSettings(); } catch(e){}
      
      // Прокрутка вниз
      const messagesContainer = document.getElementById('chatMessages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }

  // Обновление списка чатов
  function updateChatList() {
    const user = authSystem.getCurrentUser();
    const chats = getUserChats(user.username);
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
      item.addEventListener('click', function() {
        const chatId = this.dataset.chatId;
        showChatInterface(chatId);
      });
      // Контекстное меню по чату (ПКМ)
      item.addEventListener('contextmenu', function(e){
        e.preventDefault();
        const chatId = this.dataset.chatId;
        const isAdmin = authSystem.isAdmin();
        const items = [
          { key:'open', label:'Открыть', onClick: ()=> showChatInterface(chatId) },
        ];
        if (isAdmin){
          items.push(
            { key:'edit', label:'Редактировать', onClick: ()=> editChat(chatId) },
            { key:'close', label:'Закрыть', onClick: ()=> { toggleChatStatus(chatId); } },
            { key:'close_reason', label:'Закрыть с причиной', danger:false, onClick: ()=>{
                const reason = prompt('Причина закрытия:');
                if (reason && reason.trim()){
                  const chat = getChat(chatId);
                  if (chat){
                    chat.status = 'closed';
                    chat.messages.push({ id: Date.now().toString(), sender:'system', senderName:'Система', isSystem:true, message: 'Чат закрыт. Причина: ' + escapeHtml(reason.trim()), timestamp: new Date().toISOString() });
                    chat.updated = new Date().toISOString();
                    const chats = getAllChats(); chats[chatId]=chat; saveChats(chats);
                    updateChatWindow(chatId); updateChatList();
                  }
                }
            }}
          );
        }
        showMenu(e.clientX, e.clientY, items);
      });
    });
    // Активные чаты справа (для админа)
    const right = document.querySelectorAll('#adminActiveChats .metro-chat-item');
    right.forEach(item => {
      item.addEventListener('click', function(){
        const chatId = this.dataset.chatId;
        showChatInterface(chatId);
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
      // Команда /мут <время> <причина>
      input.addEventListener('keydown', function(e){
        if (e.key === 'Enter') return; // уже обработано
      });
    }

    // Контекстное меню на сообщении (ПКМ)
    const messagesEl = document.getElementById('chatMessages');
    if (messagesEl){
      messagesEl.querySelectorAll('.metro-chat-message').forEach(msgEl => {
        const header = msgEl.querySelector('.metro-chat-message-sender');
        if (!header) return;
        const nameText = header.textContent.replace(/^\s*[⚙️👤]\s*/,'').trim();
        const sender = nameText.replace(/\s*\(Администратор\)\s*$/,'');
        msgEl.addEventListener('contextmenu', function(e){
          e.preventDefault();
          const isMod = (authSystem.isAdmin() || (authSystem.isModerator && authSystem.isModerator()));
          const items = [];
          if (isMod && sender && sender !== 'Система'){
            items.push(
              { key:'ban', label:'Бан пользователя', danger:true, onClick: ()=>{
                  const dur = prompt('Срок (например: 7d, 12h). Пусто = бессрочно:');
                  const reason = prompt('Причина бана:') || '';
                  if (!dur){
                    if (typeof authSystem.setBan === 'function') authSystem.setBan(sender, null, reason);
                  } else {
                    const ms = parseDurationToMs(dur);
                    if (ms){
                      const until = new Date(Date.now()+ms).toISOString();
                      if (typeof authSystem.setBan === 'function') authSystem.setBan(sender, until, reason);
                    } else alert('Неверный формат срока');
                  }
              }},
              { key:'mute', label:'Мут пользователя', onClick: ()=>{
                  const dur = prompt('Срок мута (например: 30m, 2h, 1d):');
                  const reason = prompt('Причина мута:') || '';
                  const ms = parseDurationToMs(dur||'');
                  if (ms) { if (applyMute(sender, ms, reason)) alert('Пользователь замьючен'); else alert('Не удалось применить мут'); }
                  else alert('Неверный формат срока');
              }},
              { key:'warn', label:'Выдать варн', onClick: ()=>{
                  const reason = prompt('Причина предупреждения:') || '';
                  const r = addWarn(sender, reason);
                  if (r.ok) alert(r.autoBanApplied ? 'Варн выдан. Достигнуто 3 варна — пользователь забанен на месяц.' : 'Варн выдан.');
                  else alert('Не удалось выдать варн');
              }},
              { key:'warns', label:'Список варнов', onClick: ()=>{
                  try{
                    const users = JSON.parse(localStorage.getItem('metro2033_users')) || {};
                    const u = users[(sender||'').toLowerCase()];
                    const list = (u && u.warns && u.warns.list) ? u.warns.list : [];
                    if (list.length === 0) alert('Варнов нет');
                    else alert(list.map((w,i)=> `${i+1}. ${new Date(w.at).toLocaleString('ru-RU')} — ${w.reason||'Без причины'}`).join('\n'));
                  }catch(_){ alert('Не удалось получить варны'); }
              }}
            );
          }
          if (items.length>0) showMenu(e.clientX, e.clientY, items);
        });
      });
    }
  }

  // Редактирование чата (только для админов)
  function editChat(chatId) {
    const chat = getChat(chatId);
    if (!chat) return;

    const newIssue = prompt('Измените описание проблемы:', chat.issue);
    if (newIssue && newIssue.trim() !== chat.issue) {
      chat.issue = newIssue.trim();
      chat.updated = new Date().toISOString();
      
      const chats = getAllChats();
      chats[chatId] = chat;
      saveChats(chats);
      
      updateChatWindow(chatId);
      updateChatList();
    }
  }

  // Переключение статуса чата (только для админов)
  function toggleChatStatus(chatId) {
    const chat = getChat(chatId);
    if (!chat) return;

    chat.status = chat.status === 'open' ? 'closed' : 'open';
    chat.updated = new Date().toISOString();
    
    // Добавляем системное сообщение
    chat.messages.push({
      id: Date.now().toString(),
      sender: 'system',
      senderName: 'Система',
      message: `Чат ${chat.status === 'closed' ? 'закрыт' : 'открыт'} администратором.`,
      isSystem: true,
      timestamp: new Date().toISOString()
    });

    const chats = getAllChats();
    chats[chatId] = chat;
    saveChats(chats);

    updateChatWindow(chatId);
    updateChatList();
  }

  // Получение чата
  function getChat(chatId) {
    const chats = getAllChats();
    return chats[chatId] || null;
  }

  // Получение чатов пользователя
  function getUserChats(username) {
    const chats = getAllChats();
    // Админы и модераторы видят все чаты
    if (authSystem.isAdmin() || authSystem.isModerator && authSystem.isModerator()) {
      return Object.values(chats);
    }
    return Object.values(chats).filter(chat => chat.userId === username);
  }

  // Получение всех чатов
  function getAllChats() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  // Сохранение чатов
  function saveChats(chats) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
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

  // Загрузка чатов пользователя при загрузке страницы
  function loadUserChats() {
    if (authSystem.isAuthenticated()) {
      // Чат-интерфейс будет показан при нажатии на кнопку
    }
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
    getMoscowTime: getMoscowTime
  };
})();

// Глобальные функции для onclick обработчиков
function closeCreateChatModal() {
  chatSystem.closeCreateChatModal();
}

// Добавляем метод в публичный API
chatSystem.closeCreateChatModal = closeCreateChatModal;

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => chatSystem.init(), 1000);
  });
} else {
  setTimeout(() => chatSystem.init(), 1000);
}

