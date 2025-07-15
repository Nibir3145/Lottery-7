const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const gameService = require('../services/gameService');
const Game = require('../models/Game');
const Bet = require('../models/Bet');

const router = express.Router();

// @route   GET /api/game/current
// @desc    Get current active game
// @access  Private
router.get('/current', auth, async (req, res) => {
  try {
    const currentGame = gameService.getCurrentGame();
    
    if (!currentGame) {
      return res.status(404).json({ message: 'No active game found' });
    }

    const timeLeft = gameService.getTimeLeft();

    res.json({
      game: {
        id: currentGame._id,
        gameId: currentGame.gameId,
        period: currentGame.period,
        startTime: currentGame.startTime,
        endTime: currentGame.endTime,
        timeLeft,
        status: currentGame.status,
        totalBets: currentGame.totalBets,
        totalAmount: currentGame.totalAmount,
        colorBets: currentGame.colorBets,
        sizeBets: currentGame.sizeBets
      }
    });
  } catch (error) {
    console.error('Get current game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/game/history
// @desc    Get game history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const games = await Game.find({ status: 'completed' })
      .sort({ period: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('period result createdAt totalBets totalAmount');

    const total = await Game.countDocuments({ status: 'completed' });

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
    console.error('Get game history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/game/bet
// @desc    Place a bet
// @access  Private
router.post('/bet', [
  body('betType')
    .isIn(['color', 'number', 'size'])
    .withMessage('Invalid bet type'),
  body('betValue')
    .notEmpty()
    .withMessage('Bet value is required'),
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least 1')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { betType, betValue, amount } = req.body;

    // Validate bet value based on type
    if (betType === 'color' && !['red', 'green', 'violet'].includes(betValue)) {
      return res.status(400).json({ message: 'Invalid color value' });
    }

    if (betType === 'size' && !['big', 'small'].includes(betValue)) {
      return res.status(400).json({ message: 'Invalid size value' });
    }

    if (betType === 'number') {
      const num = parseInt(betValue);
      if (isNaN(num) || num < 0 || num > 9) {
        return res.status(400).json({ message: 'Invalid number value' });
      }
    }

    const bet = await gameService.placeBet(req.user._id, betType, betValue, parseInt(amount));

    res.json({
      message: 'Bet placed successfully',
      bet: {
        id: bet._id,
        gameId: bet.gameId,
        period: bet.period,
        betType: bet.betType,
        betValue: bet.betValue,
        amount: bet.amount,
        multiplier: bet.multiplier,
        potentialWin: bet.potentialWin
      }
    });

  } catch (error) {
    console.error('Place bet error:', error);
    if (error.message.includes('No active game') || 
        error.message.includes('Betting time expired') ||
        error.message.includes('Insufficient balance') ||
        error.message.includes('Bet amount must be')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error while placing bet' });
  }
});

// @route   GET /api/game/my-bets
// @desc    Get user's bet history
// @access  Private
router.get('/my-bets', auth, async (req, res) => {
  try {
    const { limit = 20, page = 1, status, gameId } = req.query;
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };
    if (status) query.status = status;
    if (gameId) query.gameId = gameId;

    const bets = await Bet.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('game', 'period result status')
      .select('-user');

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
    console.error('Get my bets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/game/my-bets/:gameId
// @desc    Get user's bets for specific game
// @access  Private
router.get('/my-bets/:gameId', auth, async (req, res) => {
  try {
    const { gameId } = req.params;

    const bets = await Bet.find({
      user: req.user._id,
      gameId: gameId
    })
    .sort({ createdAt: -1 })
    .populate('game', 'period result status')
    .select('-user');

    res.json({ bets });
  } catch (error) {
    console.error('Get game bets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/game/stats
// @desc    Get game statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's betting statistics
    const totalBets = await Bet.countDocuments({ user: userId });
    const totalWinnings = await Bet.aggregate([
      { $match: { user: userId, status: 'won' } },
      { $group: { _id: null, total: { $sum: '$winAmount' } } }
    ]);
    
    const totalLosses = await Bet.aggregate([
      { $match: { user: userId, status: 'lost' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Get recent game results
    const recentGames = await Game.find({ status: 'completed' })
      .sort({ period: -1 })
      .limit(10)
      .select('period result createdAt');

    res.json({
      stats: {
        totalBets,
        totalWinnings: totalWinnings[0]?.total || 0,
        totalLosses: totalLosses[0]?.total || 0,
        netProfit: (totalWinnings[0]?.total || 0) - (totalLosses[0]?.total || 0)
      },
      recentGames
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;