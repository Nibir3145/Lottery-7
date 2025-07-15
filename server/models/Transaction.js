const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'bet', 'win', 'referral', 'bonus'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  method: {
    type: String,
    enum: ['upi', 'bank', 'wallet', 'razorpay'],
    required: function() {
      return ['deposit', 'withdrawal'].includes(this.type);
    }
  },
  razorpayOrderId: {
    type: String,
    sparse: true
  },
  razorpayPaymentId: {
    type: String,
    sparse: true
  },
  razorpaySignature: {
    type: String,
    sparse: true
  },
  upiId: {
    type: String,
    required: function() {
      return this.type === 'withdrawal' && this.method === 'upi';
    }
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String
  },
  description: {
    type: String,
    default: ''
  },
  reference: {
    type: String,
    unique: true,
    sparse: true
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  adminNotes: {
    type: String,
    default: ''
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate unique reference
transactionSchema.pre('save', function(next) {
  if (!this.reference) {
    const prefix = this.type.toUpperCase().substring(0, 3);
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.reference = `${prefix}${timestamp}${random}`;
  }
  next();
});

// Update transaction status
transactionSchema.methods.updateStatus = function(status, adminId = null, notes = '') {
  this.status = status;
  if (adminId) {
    this.processedBy = adminId;
    this.processedAt = new Date();
  }
  if (notes) {
    this.adminNotes = notes;
  }
  return this.save();
};

transactionSchema.index({ user: 1, type: 1, status: 1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);