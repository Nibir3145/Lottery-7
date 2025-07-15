const express = require('express');
const { body, validationResult } = require('express-validator');
const { adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const Game = require('../models/Game');
const Bet = require('../models/Bet');
const Transaction = require('../models/Transaction');

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Private (Admin only)
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    // Get overall statistics
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
    const totalGames = await Game.countDocuments({ status: 'completed' });
    const totalBets = await Bet.countDocuments();

    // Get financial statistics
    const totalDeposits = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalWithdrawals = await Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalWinnings = await Transaction.aggregate([
      { $match: { type: 'win', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const pendingWithdrawals = await Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    // Get recent activity
    const recentUsers = await User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username email phone balance createdAt');

    const recentGames = await Game.find({ status: 'completed' })
      .sort({ period: -1 })
      .limit(5)
      .select('period result totalBets totalAmount createdAt');

    res.json({
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        games: {
          total: totalGames
        },
        bets: {
          total: totalBets
        },
        financial: {
          totalDeposits: totalDeposits[0]?.total || 0,
          totalWithdrawals: totalWithdrawals[0]?.total || 0,
          totalWinnings: totalWinnings[0]?.total || 0,
          pendingWithdrawals: pendingWithdrawals[0]?.total || 0,
          pendingWithdrawalCount: pendingWithdrawals[0]?.count || 0,
          profit: (totalDeposits[0]?.total || 0) - (totalWithdrawals[0]?.total || 0) - (totalWinnings[0]?.total || 0)
        }
      },
      recentActivity: {
        users: recentUsers,
        games: recentGames
      }
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination
// @access  Private (Admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { limit = 20, page = 1, search, status } = req.query;
    const skip = (page - 1) * limit;

    let query = { role: 'user' };
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.isActive = status === 'active';
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-password');

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: skip + users.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (activate/deactivate)
// @access  Private (Admin only)
router.put('/users/:id/status', [
  body('isActive').isBoolean().withMessage('isActive must be boolean')
], adminAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id/balance
// @desc    Update user balance
// @access  Private (Admin only)
router.put('/users/:id/balance', [
  body('amount').isFloat().withMessage('Amount must be a number'),
  body('type').isIn(['add', 'subtract', 'set']).withMessage('Invalid type'),
  body('notes').optional().isString().withMessage('Notes must be string')
], adminAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { amount, type, notes } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const balanceBefore = user.balance;
    let balanceAfter;

    if (type === 'add') {
      balanceAfter = balanceBefore + amount;
      user.balance = balanceAfter;
    } else if (type === 'subtract') {
      balanceAfter = Math.max(0, balanceBefore - amount);
      user.balance = balanceAfter;
    } else if (type === 'set') {
      balanceAfter = Math.max(0, amount);
      user.balance = balanceAfter;
    }

    await user.save();

    // Create transaction record
    const transaction = new Transaction({
      user: user._id,
      type: 'bonus',
      amount: Math.abs(balanceAfter - balanceBefore),
      status: 'completed',
      method: 'admin',
      description: notes || `Balance ${type} by admin`,
      balanceBefore,
      balanceAfter,
      processedBy: req.user._id,
      processedAt: new Date()
    });

    await transaction.save();

    res.json({
      message: 'Balance updated successfully',
      user: {
        id: user._id,
        username: user.username,
        balance: user.balance
      },
      transaction: {
        id: transaction._id,
        reference: transaction.reference
      }
    });

  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/transactions
// @desc    Get all transactions
// @access  Private (Admin only)
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const { limit = 20, page = 1, type, status, userId } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (userId) query.user = userId;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('user', 'username email phone')
      .populate('processedBy', 'username');

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

// @route   PUT /api/admin/transactions/:id/status
// @desc    Update transaction status
// @access  Private (Admin only)
router.put('/transactions/:id/status', [
  body('status').isIn(['pending', 'completed', 'failed', 'cancelled']).withMessage('Invalid status'),
  body('notes').optional().isString().withMessage('Notes must be string')
], adminAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    const transaction = await Transaction.findById(id).populate('user');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const oldStatus = transaction.status;
    await transaction.updateStatus(status, req.user._id, notes);

    // Handle balance updates for withdrawal status changes
    if (transaction.type === 'withdrawal') {
      const user = transaction.user;
      
      if (oldStatus === 'pending' && status === 'failed') {
        // Refund the withdrawal amount
        await user.updateBalance(transaction.amount, 'add');
      } else if (oldStatus === 'pending' && status === 'completed') {
        // Mark withdrawal as completed (money already deducted)
        user.totalWithdrawn += transaction.amount;
        await user.save();
      }
    }

    res.json({
      message: 'Transaction status updated successfully',
      transaction
    });

  } catch (error) {
    console.error('Update transaction status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/games
// @desc    Get game history for admin
// @access  Private (Admin only)
router.get('/games', adminAuth, async (req, res) => {
  try {
    const { limit = 20, page = 1, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;

    const games = await Game.find(query)
      .sort({ period: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Game.countDocuments(query);

    res.json({
      games,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: skip + games.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/bets
// @desc    Get all bets
// @access  Private (Admin only)
router.get('/bets', adminAuth, async (req, res) => {
  try {
    const { limit = 20, page = 1, gameId, userId, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (gameId) query.gameId = gameId;
    if (userId) query.user = userId;
    if (status) query.status = status;

    const bets = await Bet.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('user', 'username email phone')
      .populate('game', 'period result status');

    const total = await Bet.countDocuments(query);

    res.json({
      bets,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: skip + bets.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get bets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;