const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true
  },
  period: {
    type: Number,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  result: {
    number: {
      type: Number,
      min: 0,
      max: 9
    },
    color: {
      type: String,
      enum: ['red', 'green', 'violet']
    },
    size: {
      type: String,
      enum: ['big', 'small']
    }
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed'],
    default: 'waiting'
  },
  totalBets: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  colorBets: {
    red: {
      count: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    },
    green: {
      count: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    },
    violet: {
      count: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    }
  },
  sizeBets: {
    big: {
      count: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    },
    small: {
      count: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    }
  },
  numberBets: {
    0: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    1: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    2: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    3: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    4: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    5: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    6: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    7: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    8: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } },
    9: { count: { type: Number, default: 0 }, amount: { type: Number, default: 0 } }
  }
}, {
  timestamps: true
});

// Helper method to determine color from number
gameSchema.methods.getColorFromNumber = function(number) {
  if ([1, 3, 7, 9].includes(number)) {
    return 'green';
  } else if ([2, 4, 6, 8].includes(number)) {
    return 'red';
  } else if ([0, 5].includes(number)) {
    return 'violet';
  }
};

// Helper method to determine size from number
gameSchema.methods.getSizeFromNumber = function(number) {
  return number >= 5 ? 'big' : 'small';
};

// Generate random result
gameSchema.methods.generateRandomResult = function() {
  const number = Math.floor(Math.random() * 10);
  return {
    number,
    color: this.getColorFromNumber(number),
    size: this.getSizeFromNumber(number)
  };
};

// Add bet to game statistics
gameSchema.methods.addBet = function(betType, betValue, amount) {
  this.totalBets += 1;
  this.totalAmount += amount;

  if (betType === 'color') {
    this.colorBets[betValue].count += 1;
    this.colorBets[betValue].amount += amount;
  } else if (betType === 'size') {
    this.sizeBets[betValue].count += 1;
    this.sizeBets[betValue].amount += amount;
  } else if (betType === 'number') {
    this.numberBets[betValue].count += 1;
    this.numberBets[betValue].amount += amount;
  }

  return this.save();
};

gameSchema.index({ gameId: 1, period: 1, status: 1 });

module.exports = mongoose.model('Game', gameSchema);