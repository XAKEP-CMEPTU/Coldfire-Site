const express = require('express');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { authenticate, isAdmin, isModerator } = require('../middleware/auth');

const router = express.Router();

// Правила чата
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

// Получение всех чатов пользователя (или всех для админа/модератора)
router.get('/', authenticate, async (req, res) => {
  try {
    const isAdminOrMod = req.user.role === 'admin' || req.user.role === 'moderator';
    
    let chats;
    if (isAdminOrMod) {
      // Админы и модераторы видят все чаты
      chats = await Chat.find().sort({ updated: -1 });
    } else {
      // Обычные пользователи видят только свои чаты
      chats = await Chat.find({ userId: req.user.username }).sort({ updated: -1 });
    }

    res.json({ chats });
  } catch (error) {
    console.error('Ошибка получения чатов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение конкретного чата
router.get('/:chatId', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    // Проверка доступа
    const isAdminOrMod = req.user.role === 'admin' || req.user.role === 'moderator';
    if (!isAdminOrMod && chat.userId !== req.user.username) {
      return res.status(403).json({ error: 'Нет доступа к этому чату' });
    }

    res.json({ chat });
  } catch (error) {
    console.error('Ошибка получения чата:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание нового чата
router.post('/', authenticate, async (req, res) => {
  try {
    const { discord, issue, urgency } = req.body;

    if (!discord || !issue) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    // Проверка лимита активных чатов
    const activeChats = await Chat.countDocuments({ 
      userId: req.user.username, 
      status: 'open' 
    });
    
    const maxChatsPerUser = 3; // Можно вынести в настройки
    if (activeChats >= maxChatsPerUser) {
      return res.status(400).json({ 
        error: `Достигнут лимит активных чатов (${maxChatsPerUser}). Закройте один из существующих чатов.` 
      });
    }

    // Проверка мута
    if (req.user.isMuted()) {
      return res.status(403).json({ 
        error: `У вас действует мут до ${req.user.mute.until.toLocaleString('ru-RU')}. ${req.user.mute.reason ? 'Причина: ' + req.user.mute.reason : ''}` 
      });
    }

    // Создание чата
    const chat = new Chat({
      userId: req.user.username,
      discord,
      issue,
      urgency: urgency || 'medium',
      status: 'open',
      messages: [{
        id: 'welcome',
        sender: 'system',
        senderName: 'Система',
        senderRole: 'system',
        message: CHAT_RULES.content,
        isSystem: true,
        timestamp: new Date()
      }]
    });

    await chat.save();

    res.status(201).json({ 
      message: 'Чат создан',
      chat 
    });
  } catch (error) {
    console.error('Ошибка создания чата:', error);
    res.status(500).json({ error: 'Ошибка сервера при создании чата' });
  }
});

// Отправка сообщения в чат
router.post('/:chatId/messages', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message, file } = req.body;

    if (!message && !file) {
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    // Проверка доступа
    const isAdminOrMod = req.user.role === 'admin' || req.user.role === 'moderator';
    if (!isAdminOrMod && chat.userId !== req.user.username) {
      return res.status(403).json({ error: 'Нет доступа к этому чату' });
    }

    // Проверка статуса чата
    if (chat.status === 'closed' && !isAdminOrMod) {
      return res.status(403).json({ error: 'Чат закрыт' });
    }

    // Проверка мута
    if (req.user.isMuted()) {
      return res.status(403).json({ 
        error: `У вас действует мут до ${req.user.mute.until.toLocaleString('ru-RU')}. ${req.user.mute.reason ? 'Причина: ' + req.user.mute.reason : ''}` 
      });
    }

    // Обработка команды /мут (только для модераторов)
    if ((isAdminOrMod) && message && message.startsWith('/мут ')) {
      const parts = message.replace(/^\/мут\s+/i, '').split(/\s+/);
      const target = parts.shift();
      const durStr = parts.shift();
      const reason = parts.join(' ') || '';

      if (!target || !durStr) {
        return res.status(400).json({ error: 'Использование: /мут <ник> <время> <причина>' });
      }

      const ms = parseDurationToMs(durStr);
      if (!ms) {
        return res.status(400).json({ error: 'Неверный формат времени мута' });
      }

      const targetUser = await User.findOne({ username: target.toLowerCase() });
      if (!targetUser) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      targetUser.mute.until = new Date(Date.now() + ms);
      targetUser.mute.reason = reason;
      await targetUser.save();

      // Добавляем системное сообщение
      const sysMsg = {
        id: Date.now().toString(),
        sender: 'system',
        senderName: 'Система',
        senderRole: 'system',
        isSystem: true,
        message: `Пользователь ${target} получил мут на ${durStr}. ${reason ? ('Причина: ' + reason) : ''}`,
        timestamp: new Date()
      };

      chat.messages.push(sysMsg);
      chat.updated = new Date();
      await chat.save();

      return res.json({ 
        message: 'Мут применен',
        chat 
      });
    }

    // Обычное сообщение
    const newMessage = {
      id: Date.now().toString(),
      sender: req.user.username,
      senderName: req.user.username + (req.user.role === 'admin' ? ' (Администратор)' : (req.user.role === 'moderator' ? ' (Модератор)' : '')),
      senderRole: req.user.role,
      message: message || (file ? `Прикреплён файл: ${file.name}` : ''),
      file: file || null,
      timestamp: new Date()
    };

    chat.messages.push(newMessage);
    chat.updated = new Date();
    await chat.save();

    res.json({ 
      message: 'Сообщение отправлено',
      chat 
    });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({ error: 'Ошибка сервера при отправке сообщения' });
  }
});

// Обновление чата (редактирование, изменение статуса)
router.patch('/:chatId', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { issue, status } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Чат не найден' });
    }

    const isAdminOrMod = req.user.role === 'admin' || req.user.role === 'moderator';

    // Редактирование описания (только админы)
    if (issue !== undefined && isAdminOrMod) {
      chat.issue = issue;
      chat.updated = new Date();
    }

    // Изменение статуса (только админы)
    if (status !== undefined && isAdminOrMod) {
      const oldStatus = chat.status;
      chat.status = status;
      chat.updated = new Date();

      // Добавляем системное сообщение
      chat.messages.push({
        id: Date.now().toString(),
        sender: 'system',
        senderName: 'Система',
        senderRole: 'system',
        isSystem: true,
        message: `Чат ${status === 'closed' ? 'закрыт' : 'открыт'} администратором.`,
        timestamp: new Date()
      });
    }

    await chat.save();

    res.json({ 
      message: 'Чат обновлен',
      chat 
    });
  } catch (error) {
    console.error('Ошибка обновления чата:', error);
    res.status(500).json({ error: 'Ошибка сервера при обновлении чата' });
  }
});

// Вспомогательная функция для парсинга времени
function parseDurationToMs(str) {
  const m = String(str || '').trim().match(/^(\d+)\s*(m|h|d|w)?$/i);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  const unit = (m[2] || 'm').toLowerCase();
  const map = { 
    m: 60 * 1000, 
    h: 60 * 60 * 1000, 
    d: 24 * 60 * 60 * 1000, 
    w: 7 * 24 * 60 * 60 * 1000 
  };
  return num * (map[unit] || map.m);
}

module.exports = router;

