/* ============================================
   МОДАЛЬНОЕ ОКНО ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
   ============================================ */

function openUserModal() {
  const user = authSystem.getCurrentUser();
  if (!user) return;

  // Создаем модальное окно
  const modal = document.createElement('div');
  modal.id = 'userModal';
  modal.className = 'metro-user-modal';
  modal.innerHTML = `
    <div class="metro-user-modal-content">
      <div class="metro-user-modal-header">
        <h2 class="metro-user-modal-title">ПРОФИЛЬ</h2>
        <button class="metro-user-modal-close" onclick="closeUserModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="metro-user-info">
        <div class="metro-user-info-item">
          <div class="metro-user-info-label">ЛОГИН</div>
          <div class="metro-user-info-value">${escapeHtml(user.username)}</div>
        </div>
        <div class="metro-user-info-item">
          <div class="metro-user-info-label">ФРАКЦИЯ</div>
          <div class="metro-user-info-value">${getFactionName(user.faction)}</div>
        </div>
        <div class="metro-user-info-item">
          <div class="metro-user-info-label">DISCORD</div>
          <div class="metro-user-info-value">${escapeHtml(user.discord)}</div>
        </div>
        ${user.isAdmin ? `
        <div class="metro-user-info-item" style="border-left-color: var(--metro-terminal-green);">
          <div class="metro-user-info-label" style="color: var(--metro-terminal-green);">СТАТУС</div>
          <div class="metro-user-info-value" style="color: var(--metro-terminal-green);">АДМИНИСТРАТОР</div>
        </div>
        ` : ''}
      </div>
      
      <div class="metro-user-actions">
        ${(user.role === 'admin' || user.isAdmin) ? `
        <button class="metro-user-action-btn admin" onclick="adminPanel()">
          <i class="fas fa-shield-alt"></i> ПАНЕЛЬ АДМИНИСТРАТОРА
        </button>
        <button class="metro-user-action-btn admin" onclick="userManagement()">
          <i class="fas fa-users-cog"></i> УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
        </button>
        <button class="metro-user-action-btn admin" onclick="moderationPanel()">
          <i class="fas fa-gavel"></i> ПАНЕЛЬ МОДЕРАЦИИ
        </button>
        <button class="metro-user-action-btn admin" onclick="systemSettings()">
          <i class="fas fa-cog"></i> НАСТРОЙКИ СИСТЕМЫ
        </button>
        ` : ''}
        ${(user.role === 'moderator' && !(user.role === 'admin')) ? `
        <button class="metro-user-action-btn" onclick="moderationPanel()">
          <i class="fas fa-gavel"></i> ПАНЕЛЬ МОДЕРАЦИИ
        </button>
        ` : ''}
        <button class="metro-user-action-btn" onclick="editProfile()">
          <i class="fas fa-user-edit"></i> РЕДАКТИРОВАТЬ ПРОФИЛЬ
        </button>
        <button class="metro-user-action-btn" onclick="changePassword()">
          <i class="fas fa-key"></i> СМЕНИТЬ ПАРОЛЬ
        </button>
        <button class="metro-user-action-btn danger" onclick="logout()">
          <i class="fas fa-sign-out-alt"></i> ВЫЙТИ
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  
  // Анимация появления
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);

  // Закрытие по клику вне модального окна
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeUserModal();
    }
  });

  // Закрытие по Escape
  document.addEventListener('keydown', function escapeHandler(e) {
    if (e.key === 'Escape') {
      closeUserModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  });
}

function closeUserModal() {
  const modal = document.getElementById('userModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// Функции действий (заглушки для будущей реализации)
function editProfile() {
  const user = authSystem.getCurrentUser();
  if (!user) return;
  // Простое модальное окно редактирования профиля
  const modal = document.createElement('div');
  modal.id = 'editProfileModal';
  modal.className = 'metro-user-modal';
  modal.innerHTML = `
    <div class="metro-user-modal-content">
      <div class="metro-user-modal-header">
        <h2 class="metro-user-modal-title">РЕДАКТИРОВАНИЕ ПРОФИЛЯ</h2>
        <button class="metro-user-modal-close" onclick="(function(){const m=document.getElementById('editProfileModal'); if(m){m.classList.remove('show'); setTimeout(()=>m.remove(),300);} })()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="metro-user-info">
        <div class="metro-user-info-item">
          <div class="metro-user-info-label">ФРАКЦИЯ</div>
          <select id="editFaction" class="metro-chat-select">
            <option value="none">Нет фракции</option>
            <option value="hanza">Ганза</option>
            <option value="4reykh">4 рейх</option>
            <option value="redline">Красная линия</option>
            <option value="kitaigorod">Китай-город</option>
            <option value="free">Полис</option>
          </select>
        </div>
        <div class="metro-user-info-item">
          <div class="metro-user-info-label">DISCORD</div>
          <input id="editDiscord" class="metro-chat-input" type="text" placeholder="@ник или ID">
        </div>
      </div>
      <div class="metro-user-actions">
        <button class="metro-user-action-btn" id="saveProfileBtn"><i class="fas fa-save"></i> СОХРАНИТЬ</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(()=>modal.classList.add('show'),10);
  // Инициализация значений
  const factionSel = modal.querySelector('#editFaction');
  const discordInp = modal.querySelector('#editDiscord');
  if (factionSel) factionSel.value = user.faction || 'none';
  if (discordInp) discordInp.value = user.discord || '';
  // Сохранение
  modal.querySelector('#saveProfileBtn').addEventListener('click', function(){
    try {
      const users = JSON.parse(localStorage.getItem('metro2033_users')) || {};
      const key = (user.username||'').toLowerCase();
      if (!users[key]) { alert('Пользователь не найден'); return; }
      users[key].faction = factionSel.value;
      users[key].discord = discordInp.value.trim();
      localStorage.setItem('metro2033_users', JSON.stringify(users));
      // Обновляем сессию
      const session = JSON.parse(localStorage.getItem('metro2033_session')) || {};
      session.faction = users[key].faction;
      session.discord = users[key].discord;
      localStorage.setItem('metro2033_session', JSON.stringify(session));
      authSystem.updateAuthUI();
      alert('Профиль обновлён');
      const m = document.getElementById('editProfileModal');
      if (m){ m.classList.remove('show'); setTimeout(()=>m.remove(),300); }
      closeUserModal();
    } catch (e) {
      alert('Ошибка сохранения профиля');
    }
  });
}

function changePassword() {
  alert('Функция смены пароля будет реализована в следующей версии.');
  closeUserModal();
}

function logout() {
  if (confirm('Вы уверены, что хотите выйти?')) {
    authSystem.logout();
    closeUserModal();
  }
}

// Функции для администраторов
function adminPanel() {
  const modal = document.createElement('div');
  modal.id = 'adminPanelModal';
  modal.className = 'metro-user-modal';
  modal.innerHTML = `
    <div class="metro-user-modal-content" style="animation:fadeIn .25s ease;">
      <div class="metro-user-modal-header">
        <h2 class="metro-user-modal-title">ПАНЕЛЬ АДМИНИСТРАТОРА</h2>
        <button class="metro-user-modal-close" onclick="(function(){const m=document.getElementById('adminPanelModal'); if(m){m.classList.remove('show'); setTimeout(()=>m.remove(),300);} })()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="metro-user-actions" style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="metro-user-action-btn admin" style="border:2px solid var(--metro-terminal-green);" onclick="userManagement()"><i class="fas fa-users-cog"></i> Пользователи</button>
        <button class="metro-user-action-btn admin" style="border:2px solid var(--metro-terminal-cyan);" onclick="moderationPanel()"><i class="fas fa-gavel"></i> Модерация</button>
        <button class="metro-user-action-btn admin" style="border:2px solid var(--metro-accent-red);" onclick="systemSettings()"><i class="fas fa-cog"></i> Настройки</button>
      </div>
      <div style="padding:12px;color:#aaa;animation:fadeIn .3s ease;">Выберите раздел управления.</div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(()=>modal.classList.add('show'),10);
  closeUserModal();
}

function userManagement() {
  const modal = document.createElement('div');
  modal.id = 'userManagementModal';
  modal.className = 'metro-user-modal';
  function getUsers(){ try{return JSON.parse(localStorage.getItem('metro2033_users_json'))||{};}catch(e){return {};}}
  function getStaff(){ try{return JSON.parse(localStorage.getItem('metro2033_staff_json'))||{};}catch(e){return {};}}
  function saveStaff(s){ localStorage.setItem('metro2033_staff_json', JSON.stringify(s)); }
  function render(){
    const users = getUsers();
    const staff = getStaff();
    const entries = [];
    Object.values(users).forEach(u=> entries.push({ username:u.username, role:u.role||'user', statusId:u.statusId||0 }));
    Object.values(staff).forEach(s=> entries.push({ username:s.username, role:s.role, statusId:s.statusId||0 }));
    const rows = entries.map(e=> `
      <tr>
        <td>${e.username}</td>
        <td>${e.role}</td>
        <td>${e.statusId===1?'Заблокирован':'Активен'}</td>
        <td>
          <button onclick="(function(name){ const staff=JSON.parse(localStorage.getItem('metro2033_staff_json')||'{}'); staff[name.toLowerCase()]={username:name,role:'moderator',statusId:0}; localStorage.setItem('metro2033_staff_json',JSON.stringify(staff)); alert('Назначен модератором'); })('${e.username}')">Модератор</button>
          <button onclick="(function(name){ const staff=JSON.parse(localStorage.getItem('metro2033_staff_json')||'{}'); staff[name.toLowerCase()]={username:name,role:'admin',statusId:0}; localStorage.setItem('metro2033_staff_json',JSON.stringify(staff)); alert('Назначен администратором'); })('${e.username}')">Админ</button>
          <button onclick="(function(name){ const staff=JSON.parse(localStorage.getItem('metro2033_staff_json')||'{}'); delete staff[name.toLowerCase()]; localStorage.setItem('metro2033_staff_json',JSON.stringify(staff)); alert('Права сняты'); })('${e.username}')">Снять права</button>
          <button onclick="authSystem.setBan('${e.username}', null, 'Забанен админом')">Бан</button>
          <button onclick="authSystem.unban('${e.username}')">Разбан</button>
        </td>
      </tr>
    `).join('');
    return `
      <div class=\"metro-user-modal-content\">
        <div class=\"metro-user-modal-header\">
          <h2 class=\"metro-user-modal-title\">УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ</h2>
          <button class=\"metro-user-modal-close\" onclick=\"(function(){const m=document.getElementById('userManagementModal'); if(m){m.classList.remove('show'); setTimeout(()=>m.remove(),300);} })()\"><i class=\"fas fa-times\"></i></button>
        </div>
        <div style=\"padding:12px;overflow:auto;max-height:70vh;\">
          <table style=\"width:100%;border-collapse:collapse;\">
            <thead><tr><th>Пользователь</th><th>Роль</th><th>Статус</th><th>Действия</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }
  modal.innerHTML = render();
  document.body.appendChild(modal);
  setTimeout(()=>modal.classList.add('show'),10);
  closeUserModal();
}

function moderationPanel() {
  const modal = document.createElement('div');
  modal.id = 'moderationPanelModal';
  modal.className = 'metro-user-modal';
  modal.innerHTML = `
    <div class="metro-user-modal-content">
      <div class="metro-user-modal-header">
        <h2 class="metro-user-modal-title">ПАНЕЛЬ МОДЕРАЦИИ</h2>
        <button class="metro-user-modal-close" onclick="(function(){const m=document.getElementById('moderationPanelModal'); if(m){m.classList.remove('show'); setTimeout(()=>m.remove(),300);} })()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div style="padding:12px;display:grid;gap:10px;">
        <input id="modUser" class="metro-chat-input" placeholder="Ник пользователя">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="metro-user-action-btn" onclick="(function(){const u=document.getElementById('modUser').value.trim(); if(!u)return; const dur=prompt('Срок мута (напр. 30m, 2h, 1d)'); const reason=prompt('Причина мута')||''; if(!dur)return; const m=dur; const ms=(function(s){const m=String(s||'').trim().match(/^(\\d+)\\s*(m|h|d|w)?$/i); if(!m)return null; const map={m:60000,h:3600000,d:86400000,w:604800000}; return parseInt(m[1],10)*(map[(m[2]||'m').toLowerCase()]||60000);} )(m); if(ms){ try{ const users=JSON.parse(localStorage.getItem('metro2033_users'))||{}; const key=u.toLowerCase(); if(!users[key]){alert('Пользователь не найден среди зарегистрированных');return;} users[key].mute={ until:new Date(Date.now()+ms).toISOString(), reason:reason}; localStorage.setItem('metro2033_users', JSON.stringify(users)); alert('Мут применён'); }catch(e){alert('Ошибка мута');} } else alert('Неверный срок'); })()">Мут</button>
          <button class="metro-user-action-btn" onclick="(function(){const u=document.getElementById('modUser').value.trim(); if(!u)return; const reason=prompt('Причина предупреждения')||''; try{ const users=JSON.parse(localStorage.getItem('metro2033_users'))||{}; const key=u.toLowerCase(); if(!users[key]){alert('Пользователь не найден');return;} if(!users[key].warns) users[key].warns={count:0,list:[]}; users[key].warns.count+=1; users[key].warns.list.push({reason,at:new Date().toISOString()}); if(users[key].warns.count>=3){ users[key].ban={isBanned:true,until:new Date(Date.now()+2592000000).toISOString(),reason:'3 предупреждения'}; users[key].statusId=1; } localStorage.setItem('metro2033_users', JSON.stringify(users)); alert('Варн выдан'); }catch(e){ alert('Ошибка'); } })()">Варн</button>
          <button class="metro-user-action-btn danger" onclick="(function(){const u=document.getElementById('modUser').value.trim(); if(!u)return; const dur=prompt('Срок бана (например: 7d). Пусто = бессрочно:'); const reason=prompt('Причина бана')||''; if(!dur){ authSystem.setBan(u,null,reason); alert('Бессрочный бан применён'); return;} const m=dur; const ms=(function(s){const m=String(s||'').trim().match(/^(\\d+)\\s*(m|h|d|w)?$/i); if(!m)return null; const map={m:60000,h:3600000,d:86400000,w:604800000}; return parseInt(m[1],10)*(map[(m[2]||'m').toLowerCase()]||60000);} )(m); if(!ms){alert('Неверный срок');return;} const until=new Date(Date.now()+ms).toISOString(); authSystem.setBan(u, until, reason); alert('Бан применён'); })()">Бан</button>
          <button class="metro-user-action-btn" onclick="(function(){const u=document.getElementById('modUser').value.trim(); if(!u)return; authSystem.unban(u); alert('Разбан выполнен'); })()">Разбан</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(()=>modal.classList.add('show'),10);
  closeUserModal();
}

function systemSettings() {
  const modal = document.createElement('div');
  modal.id = 'systemSettingsModal';
  modal.className = 'metro-user-modal';
  const settings = (function(){ try{return JSON.parse(localStorage.getItem('metro2033_settings'))||{maxChatsPerUser:3};}catch(e){return {maxChatsPerUser:3};} })();
  modal.innerHTML = `
    <div class="metro-user-modal-content">
      <div class="metro-user-modal-header">
        <h2 class="metro-user-modal-title">НАСТРОЙКИ СИСТЕМЫ</h2>
        <button class="metro-user-modal-close" onclick="(function(){const m=document.getElementById('systemSettingsModal'); if(m){m.classList.remove('show'); setTimeout(()=>m.remove(),300);} })()"><i class="fas fa-times"></i></button>
      </div>
      <div style="padding:12px;display:grid;gap:10px;">
        <label>Максимум активных чатов на пользователя</label>
        <input id="maxChatsInput" class="metro-chat-input" type="number" min="1" max="10" value="${settings.maxChatsPerUser||3}">
        <button class="metro-user-action-btn" onclick="(function(){ const v=parseInt(document.getElementById('maxChatsInput').value,10)||3; const s={maxChatsPerUser:v}; localStorage.setItem('metro2033_settings', JSON.stringify(s)); alert('Сохранено. Перезагрузите страницу.'); })()">Сохранить</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(()=>modal.classList.add('show'),10);
  closeUserModal();
}

// Вспомогательные функции
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getFactionName(factionKey) {
  const factions = {
    'redline': 'Красная линия',
    'kitaigorod': 'Китай-город',
    '4reykh': '4 рейх',
    'hanza': 'Ганза',
    'free': 'Полис',
    'militia': 'Троцкисты',
    'spetsnaz': 'Орден "Спарта"',
    'necropolis': 'Язычники',
    'baltic': 'Венеция',
    'london': 'Севастопольская ГЭС',
    'dynamo': 'Бауманский альянс',
    'police': 'Арбатская конфедерация',
    'dolg': 'Содружество ВДНХ',
    'republic': 'Ясеневская община',
    'tunnelers': 'Сатанисты',
    'vory': 'Кузнецкий мост',
    'zvezda': 'Фермы и Фактории',
    'siberian': 'Конфедерация 1905 года',
    'darkness': 'Северный эмират',
    'limon': 'Лимонкаъ',
    'none': 'Нет фракции'
  };
  return factions[factionKey] || factionKey;
}

