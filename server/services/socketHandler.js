const jwt = require('jsonwebtoken');
const User = require('../models/User');
const gameService = require('./gameService');

const socketHandler = (io) => {
  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication error'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.username} connected`);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Send current game state
    const currentGame = gameService.getCurrentGame();
    if (currentGame) {
      socket.emit('currentGame', {
        gameId: currentGame.gameId,
        period: currentGame.period,
        startTime: currentGame.startTime,
        endTime: currentGame.endTime,
        timeLeft: gameService.getTimeLeft(),
        status: currentGame.status
      });
    }

    // Handle bet placement
    socket.on('placeBet', async (data) => {
      try {
        const { betType, betValue, amount } = data;
        
        const bet = await gameService.placeBet(socket.userId, betType, betValue, amount);
        
        socket.emit('betPlaced', {
          success: true,
          bet: {
            id: bet._id,
            betType: bet.betType,
            betValue: bet.betValue,
            amount: bet.amount,
            potentialWin: bet.potentialWin,
            period: bet.period
          }
        });

        // Update user balance
        const user = await User.findById(socket.userId);
        socket.emit('balanceUpdate', { balance: user.balance });

      } catch (error) {
        socket.emit('betError', { message: error.message });
      }
    });

    // Handle balance request
    socket.on('getBalance', async () => {
      try {
        const user = await User.findById(socket.userId);
        socket.emit('balanceUpdate', { balance: user.balance });
      } catch (error) {
        socket.emit('error', { message: 'Failed to fetch balance' });
      }
    });

    // Handle game history request
    socket.on('getGameHistory', async (data) => {
      try {
        const { limit = 10 } = data;
        const Game = require('../models/Game');
        
        const games = await Game.find({ status: 'completed' })
          .sort({ period: -1 })
          .limit(limit)
          .select('period result createdAt');

        socket.emit('gameHistory', { games });
      } catch (error) {
        socket.emit('error', { message: 'Failed to fetch game history' });
      }
    });

    // Handle user bet history
    socket.on('getBetHistory', async (data) => {
      try {
        const { limit = 20, page = 1 } = data;
        const Bet = require('../models/Bet');
        
        const bets = await Bet.find({ user: socket.userId })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip((page - 1) * limit)
          .populate('game', 'period result');

        socket.emit('betHistory', { bets });
      } catch (error) {
        socket.emit('error', { message: 'Failed to fetch bet history' });
      }
    });

    // Timer update every second
    const timerInterval = setInterval(() => {
      const timeLeft = gameService.getTimeLeft();
      socket.emit('timerUpdate', { timeLeft });
    }, 1000);

    socket.on('disconnect', () => {
      console.log(`User ${socket.user.username} disconnected`);
      clearInterval(timerInterval);
    });
  });

  // Global events for all connected users
  setInterval(() => {
    const currentGame = gameService.getCurrentGame();
    if (currentGame) {
      io.emit('gameStatus', {
        gameId: currentGame.gameId,
        period: currentGame.period,
        timeLeft: gameService.getTimeLeft(),
        totalBets: currentGame.totalBets,
        totalAmount: currentGame.totalAmount
      });
    }
  }, 5000); // Update every 5 seconds
};

module.exports = socketHandler;