const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Загрузка переменных окружения
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coldfire', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Подключено к MongoDB');
  
  // Инициализация администраторов
  initializeAdmins();
})
.catch((error) => {
  console.error('❌ Ошибка подключения к MongoDB:', error);
});

// Инициализация администраторов
async function initializeAdmins() {
  const User = require('./models/User');
  const adminUsernames = ['admin', 'alexey_sokolov188', 'egortyfgs_5999', 'sephiroth3246'];
  
  for (const username of adminUsernames) {
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (!existingUser) {
      const admin = new User({
        username: username.toLowerCase(),
        password: 'admin123', // Временный пароль, нужно изменить!
        faction: 'polis',
        role: 'admin',
        discord: ''
      });
      await admin.save();
      console.log(`✅ Создан администратор: ${username}`);
    } else if (existingUser.role !== 'admin') {
      existingUser.role = 'admin';
      await existingUser.save();
      console.log(`✅ Обновлена роль для: ${username}`);
    }
  }
}

// Routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chats');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Сервер работает' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Ошибка:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Внутренняя ошибка сервера'
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 API доступен по адресу: http://localhost:${PORT}/api`);
});

