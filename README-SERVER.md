# Миграция на серверную версию

## Изменения в файлах

### auth-system.js
Файл обновлен для работы с API сервера. Теперь все операции (регистрация, авторизация) выполняются через API.

### chat-system.js → chat-system-server.js
Создан новый файл `chat-system-server.js` для работы с сервером. 

**Важно:** Замените в HTML файлах:
```html
<script src="chat-system.js"></script>
```
на:
```html
<script src="chat-system-server.js"></script>
```

## Настройка API

В файлах `auth-system.js` и `chat-system-server.js` измените URL API если необходимо:

```javascript
const API_BASE_URL = 'http://localhost:3000/api';
```

На продакшене укажите реальный URL сервера.

## Порядок запуска

1. Запустите MongoDB
2. Запустите сервер (`npm start` в папке `server/`)
3. Откройте сайт в браузере

## Миграция данных

Если у вас есть локальные данные в localStorage, их нужно будет перенести в базу данных вручную или создать скрипт миграции.

