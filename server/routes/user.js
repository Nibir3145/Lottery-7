const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Bet = require('../models/Bet');

const router = express.Router();

// @route   GET /api/user/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        referralCode: user.referralCode,
        isVerified: user.isVerified,
        stats: user.getStats(),
        bankDetails: user.bankDetails,
        upiId: user.upiId,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian phone number')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { username, email, phone } = req.body;
    const userId = req.user._id;

    // Check if new values are already taken by other users
    if (username) {
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already taken' });
      }
    }

    if (phone) {
      const existingUser = await User.findOne({ 
        phone, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Phone number already taken' });
      }
    }

    // Update user
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        referralCode: user.referralCode
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/user/bank-details
// @desc    Update bank details
// @access  Private
router.put('/bank-details', [
  body('accountNumber')
    .isLength({ min: 8, max: 20 })
    .withMessage('Account number must be between 8 and 20 digits')
    .isNumeric()
    .withMessage('Account number must contain only numbers'),
  body('ifscCode')
    .isLength({ min: 11, max: 11 })
    .withMessage('IFSC code must be 11 characters')
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .withMessage('Invalid IFSC code format'),
  body('accountHolderName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Account holder name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Account holder name can only contain letters and spaces'),
  body('bankName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Bank name must be between 2 and 50 characters')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { accountNumber, ifscCode, accountHolderName, bankName } = req.body;
    const userId = req.user._id;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        bankDetails: {
          accountNumber,
          ifscCode: ifscCode.toUpperCase(),
          accountHolderName,
          bankName
        }
      },
      { new: true }
    ).select('-password');

    res.json({
      message: 'Bank details updated successfully',
      bankDetails: user.bankDetails
    });

  } catch (error) {
    console.error('Update bank details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/user/upi
// @desc    Update UPI ID
// @access  Private
router.put('/upi', [
  body('upiId')
    .trim()
    .matches(/^[\w\.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9\.\-]{1,64}$/)
    .withMessage('Invalid UPI ID format')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { upiId } = req.body;
    const userId = req.user._id;

    const user = await User.findByIdAndUpdate(
      userId,
      { upiId },
      { new: true }
    ).select('-password');

    res.json({
      message: 'UPI ID updated successfully',
      upiId: user.upiId
    });

  } catch (error) {
    console.error('Update UPI error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/user/referrals
// @desc    Get user's referral information
// @access  Private
router.get('/referrals', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get referred users
    const referredUsers = await User.find({ referredBy: userId })
      .select('username email createdAt totalDeposited')
      .sort({ createdAt: -1 });

    // Calculate referral earnings
    const user = await User.findById(userId).select('referralEarnings referralCode');

    res.json({
      referralCode: user.referralCode,
      totalEarnings: user.referralEarnings,
      referredUsers: referredUsers.map(u => ({
        username: u.username,
        email: u.email,
        joinedAt: u.createdAt,
        totalDeposited: u.totalDeposited
      })),
      totalReferrals: referredUsers.length
    });

  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/user/stats
// @desc    Get detailed user statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Get betting statistics
    const bettingStats = await Bet.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalWinnings: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'won'] }, '$winAmount', 0] 
            } 
          }
        }
      }
    ]);

    // Get monthly statistics
    const monthlyStats = await Bet.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalBets: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalWinnings: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'won'] }, '$winAmount', 0] 
            } 
          }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Get recent transactions
    const recentTransactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('type amount status description createdAt reference');

    res.json({
      userStats: user.getStats(),
      bettingStats,
      monthlyStats,
      recentTransactions,
      accountInfo: {
        balance: user.balance,
        totalDeposited: user.totalDeposited,
        totalWithdrawn: user.totalWithdrawn,
        referralEarnings: user.referralEarnings,
        memberSince: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/user/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    
    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;