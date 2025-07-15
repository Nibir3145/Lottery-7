const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @route   POST /api/payment/create-order
// @desc    Create Razorpay order for deposit
// @access  Private
router.post('/create-order', [
  body('amount')
    .isFloat({ min: 100, max: 50000 })
    .withMessage('Amount must be between ₹100 and ₹50,000')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { amount } = req.body;
    const user = req.user;

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      receipt: `receipt_${user._id}_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    // Create transaction record
    const transaction = new Transaction({
      user: user._id,
      type: 'deposit',
      amount: amount,
      method: 'razorpay',
      razorpayOrderId: order.id,
      status: 'pending',
      balanceBefore: user.balance,
      balanceAfter: user.balance,
      description: `Deposit via Razorpay`
    });

    await transaction.save();

    res.json({
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID
      },
      transaction: {
        id: transaction._id,
        reference: transaction.reference
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error while creating order' });
  }
});

// @route   POST /api/payment/verify-payment
// @desc    Verify Razorpay payment
// @access  Private
router.post('/verify-payment', [
  body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
  body('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
  body('razorpay_signature').notEmpty().withMessage('Signature is required')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Find transaction
    const transaction = await Transaction.findOne({
      razorpayOrderId: razorpay_order_id,
      user: req.user._id,
      status: 'pending'
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Update transaction
    transaction.razorpayPaymentId = razorpay_payment_id;
    transaction.razorpaySignature = razorpay_signature;
    transaction.status = 'completed';
    transaction.balanceAfter = req.user.balance + transaction.amount;
    await transaction.save();

    // Update user balance
    const user = await User.findById(req.user._id);
    await user.updateBalance(transaction.amount, 'add');
    user.totalDeposited += transaction.amount;
    await user.save();

    res.json({
      message: 'Payment verified successfully',
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        status: transaction.status,
        reference: transaction.reference
      },
      newBalance: user.balance
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Server error while verifying payment' });
  }
});

// @route   POST /api/payment/withdraw
// @desc    Request withdrawal
// @access  Private
router.post('/withdraw', [
  body('amount')
    .isFloat({ min: 100 })
    .withMessage('Minimum withdrawal amount is ₹100'),
  body('method')
    .isIn(['upi', 'bank'])
    .withMessage('Invalid withdrawal method'),
  body('upiId')
    .if(body('method').equals('upi'))
    .notEmpty()
    .withMessage('UPI ID is required for UPI withdrawal'),
  body('bankDetails.accountNumber')
    .if(body('method').equals('bank'))
    .notEmpty()
    .withMessage('Account number is required for bank withdrawal'),
  body('bankDetails.ifscCode')
    .if(body('method').equals('bank'))
    .notEmpty()
    .withMessage('IFSC code is required for bank withdrawal'),
  body('bankDetails.accountHolderName')
    .if(body('method').equals('bank'))
    .notEmpty()
    .withMessage('Account holder name is required for bank withdrawal')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { amount, method, upiId, bankDetails } = req.body;
    const user = await User.findById(req.user._id);

    // Check if user has sufficient balance
    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Check minimum balance after withdrawal (keep ₹10)
    if (user.balance - amount < 10) {
      return res.status(400).json({ message: 'Minimum balance of ₹10 must be maintained' });
    }

    // Create withdrawal transaction
    const transaction = new Transaction({
      user: user._id,
      type: 'withdrawal',
      amount: amount,
      method: method,
      status: 'pending',
      balanceBefore: user.balance,
      balanceAfter: user.balance - amount,
      description: `Withdrawal via ${method.toUpperCase()}`
    });

    if (method === 'upi') {
      transaction.upiId = upiId;
    } else if (method === 'bank') {
      transaction.bankDetails = bankDetails;
    }

    await transaction.save();

    // Deduct amount from user balance
    await user.updateBalance(amount, 'subtract');

    res.json({
      message: 'Withdrawal request submitted successfully',
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        method: transaction.method,
        status: transaction.status,
        reference: transaction.reference
      },
      newBalance: user.balance
    });

  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ message: 'Server error while processing withdrawal' });
  }
});

// @route   GET /api/payment/transactions
// @desc    Get user's transaction history
// @access  Private
router.get('/transactions', auth, async (req, res) => {
  try {
    const { limit = 20, page = 1, type, status } = req.query;
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };
    if (type) query.type = type;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-user -razorpaySignature');

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: skip + transactions.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/payment/balance
// @desc    Get user's current balance
// @access  Private
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('balance totalDeposited totalWithdrawn');
    
    res.json({
      balance: user.balance,
      totalDeposited: user.totalDeposited,
      totalWithdrawn: user.totalWithdrawn
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;