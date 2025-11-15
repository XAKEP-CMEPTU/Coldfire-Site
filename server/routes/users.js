const express = require('express');
const User = require('../models/User');
const { authenticate, isAdmin, isModerator } = require('../middleware/auth');

const router = express.Router();

// Получение всех пользователей (только для админов)
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение конкретного пользователя
router.get('/:username', authenticate, async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username: username.toLowerCase() }).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Обычные пользователи могут видеть только публичную информацию
    const isAdminOrMod = req.user.role === 'admin' || req.user.role === 'moderator';
    const isOwnProfile = req.user.username === username.toLowerCase();

    if (!isAdminOrMod && !isOwnProfile) {
      return res.json({
        user: {
          username: user.username,
          faction: user.faction,
          createdAt: user.createdAt
        }
      });
    }

    res.json({ user });
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Бан пользователя
router.post('/:username/ban', authenticate, isModerator, async (req, res) => {
  try {
    const { username } = req.params;
    const { until, reason } = req.body;

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Нельзя забанить другого админа
    if (user.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Недостаточно прав для бана администратора' });
    }

    user.ban = {
      isBanned: true,
      until: until ? new Date(until) : null,
      reason: reason || ''
    };
    user.statusId = 1;

    await user.save();

    res.json({ 
      message: 'Пользователь забанен',
      user: {
        username: user.username,
        ban: user.ban
      }
    });
  } catch (error) {
    console.error('Ошибка бана пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Разбан пользователя
router.post('/:username/unban', authenticate, isModerator, async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    user.ban = {
      isBanned: false,
      until: null,
      reason: ''
    };
    user.statusId = 0;

    await user.save();

    res.json({ 
      message: 'Пользователь разбанен',
      user: {
        username: user.username,
        ban: user.ban
      }
    });
  } catch (error) {
    console.error('Ошибка разбана пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Мут пользователя
router.post('/:username/mute', authenticate, isModerator, async (req, res) => {
  try {
    const { username } = req.params;
    const { duration, reason } = req.body;

    if (!duration) {
      return res.status(400).json({ error: 'Укажите длительность мута' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const ms = parseDurationToMs(duration);
    if (!ms) {
      return res.status(400).json({ error: 'Неверный формат времени мута' });
    }

    user.mute = {
      until: new Date(Date.now() + ms),
      reason: reason || ''
    };

    await user.save();

    res.json({ 
      message: 'Пользователь замьючен',
      user: {
        username: user.username,
        mute: user.mute
      }
    });
  } catch (error) {
    console.error('Ошибка мута пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Размут пользователя
router.post('/:username/unmute', authenticate, isModerator, async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    user.mute = {
      until: null,
      reason: ''
    };

    await user.save();

    res.json({ 
      message: 'Пользователь размьючен',
      user: {
        username: user.username,
        mute: user.mute
      }
    });
  } catch (error) {
    console.error('Ошибка размута пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Выдача варна
router.post('/:username/warn', authenticate, isModerator, async (req, res) => {
  try {
    const { username } = req.params;
    const { reason } = req.body;

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (!user.warns) {
      user.warns = { count: 0, list: [] };
    }

    user.warns.count += 1;
    user.warns.list.push({
      reason: reason || '',
      at: new Date()
    });

    // 3 варна = бан на месяц
    let autoBanApplied = false;
    if (user.warns.count >= 3) {
      const untilISO = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      user.ban = {
        isBanned: true,
        until: new Date(untilISO),
        reason: '3 предупреждения'
      };
      user.statusId = 1;
      autoBanApplied = true;
    }

    await user.save();

    res.json({ 
      message: 'Варн выдан',
      autoBanApplied,
      user: {
        username: user.username,
        warns: user.warns
      }
    });
  } catch (error) {
    console.error('Ошибка выдачи варна:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Изменение роли пользователя (только для админов)
router.patch('/:username/role', authenticate, isAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    const { role } = req.body;

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Неверная роль' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    user.role = role;
    await user.save();

    res.json({ 
      message: 'Роль изменена',
      user: {
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Ошибка изменения роли:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
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

