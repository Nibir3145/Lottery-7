const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String
  },
  upiId: {
    type: String,
    trim: true
  },
  totalDeposited: {
    type: Number,
    default: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  totalWinnings: {
    type: Number,
    default: 0
  },
  totalLosses: {
    type: Number,
    default: 0
  },
  referralCode: {
    type: String,
    unique: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralEarnings: {
    type: Number,
    default: 0
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  avatar: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Hash password before saving
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

// Generate referral code before saving
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Update balance method
userSchema.methods.updateBalance = function(amount, type) {
  if (type === 'add') {
    this.balance += amount;
  } else if (type === 'subtract') {
    this.balance = Math.max(0, this.balance - amount);
  }
  return this.save();
};

// Get user stats
userSchema.methods.getStats = function() {
  return {
    totalDeposited: this.totalDeposited,
    totalWithdrawn: this.totalWithdrawn,
    totalWinnings: this.totalWinnings,
    totalLosses: this.totalLosses,
    netProfit: this.totalWinnings - this.totalLosses,
    referralEarnings: this.referralEarnings
  };
};

userSchema.index({ email: 1, username: 1, phone: 1 });

module.exports = mongoose.model('User', userSchema);