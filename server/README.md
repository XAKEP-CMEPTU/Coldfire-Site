# Coldfire Server

Серверная часть для проекта Coldfire Project.

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Настройте переменные окружения:
```bash
cp .env.example .env
```

Отредактируйте `.env` файл и укажите:
- `MONGODB_URI` - строка подключения к MongoDB
- `JWT_SECRET` - секретный ключ для JWT токенов
- `PORT` - порт сервера (по умолчанию 3000)
- `CORS_ORIGIN` - URL фронтенда для CORS

3. Убедитесь, что MongoDB запущен и доступен

4. Запустите сервер:
```bash
npm start
```

Для разработки с автоперезагрузкой:
```bash
npm run dev
```

## API Endpoints

### Авторизация (`/api/auth`)

- `POST /api/auth/register` - Регистрация нового пользователя
- `POST /api/auth/login` - Авторизация
- `GET /api/auth/me` - Получение текущего пользователя
- `POST /api/auth/logout` - Выход

### Чаты (`/api/chats`)

- `GET /api/chats` - Получение всех чатов пользователя
- `GET /api/chats/:chatId` - Получение конкретного чата
- `POST /api/chats` - Создание нового чата
- `POST /api/chats/:chatId/messages` - Отправка сообщения
- `PATCH /api/chats/:chatId` - Обновление чата (редактирование, изменение статуса)

### Пользователи (`/api/users`)

- `GET /api/users` - Получение всех пользователей (только для админов)
- `GET /api/users/:username` - Получение пользователя
- `POST /api/users/:username/ban` - Бан пользователя
- `POST /api/users/:username/unban` - Разбан пользователя
- `POST /api/users/:username/mute` - Мут пользователя
- `POST /api/users/:username/unmute` - Размут пользователя
- `POST /api/users/:username/warn` - Выдача варна
- `PATCH /api/users/:username/role` - Изменение роли (только для админов)

## Структура базы данных

### Users
- username (String, unique)
- password (String, hashed)
- faction (String)
- discord (String)
- role (String: 'user', 'moderator', 'admin')
- ban (Object)
- mute (Object)
- warns (Object)
- createdAt (Date)
- lastLogin (Date)

### Chats
- userId (String)
- discord (String)
- issue (String)
- urgency (String: 'low', 'medium', 'high')
- status (String: 'open', 'closed')
- messages (Array)
- created (Date)
- updated (Date)

## Безопасность

- Пароли хешируются с помощью bcrypt
- JWT токены для аутентификации
- Проверка прав доступа на уровне middleware
- Валидация входных данных

## Первоначальная настройка

При первом запуске сервер автоматически создаст администраторов из списка:
- admin
- alexey_sokolov188
- egortyfgs_5999
- sephiroth3246

**Важно:** Измените пароли администраторов после первого входа!

