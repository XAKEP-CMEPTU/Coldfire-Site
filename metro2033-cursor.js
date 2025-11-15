/* ============================================
   ИММЕРСИВНЫЙ КУРСОР METRO 2033 — v2
   Эффекты: дрожь, шлейф, глитч, радио-режим, вспышка клика
   ============================================ */

   (function () {
    'use strict';
  
    let isRadioActive = false;
    let isGlitchActive = false;
    let lastX = 0, lastY = 0;
    let trailTimeout = null;
  
    function initCursor() {
      if (document.getElementById('metro-cursor')) return;
  
      document.body.style.cursor = 'none';
  
      // Основной курсор
      const cursor = document.createElement('div');
      cursor.id = 'metro-cursor';
      cursor.className = 'metro-cursor default';
      cursor.innerHTML = `
        <svg viewBox="0 0 24 24" class="metro-cursor-crosshair">
          <circle cx="12" cy="12" r="10" stroke-dasharray="4,4" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
      `;
      document.body.appendChild(cursor);
  
      // Контейнер для шлейфов
      const trailContainer = document.createElement('div');
      trailContainer.id = 'metro-cursor-trails';
      trailContainer.style.position = 'fixed';
      trailContainer.style.top = '0';
      trailContainer.style.left = '0';
      trailContainer.style.pointerEvents = 'none';
      trailContainer.style.zIndex = '9997';
      document.body.appendChild(trailContainer);
  
      // Эффект клика
      const cursorClick = document.createElement('div');
      cursorClick.id = 'metro-cursor-click';
      cursorClick.className = 'metro-cursor-click';
      document.body.appendChild(cursorClick);
  
      // Дрожание (дыхание)
      function breathe() {
        if (!cursor.classList.contains('clicking')) {
          const intensity = 0.8;
          const dx = (Math.random() - 0.5) * intensity;
          const dy = (Math.random() - 0.5) * intensity;
          cursor.style.transform = `translate(${dx}px, ${dy}px) scale(1)`;
        }
        requestAnimationFrame(breathe);
      }
      breathe();
  
      // Отслеживание мыши
      document.addEventListener('mousemove', (e) => {
        const speed = Math.sqrt((e.clientX - lastX) ** 2 + (e.clientY - lastY) ** 2);
        lastX = e.clientX;
        lastY = e.clientY;
  
        // Плавное позиционирование
        cursor.style.left = (e.clientX - 12) + 'px';
        cursor.style.top = (e.clientY - 12) + 'px';
  
        // Шлейф при быстром движении
        if (speed > 10 && !cursor.classList.contains('wait')) {
          createTrail(e.clientX, e.clientY);
        }
      });
  
      // Клик
      document.addEventListener('mousedown', () => {
        cursor.classList.add('clicking');
        cursor.style.filter = 'blur(1px)';
        setTimeout(() => {
          cursor.classList.remove('clicking');
          cursor.style.filter = '';
        }, 100);
      });
  
      // Вспышка при клике (уже есть, но усилена)
      document.addEventListener('mousedown', (e) => {
        cursorClick.style.left = (e.clientX - 12) + 'px';
        cursorClick.style.top = (e.clientY - 12) + 'px';
        cursorClick.style.transform = 'scale(0)';
        cursorClick.style.opacity = '1';
        setTimeout(() => {
          cursorClick.style.transform = 'scale(2)';
          cursorClick.style.opacity = '0';
        }, 10);
  
        // Радиальные помехи
        createRipple(e.clientX, e.clientY);
      });
  
      // Управление состояниями
      const states = {
        clickable: 'a, button, .metro-nav-button, .metro-btn, input[type="submit"], input[type="button"]',
        text: 'input:not([type]), input[type="text"], textarea, [contenteditable]',
        wait: '[data-cursor="wait"]',
        grab: '[data-cursor="grab"]',
        notAllowed: '[data-cursor="not-allowed"]',
        glitch: '[data-cursor="glitch"], .enemy-unit, .hostile'
      };
  
      function updateCursorState(target) {
        cursor.className = 'metro-cursor';
  
        if (target.closest(states.clickable)) cursor.classList.add('clickable');
        else if (target.closest(states.text)) cursor.classList.add('text');
        else if (target.closest(states.wait)) cursor.classList.add('wait');
        else if (target.closest(states.grab)) cursor.classList.add('grab');
        else if (target.closest(states.notAllowed)) cursor.classList.add('not-allowed');
        else if (target.closest(states.glitch)) cursor.classList.add('glitch');
        else cursor.classList.add(isRadioActive ? 'radio' : 'default');
  
        document.body.setAttribute('data-cursor-mode', cursor.className.replace('metro-cursor ', ''));
      }
  
      document.addEventListener('mouseover', (e) => updateCursorState(e.target));
      document.addEventListener('mouseout', () => {
        cursor.className = 'metro-cursor ' + (isRadioActive ? 'radio' : 'default');
        document.body.setAttribute('data-cursor-mode', isRadioActive ? 'radio' : 'default');
      });
  
      // === Вспомогательные функции эффектов ===
  
      function createTrail(x, y) {
        const trail = document.createElement('div');
        trail.className = 'metro-cursor-trail';
        trail.style.position = 'absolute';
        trail.style.left = (x - 12) + 'px';
        trail.style.top = (y - 12) + 'px';
        trail.style.width = '24px';
        trail.style.height = '24px';
        trail.style.pointerEvents = 'none';
        trail.style.opacity = '0.6';
        trail.style.zIndex = '9996';
        trail.innerHTML = cursor.innerHTML;
        trailContainer.appendChild(trail);
  
        // Анимация исчезновения
        setTimeout(() => {
          trail.style.opacity = '0';
          trail.style.transform = 'scale(1.2)';
          setTimeout(() => trail.remove(), 300);
        }, 0);
      }
  
      function createRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.className = 'metro-ripple';
        ripple.style.position = 'fixed';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.width = '4px';
        ripple.style.height = '4px';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'radial-gradient(circle, rgba(255,42,42,0.8) 0%, transparent 70%)';
        ripple.style.pointerEvents = 'none';
        ripple.style.zIndex = '9995';
        ripple.style.transform = 'scale(0)';
        document.body.appendChild(ripple);
  
        setTimeout(() => {
          ripple.style.transition = 'transform 0.6s ease-out, opacity 0.6s ease-out';
          ripple.style.transform = 'scale(20)';
          ripple.style.opacity = '0';
        }, 10);
  
        setTimeout(() => ripple.remove(), 700);
      }
  
      // === API для внешнего управления ===
  
      window.MetroCursor = {
        setRadioMode: (active) => {
          isRadioActive = active;
          if (active) cursor.classList.add('radio');
          else cursor.classList.remove('radio');
          document.body.setAttribute('data-cursor-mode', cursor.className.replace('metro-cursor ', ''));
        },
        triggerGlitch: (duration = 500) => {
          cursor.classList.add('glitch');
          setTimeout(() => cursor.classList.remove('glitch'), duration);
        }
      };
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initCursor);
    } else {
      initCursor();
    }
  })();