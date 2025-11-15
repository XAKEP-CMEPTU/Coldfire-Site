const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  sender: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, enum: ['user', 'moderator', 'admin', 'system'], default: 'user' },
  message: { type: String, required: true },
  isSystem: { type: Boolean, default: false },
  file: {
    name: String,
    size: Number,
    type: String,
    url: String
  },
  timestamp: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  discord: {
    type: String,
    required: true
  },
  issue: {
    type: String,
    required: true
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  messages: [messageSchema],
  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now
  }
});

// Индексы для быстрого поиска
chatSchema.index({ userId: 1 });
chatSchema.index({ status: 1 });
chatSchema.index({ updated: -1 });

module.exports = mongoose.model('Chat', chatSchema);

