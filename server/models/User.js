const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  password: {
    type: String,
    required: true
  },
  faction: {
    type: String,
    required: true,
    enum: ['redline', 'kitaigorod', '4reykh', 'hanza', 'free', 'militia', 'spetsnaz', 'necropolis', 'baltic', 'london', 'dynamo', 'police', 'dolg', 'republic', 'tunnelers', 'vory', 'zvezda', 'siberian', 'darkness', 'limon', 'none']
  },
  discord: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  statusId: {
    type: Number,
    default: 0 // 0 - чист, 1 - забанен
  },
  ban: {
    isBanned: { type: Boolean, default: false },
    until: { type: Date, default: null },
    reason: { type: String, default: '' }
  },
  mute: {
    until: { type: Date, default: null },
    reason: { type: String, default: '' }
  },
  warns: {
    count: { type: Number, default: 0 },
    list: [{
      reason: String,
      at: { type: Date, default: Date.now }
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  }
});

// Хеширование пароля перед сохранением
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Метод для проверки пароля
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Метод для проверки бана
userSchema.methods.isBanned = function() {
  if (!this.ban.isBanned) return false;
  if (!this.ban.until) return true;
  return new Date() < this.ban.until;
};

// Метод для проверки мута
userSchema.methods.isMuted = function() {
  if (!this.mute.until) return false;
  return new Date() < this.mute.until;
};

module.exports = mongoose.model('User', userSchema);

