const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Helper function to get IP address
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         '0.0.0.0';
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian phone number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('referralCode')
    .optional()
    .isLength({ min: 6, max: 6 })
    .withMessage('Invalid referral code')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { username, email, phone, password, referralCode } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email },
        { username },
        { phone }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this email, username, or phone number' 
      });
    }

    // Handle referral code
    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (!referrer) {
        return res.status(400).json({ message: 'Invalid referral code' });
      }
      referredBy = referrer._id;
    }

    // Create new user
    const user = new User({
      username,
      email,
      phone,
      password,
      referredBy
    });

    await user.save();

    // Give referral bonus if applicable
    if (referredBy) {
      const referrer = await User.findById(referredBy);
      const referralBonus = 50; // ₹50 referral bonus
      referrer.balance += referralBonus;
      referrer.referralEarnings += referralBonus;
      await referrer.save();

      // Also give new user a bonus
      user.balance = 25; // ₹25 signup bonus
      await user.save();
    }

    // Track registration activity
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    
    await user.addActivityLog(
      'account_created',
      { 
        referralCode: referralCode || null,
        signupBonus: referredBy ? 25 : 0
      },
      clientIP
    );

    await user.addLoginHistory(clientIP, userAgent);

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
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
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('login')
    .notEmpty()
    .withMessage('Please provide email, username, or phone number'),
  body('password')
    .notEmpty()
    .withMessage('Please provide password')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { login, password } = req.body;

    // Find user by email, username, or phone
    const user = await User.findOne({
      $or: [
        { email: login },
        { username: login },
        { phone: login }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is deactivated' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Track login activity
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    
    await user.addActivityLog(
      'user_login',
      { 
        loginMethod: login.includes('@') ? 'email' : (login.includes('+') ? 'phone' : 'username')
      },
      clientIP
    );

    await user.addLoginHistory(clientIP, userAgent);

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        role: user.role,
        referralCode: user.referralCode,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        role: user.role,
        referralCode: user.referralCode,
        isVerified: user.isVerified,
        stats: user.getStats()
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/verify-token
// @desc    Verify JWT token
// @access  Private
router.post('/verify-token', auth, (req, res) => {
  res.json({ valid: true, user: req.user });
});

module.exports = router;