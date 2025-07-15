const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  gameId: {
    type: String,
    required: true
  },
  period: {
    type: Number,
    required: true
  },
  betType: {
    type: String,
    enum: ['color', 'number', 'size'],
    required: true
  },
  betValue: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  multiplier: {
    type: Number,
    required: true
  },
  potentialWin: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'won', 'lost'],
    default: 'pending'
  },
  result: {
    number: Number,
    color: String,
    size: String
  },
  winAmount: {
    type: Number,
    default: 0
  },
  isWinner: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Calculate potential winnings
betSchema.methods.calculatePotentialWin = function() {
  return this.amount * this.multiplier;
};

// Check if bet is winner
betSchema.methods.checkWin = function(gameResult) {
  let isWin = false;

  if (this.betType === 'color') {
    isWin = this.betValue === gameResult.color;
  } else if (this.betType === 'number') {
    isWin = parseInt(this.betValue) === gameResult.number;
  } else if (this.betType === 'size') {
    isWin = this.betValue === gameResult.size;
  }

  this.isWinner = isWin;
  this.result = gameResult;
  this.status = isWin ? 'won' : 'lost';
  this.winAmount = isWin ? this.potentialWin : 0;

  return isWin;
};

// Get multiplier based on bet type
betSchema.statics.getMultiplier = function(betType, betValue) {
  if (betType === 'color') {
    // Green and Red: 2x, Violet: 4.5x (since 0 and 5 are violet)
    return betValue === 'violet' ? 4.5 : 2;
  } else if (betType === 'number') {
    // Number bets: 9x
    return 9;
  } else if (betType === 'size') {
    // Big/Small: 2x
    return 2;
  }
  return 1;
};

betSchema.index({ user: 1, game: 1, gameId: 1, period: 1 });
betSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Bet', betSchema);