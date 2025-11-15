/* ============================================
   ЭФФЕКТЫ ДЛЯ METRO 2033
   ============================================ */

(function() {
  'use strict';

  // Создание эффекта падающего пепла
  function createAshEffect() {
    const ashContainer = document.createElement('div');
    ashContainer.id = 'metro-ash-container';
    ashContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9997;
    `;
    document.body.appendChild(ashContainer);

    const ashCount = 30;
    const ashes = [];

    for (let i = 0; i < ashCount; i++) {
      const ash = document.createElement('div');
      ash.className = 'metro-ash-particle';
      
      const x = Math.random() * window.innerWidth;
      const duration = 10 + Math.random() * 20; // 10-30 секунд
      const delay = Math.random() * 5;
      
      ash.style.left = x + 'px';
      ash.style.top = '-10px';
      ash.style.animationDuration = duration + 's';
      ash.style.animationDelay = delay + 's';
      ash.style.opacity = 0.3 + Math.random() * 0.4;
      
      ashContainer.appendChild(ash);
      ashes.push({ el: ash, x, delay });
    }
  }

  // Эффект ripple при клике
  function createRippleEffect() {
    document.addEventListener('click', (e) => {
      // Игнорируем клики на некликабельных элементах
      if (e.target.closest('a, button, .metro-btn, .metro-nav-button')) {
        const ripple = document.createElement('div');
        ripple.className = 'metro-ripple';
        
        const rect = e.target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        ripple.style.width = size + 'px';
        ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        
        e.target.style.position = 'relative';
        e.target.appendChild(ripple);
        
        setTimeout(() => {
          ripple.remove();
        }, 600);
      }
    });
  }

  // Анимация появления элементов при скролле
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('metro-fade-in');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    // Наблюдаем за элементами с классами для анимации
    document.querySelectorAll('.metro-block, .metro-container, .metro-title').forEach(el => {
      observer.observe(el);
    });
  }

  // Инициализация всех эффектов
  function init() {
    createAshEffect();
    createRippleEffect();
    initScrollAnimations();
  }

  // Запуск при готовности DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

