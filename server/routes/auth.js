const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Генерация JWT токена
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { username, password, faction, discord } = req.body;

    // Валидация
    if (!username || !password || !faction) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Логин должен быть от 3 до 20 символов' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }

    // Проверка существования пользователя
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Логин уже занят' });
    }

    // Создание пользователя
    const user = new User({
      username: username.toLowerCase(),
      password,
      faction,
      discord: discord || '',
      role: 'user'
    });

    await user.save();

    // Генерация токена
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Регистрация успешна',
      token,
      user: {
        id: user._id,
        username: user.username,
        faction: user.faction,
        discord: user.discord,
        role: user.role,
        isAdmin: user.role === 'admin'
      }
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

// Авторизация
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Введите логин и пароль' });
    }

    // Поиск пользователя
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    // Проверка пароля
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    // Проверка бана
    if (user.isBanned()) {
      const banInfo = {
        isBanned: true,
        until: user.ban.until,
        reason: user.ban.reason || 'Не указана'
      };
      return res.status(403).json({ 
        error: 'Аккаунт заблокирован',
        ban: banInfo
      });
    }

    // Обновление времени последнего входа
    user.lastLogin = new Date();
    await user.save();

    // Генерация токена
    const token = generateToken(user._id);

    res.json({
      message: 'Авторизация успешна',
      token,
      user: {
        id: user._id,
        username: user.username,
        faction: user.faction,
        discord: user.discord,
        role: user.role,
        isAdmin: user.role === 'admin'
      }
    });
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    res.status(500).json({ error: 'Ошибка сервера при авторизации' });
  }
});

// Получение текущего пользователя
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        faction: req.user.faction,
        discord: req.user.discord,
        role: req.user.role,
        isAdmin: req.user.role === 'admin',
        isMuted: req.user.isMuted(),
        mute: req.user.mute
      }
    });
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Выход (на клиенте просто удаляется токен)
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Выход выполнен' });
});

module.exports = router;

