/* ============================================
   УНИВЕРСАЛЬНАЯ ЗАГРУЗОЧНАЯ ЗАСТАВКА ДЛЯ METRO 2033
   ============================================ */

(function() {
  'use strict';

  // Создаем загрузочный экран если его еще нет
  function createLoader() {
    if (document.getElementById('metro-loader')) return;

    const loader = document.createElement('div');
    loader.id = 'metro-loader';
    loader.className = 'metro-loader';
    loader.innerHTML = `
      <div class="loader-content">
        <div class="loader-glitch"></div>
        <div class="loader-logo">COLDFIRE PROJECT</div>
        <div class="loader-status" id="loader-status">ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ...</div>
        <div class="loader-info">
          <p>СТАНЦИЯ: МЕТРО МОСКВЫ</p>
          <p>ПРОЕКТ: COLDFIRE PROJECT</p>
          <p>ДОСТУП: ОТКРЫТЫЙ</p>
        </div>
        <div class="loader-progress-container">
          <div class="loader-progress-bar" id="loader-progress"></div>
        </div>
        <div class="loader-year">2033</div>
      </div>
    `;
    document.body.appendChild(loader);
  }

  // Статусы загрузки
  const statuses = [
    'ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ...',
    'ПОДКЛЮЧЕНИЕ К СЕТИ...',
    'ЗАГРУЗКА ДАННЫХ...',
    'ПРОВЕРКА БЕЗОПАСНОСТИ...',
    'ГОТОВО К ПОДКЛЮЧЕНИЮ'
  ];

  let currentStatus = 0;

  // Обновление статуса
  function updateStatus() {
    const statusEl = document.getElementById('loader-status');
    if (!statusEl) return;

    if (currentStatus < statuses.length - 1) {
      currentStatus++;
      statusEl.textContent = statuses[currentStatus];
      
      // Анимация появления текста
      statusEl.style.opacity = '0';
      setTimeout(() => {
        statusEl.style.opacity = '1';
      }, 100);
    }
  }

  // Симуляция загрузки
  function simulateLoad() {
    const progressBar = document.getElementById('loader-progress');
    if (!progressBar) return;

    let progress = 0;
    const duration = 2800; // 2.8 секунды
    const interval = 50;
    const increment = 100 / (duration / interval);

    const timer = setInterval(() => {
      progress += increment;
      if (progress >= 100) {
        progress = 100;
        clearInterval(timer);
        finishLoading();
      }
      progressBar.style.width = progress + '%';

      // Обновляем статус каждые 20%
      if (progress % 20 < increment && progress > 0) {
        updateStatus();
      }
    }, interval);
  }

  // Завершение загрузки
  function finishLoading() {
    const loader = document.getElementById('metro-loader');
    if (!loader) return;

    const statusEl = document.getElementById('loader-status');
    if (statusEl) {
      statusEl.textContent = 'ПОДКЛЮЧЕНИЕ УСПЕШНО';
      statusEl.style.color = '#00ff00';
    }

    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => {
        loader.style.display = 'none';
        // Воспроизводим звук если есть
        const audio = document.getElementById('bg-music');
        if (audio) {
          audio.volume = 0.05;
          audio.play().catch(() => {});
        }
      }, 800);
    }, 500);
  }

  // Инициализация
  function init() {
    createLoader();
    
    // Небольшая задержка перед началом загрузки
    setTimeout(() => {
      simulateLoad();
    }, 300);
  }

  // Запуск при готовности DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

