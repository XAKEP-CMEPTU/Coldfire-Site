/* ============================================
   СИСТЕМА АВТОРИЗАЦИИ И РЕГИСТРАЦИИ METRO 2033
   (Серверная версия с модальными окнами)
   ============================================ */

const authSystem = (function() {
  'use strict';

  // Конфигурация API
  const API_BASE_URL = 'http://localhost:3000/api';
  const TOKEN_KEY = 'metro2033_token';
  const SESSION_KEY = 'metro2033_session';
  let lastLoginError = null;
  let currentAuthMode = 'login'; // 'login' или 'register'

  // Вспомогательная функция для API запросов
  async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
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

  // Инициализация системы
  async function init() {
    // Проверяем наличие токена и восстанавливаем сессию
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        const response = await apiRequest('/auth/me');
        if (response.user) {
          createSession(response.user);
        }
      } catch (error) {
        // Токен невалиден, удаляем его
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(SESSION_KEY);
      }
    }
    
    // Создаем модальное окно для авторизации
    createAuthModal();
    
    // Обновляем UI
    updateAuthUI();
  }

  // Создание модального окна авторизации
  function createAuthModal() {
    // Проверяем, не создано ли уже модальное окно
    if (document.getElementById('authModal')) return;

    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.className = 'auth-modal';
    modal.innerHTML = `
      <div class="auth-modal-content">
        <span class="auth-modal-close" onclick="authSystem.closeAuthModal()">&times;</span>
        <div id="authModalBody"></div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Закрытие по клику вне модального окна
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeAuthModal();
      }
    });

    // Рендерим форму входа по умолчанию
    renderAuthForm('login');
  }

  // Рендер формы авторизации/регистрации
  function renderAuthForm(mode) {
    currentAuthMode = mode;
    const modalBody = document.getElementById('authModalBody');
    if (!modalBody) return;

    if (mode === 'login') {
      modalBody.innerHTML = `
        <h1 class="auth-title">АВТОРИЗАЦИЯ</h1>
        <div class="auth-error" id="authErrorMessage"></div>
        <form id="authLoginForm">
          <div class="auth-form-group">
            <label class="auth-label" for="authLoginUsername">ЛОГИН</label>
            <input 
              type="text" 
              id="authLoginUsername" 
              class="auth-input" 
              placeholder="Введите логин" 
              required
              autocomplete="username"
            >
          </div>
          <div class="auth-form-group">
            <label class="auth-label" for="authLoginPassword">ПАРОЛЬ</label>
            <div style="position: relative;">
              <input 
                type="password" 
                id="authLoginPassword" 
                class="auth-input" 
                placeholder="Введите пароль" 
                required
                autocomplete="current-password"
              >
              <button type="button" class="password-toggle" onclick="authSystem.togglePassword('authLoginPassword', 'authLoginPasswordToggle')">
                <i class="fas fa-eye" id="authLoginPasswordToggle"></i>
              </button>
            </div>
          </div>
          <button type="submit" class="auth-btn metro-shake">ВОЙТИ</button>
        </form>
        <a href="#" class="auth-link" onclick="authSystem.switchToRegister(); return false;">НЕТ АККАУНТА? ЗАРЕГИСТРИРОВАТЬСЯ</a>
      `;

      // Обработчик формы входа
      const form = document.getElementById('authLoginForm');
      if (form) {
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          await handleLogin();
        });
      }
    } else {
      modalBody.innerHTML = `
        <h1 class="auth-title">РЕГИСТРАЦИЯ</h1>
        <div class="auth-error" id="authErrorMessage"></div>
        <div class="auth-success" id="authSuccessMessage"></div>
        <form id="authRegisterForm">
          <div class="auth-form-group">
            <label class="auth-label" for="authRegisterUsername">ЛОГИН</label>
            <input 
              type="text" 
              id="authRegisterUsername" 
              class="auth-input" 
              placeholder="Введите логин" 
              required
              minlength="3"
              maxlength="20"
              pattern="[a-zA-Z0-9_]+"
              title="Только буквы, цифры и подчеркивание"
              autocomplete="username"
            >
          </div>
          <div class="auth-form-group">
            <label class="auth-label" for="authRegisterPassword">ПАРОЛЬ</label>
            <div style="position: relative;">
              <input 
                type="password" 
                id="authRegisterPassword" 
                class="auth-input" 
                placeholder="Введите пароль" 
                required
                minlength="6"
                autocomplete="new-password"
              >
              <button type="button" class="password-toggle" onclick="authSystem.togglePassword('authRegisterPassword', 'authRegisterPasswordToggle')">
                <i class="fas fa-eye" id="authRegisterPasswordToggle"></i>
              </button>
            </div>
          </div>
          <div class="auth-form-group">
            <label class="auth-label" for="authRegisterFaction">УЧАСТНИК ФРАКЦИИ</label>
            <select id="authRegisterFaction" class="auth-select" required>
              <option value="">-- Выберите фракцию --</option>
              <option value="redline">Красная линия</option>
              <option value="kitaigorod">Китай-город</option>
              <option value="4reykh">4 рейх</option>
              <option value="hanza">Ганза</option>
              <option value="free">Полис</option>
              <option value="militia">Троцкисты</option>
              <option value="spetsnaz">Орден "Спарта"</option>
              <option value="necropolis">Язычники</option>
              <option value="baltic">Венеция</option>
              <option value="london">Севастопольская ГЭС</option>
              <option value="dynamo">Бауманский альянс</option>
              <option value="police">Арбатская конфедерация</option>
              <option value="dolg">Содружество ВДНХ</option>
              <option value="republic">Ясеневская община</option>
              <option value="tunnelers">Сатанисты</option>
              <option value="vory">Кузнецкий мост</option>
              <option value="zvezda">Фермы и Фактории</option>
              <option value="siberian">Конфедерация 1905 года</option>
              <option value="darkness">Северный эмират</option>
              <option value="limon">Лимонкаъ</option>
              <option value="none">Нет фракции</option>
            </select>
          </div>
          <div class="auth-form-group">
            <label class="auth-label" for="authRegisterDiscord">НИК В DISCORD</label>
            <input 
              type="text" 
              id="authRegisterDiscord" 
              class="auth-input" 
              placeholder="Ваш ник в Discord" 
              required
              pattern=".{3,32}"
              title="От 3 до 32 символов"
            >
          </div>
          <button type="submit" class="auth-btn metro-shake">ЗАРЕГИСТРИРОВАТЬСЯ</button>
        </form>
        <a href="#" class="auth-link" onclick="authSystem.switchToLogin(); return false;">УЖЕ ЕСТЬ АККАУНТ? ВОЙТИ</a>
      `;

      // Обработчик формы регистрации
      const form = document.getElementById('authRegisterForm');
      if (form) {
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          await handleRegister();
        });
      }
    }
  }

  // Переключение между формами
  function switchToLogin() {
    renderAuthForm('login');
  }

  function switchToRegister() {
    renderAuthForm('register');
  }

  // Обработка входа
  async function handleLogin() {
    const username = document.getElementById('authLoginUsername').value.trim();
    const password = document.getElementById('authLoginPassword').value;

    if (!username || !password) {
      showAuthError('Заполните все поля!');
      return;
    }

    try {
      const success = await login(username, password);
      if (success) {
        closeAuthModal();
        window.location.reload();
      } else {
        const err = getLastLoginError();
        if (err === 'banned') {
          showAuthError('Аккаунт заблокирован. Обратитесь к администрации.');
        } else if (err === 'wrong_password' || err === 'not_found') {
          showAuthError('Неверный логин или пароль!');
        } else {
          showAuthError('Не удалось войти. Попробуйте ещё раз.');
        }
      }
    } catch (error) {
      showAuthError(error.message || 'Ошибка входа');
    }
  }

  // Обработка регистрации
  async function handleRegister() {
    const username = document.getElementById('authRegisterUsername').value.trim();
    const password = document.getElementById('authRegisterPassword').value;
    const faction = document.getElementById('authRegisterFaction').value;
    const discord = document.getElementById('authRegisterDiscord').value.trim();

    if (!username || !password || !faction || !discord) {
      showAuthError('Заполните все поля!');
      return;
    }

    try {
      const success = await register(username, password, faction, discord);
      if (success) {
        closeAuthModal();
        window.location.reload();
      } else {
        const err = getLastLoginError();
        if (err === 'username_taken') {
          showAuthError('Логин уже занят!');
        } else {
          showAuthError('Ошибка регистрации. Попробуйте ещё раз.');
        }
      }
    } catch (error) {
      showAuthError(error.message || 'Ошибка регистрации');
    }
  }

  // Показать ошибку в модальном окне
  function showAuthError(message) {
    const errorDiv = document.getElementById('authErrorMessage');
    const successDiv = document.getElementById('authSuccessMessage');
    if (errorDiv) {
      if (successDiv) successDiv.classList.remove('show');
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
      setTimeout(() => {
        errorDiv.classList.remove('show');
      }, 5000);
    }
  }

  // Показать успех в модальном окне
  function showAuthSuccess(message) {
    const successDiv = document.getElementById('authSuccessMessage');
    const errorDiv = document.getElementById('authErrorMessage');
    if (successDiv) {
      if (errorDiv) errorDiv.classList.remove('show');
      successDiv.textContent = message;
      successDiv.classList.add('show');
    }
  }

  // Открыть модальное окно авторизации
  function openAuthModal(mode = 'login') {
    const modal = document.getElementById('authModal');
    if (!modal) {
      createAuthModal();
    }
    renderAuthForm(mode);
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
  }

  // Закрыть модальное окно авторизации
  function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
  }

  // Переключение видимости пароля
  function togglePassword(inputId, toggleId) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);
    
    if (input && toggle) {
      if (input.type === 'password') {
        input.type = 'text';
        toggle.classList.remove('fa-eye');
        toggle.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        toggle.classList.remove('fa-eye-slash');
        toggle.classList.add('fa-eye');
      }
    }
  }

  // Регистрация нового пользователя
  async function register(username, password, faction, discord) {
    try {
      const response = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          faction,
          discord: discord || ''
        })
      });

      // Сохраняем токен
      if (response.token) {
        localStorage.setItem(TOKEN_KEY, response.token);
        createSession(response.user);
      }

      return true;
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      lastLoginError = error.message.includes('занят') ? 'username_taken' : 'registration_failed';
      return false;
    }
  }

  // Авторизация пользователя
  async function login(username, password) {
    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      // Сохраняем токен
      if (response.token) {
        localStorage.setItem(TOKEN_KEY, response.token);
        createSession(response.user);
      }

      lastLoginError = null;
      return true;
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      
      // Определяем тип ошибки
      if (error.message.includes('Неверный логин или пароль')) {
        lastLoginError = 'wrong_password';
      } else if (error.message.includes('заблокирован')) {
        lastLoginError = 'banned';
      } else {
        lastLoginError = 'not_found';
      }
      
      return false;
    }
  }

  // Выход из системы
  async function logout() {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Ошибка выхода:', error);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(SESSION_KEY);
      window.location.reload();
    }
  }

  // Проверка, авторизован ли пользователь
  function isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY) && !!localStorage.getItem(SESSION_KEY);
  }

  // Получение текущего пользователя
  function getCurrentUser() {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    
    try {
      return JSON.parse(session);
    } catch (e) {
      return null;
    }
  }

  // Проверка, является ли пользователь администратором
  function isAdmin() {
    const user = getCurrentUser();
    return user && (user.role === 'admin' || user.isAdmin === true);
  }

  function isModerator() {
    const user = getCurrentUser();
    return user && (user.role === 'moderator' || user.role === 'admin');
  }

  // Создание сессии
  function createSession(user) {
    const sessionData = {
      username: user.username || user.id,
      faction: user.faction,
      discord: user.discord,
      isAdmin: user.isAdmin || user.role === 'admin',
      role: user.role || (user.isAdmin ? 'admin' : 'user'),
      loginTime: new Date().toISOString()
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    
    // Обновляем UI на всех страницах
    updateAuthUI();
  }

  // Обновление UI (иконка пользователя в шапке)
  function updateAuthUI() {
    const user = getCurrentUser();
    
    // Управление ссылками Войти/Регистрация
    let loginLink = document.getElementById('loginLink');
    let registerLink = document.getElementById('registerLink');
    
    if (user) {
      // Скрываем ссылки входа/регистрации
      if (loginLink) {
        loginLink.style.display = 'none';
        loginLink.onclick = null; // Убираем обработчики
      }
      if (registerLink) {
        registerLink.style.display = 'none';
        registerLink.onclick = null;
      }
      
      // Проверяем, есть ли уже иконка
      let userIcon = document.getElementById('userIcon');
      
      if (!userIcon) {
        // Создаем иконку пользователя
        userIcon = document.createElement('div');
        userIcon.id = 'userIcon';
        userIcon.className = 'metro-user-icon online';
        
        // Иконка молотка для администраторов, обычная иконка для остальных
        if (user.role === 'admin' || user.isAdmin) {
          userIcon.innerHTML = '<i class="fas fa-hammer"></i>';
          userIcon.title = user.username + ' (Администратор)';
        } else if (user.role === 'moderator') {
          userIcon.innerHTML = '<i class="fas fa-user-shield"></i>';
          userIcon.title = user.username + ' (Модератор)';
        } else {
          userIcon.innerHTML = '<i class="fas fa-user"></i>';
          userIcon.title = user.username;
        }
        
        // Находим шапку и вставляем иконку перед социальными ссылками
        const header = document.querySelector('.metro-header') || document.querySelector('.header');
        const socialDiv = document.querySelector('.metro-social');
        
        if (header && socialDiv) {
          header.insertBefore(userIcon, socialDiv);
        } else if (header) {
          // Если нет блока социальных ссылок, добавляем в конец
          header.appendChild(userIcon);
        }
      } else {
        // Обновляем иконку если уже существует
        if (user.role === 'admin' || user.isAdmin) {
          userIcon.innerHTML = '<i class="fas fa-hammer"></i>';
          userIcon.title = user.username + ' (Администратор)';
        } else if (user.role === 'moderator') {
          userIcon.innerHTML = '<i class="fas fa-user-shield"></i>';
          userIcon.title = user.username + ' (Модератор)';
        } else {
          userIcon.innerHTML = '<i class="fas fa-user"></i>';
          userIcon.title = user.username;
        }
      }

      // Добавляем обработчик клика
      userIcon.onclick = function() {
        if (typeof openUserModal === 'function') {
          openUserModal();
        }
      };
    } else {
      // Показываем кнопки входа/регистрации
      const header = document.querySelector('.metro-header') || document.querySelector('.header');
      
      if (!loginLink && header) {
        loginLink = document.createElement('a');
        loginLink.id = 'loginLink';
        loginLink.href = '#';
        loginLink.textContent = 'Войти';
        loginLink.className = 'metro-nav-button';
        loginLink.onclick = function(e) {
          e.preventDefault();
          openAuthModal('login');
        };
        const nav = header.querySelector('.metro-nav') || header.querySelector('.nav-buttons');
        if (nav) nav.appendChild(loginLink); else header.appendChild(loginLink);
      } else if (loginLink) {
        loginLink.style.display = 'inline-block';
        loginLink.onclick = function(e) {
          e.preventDefault();
          openAuthModal('login');
        };
      }
      
      if (!registerLink && header) {
        registerLink = document.createElement('a');
        registerLink.id = 'registerLink';
        registerLink.href = '#';
        registerLink.textContent = 'Регистрация';
        registerLink.className = 'metro-nav-button';
        registerLink.onclick = function(e) {
          e.preventDefault();
          openAuthModal('register');
        };
        const nav = header.querySelector('.metro-nav') || header.querySelector('.nav-buttons');
        if (nav) nav.appendChild(registerLink); else header.appendChild(registerLink);
      } else if (registerLink) {
        registerLink.style.display = 'inline-block';
        registerLink.onclick = function(e) {
          e.preventDefault();
          openAuthModal('register');
        };
      }
      
      // Убираем иконку если нет пользователя
      const userIcon = document.getElementById('userIcon');
      if (userIcon) {
        userIcon.remove();
      }
    }
  }

  // Получить последнюю ошибку логина
  function getLastLoginError() {
    return lastLoginError;
  }

  // Утилиты модерации (для обратной совместимости, теперь через API)
  async function setBan(username, untilISO, reason) {
    try {
      await apiRequest(`/users/${username}/ban`, {
        method: 'POST',
        body: JSON.stringify({
          until: untilISO,
          reason: reason || ''
        })
      });
      
      // Если баним текущую сессию — выходим
      const current = getCurrentUser();
      if (current && current.username.toLowerCase() === username.toLowerCase()) {
        logout();
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка бана:', error);
      return false;
    }
  }

  async function unban(username) {
    try {
      await apiRequest(`/users/${username}/unban`, {
        method: 'POST'
      });
      return true;
    } catch (error) {
      console.error('Ошибка разбана:', error);
      return false;
    }
  }

  // Публичный API
  return {
    init: init,
    register: register,
    login: login,
    logout: logout,
    isAuthenticated: isAuthenticated,
    getCurrentUser: getCurrentUser,
    isAdmin: isAdmin,
    isModerator: isModerator,
    updateAuthUI: updateAuthUI,
    getLastLoginError: getLastLoginError,
    setBan: setBan,
    unban: unban,
    openAuthModal: openAuthModal,
    closeAuthModal: closeAuthModal,
    switchToLogin: switchToLogin,
    switchToRegister: switchToRegister,
    togglePassword: togglePassword
  };
})();

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', authSystem.init);
} else {
  authSystem.init();
}
