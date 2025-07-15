const Game = require('../models/Game');
const Bet = require('../models/Bet');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const cron = require('cron');

class GameService {
  constructor() {
    this.io = null;
    this.currentGame = null;
    this.gameTimer = null;
    this.period = 1;
  }

  initializeGame(io) {
    this.io = io;
    this.startGameCycle();
  }

  async startGameCycle() {
    try {
      // Get the latest period from database
      const lastGame = await Game.findOne().sort({ period: -1 });
      this.period = lastGame ? lastGame.period + 1 : 1;

      await this.createNewGame();
      this.scheduleGameEnd();
    } catch (error) {
      console.error('Error starting game cycle:', error);
      setTimeout(() => this.startGameCycle(), 5000);
    }
  }

  async createNewGame() {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (process.env.GAME_DURATION || 180) * 1000);
    
    this.currentGame = new Game({
      gameId: `GAME_${Date.now()}`,
      period: this.period,
      startTime,
      endTime,
      status: 'active'
    });

    await this.currentGame.save();
    
    if (this.io) {
      this.io.emit('gameStarted', {
        gameId: this.currentGame.gameId,
        period: this.currentGame.period,
        startTime: this.currentGame.startTime,
        endTime: this.currentGame.endTime,
        duration: process.env.GAME_DURATION || 180
      });
    }

    console.log(`Game ${this.currentGame.period} started`);
  }

  scheduleGameEnd() {
    const duration = (process.env.GAME_DURATION || 180) * 1000;
    
    this.gameTimer = setTimeout(async () => {
      await this.endGame();
      this.period++;
      setTimeout(() => this.createNewGame(), 2000); // 2 second break between games
      setTimeout(() => this.scheduleGameEnd(), 2000);
    }, duration);
  }

  async endGame() {
    try {
      if (!this.currentGame) return;

      // Generate random result
      const result = this.currentGame.generateRandomResult();
      
      this.currentGame.result = result;
      this.currentGame.status = 'completed';
      await this.currentGame.save();

      // Process all bets for this game
      await this.processBets(this.currentGame._id, result);

      if (this.io) {
        this.io.emit('gameEnded', {
          gameId: this.currentGame.gameId,
          period: this.currentGame.period,
          result: result
        });
      }

      console.log(`Game ${this.currentGame.period} ended with result:`, result);
    } catch (error) {
      console.error('Error ending game:', error);
    }
  }

  async processBets(gameId, result) {
    try {
      const bets = await Bet.find({ game: gameId, status: 'pending' });
      
      for (const bet of bets) {
        const isWinner = bet.checkWin(result);
        await bet.save();

        // Update user balance and stats
        const user = await User.findById(bet.user);
        if (isWinner) {
          await user.updateBalance(bet.winAmount, 'add');
          user.totalWinnings += bet.winAmount;
          
          // Create win transaction
          const transaction = new Transaction({
            user: user._id,
            type: 'win',
            amount: bet.winAmount,
            status: 'completed',
            description: `Win from game ${bet.period}`,
            balanceBefore: user.balance - bet.winAmount,
            balanceAfter: user.balance
          });
          await transaction.save();
        } else {
          user.totalLosses += bet.amount;
        }
        
        await user.save();
      }

      console.log(`Processed ${bets.length} bets for game ${this.currentGame.period}`);
    } catch (error) {
      console.error('Error processing bets:', error);
    }
  }

  async placeBet(userId, betType, betValue, amount) {
    try {
      if (!this.currentGame || this.currentGame.status !== 'active') {
        throw new Error('No active game to place bet');
      }

      // Check if game is about to end (last 10 seconds)
      const timeLeft = this.currentGame.endTime.getTime() - Date.now();
      if (timeLeft < 10000) {
        throw new Error('Betting time expired');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Check bet limits
      const minBet = parseInt(process.env.MIN_BET_AMOUNT) || 10;
      const maxBet = parseInt(process.env.MAX_BET_AMOUNT) || 10000;
      
      if (amount < minBet || amount > maxBet) {
        throw new Error(`Bet amount must be between ${minBet} and ${maxBet}`);
      }

      // Get multiplier and calculate potential win
      const multiplier = Bet.getMultiplier(betType, betValue);
      const potentialWin = amount * multiplier;

      // Create bet
      const bet = new Bet({
        user: userId,
        game: this.currentGame._id,
        gameId: this.currentGame.gameId,
        period: this.currentGame.period,
        betType,
        betValue,
        amount,
        multiplier,
        potentialWin
      });

      await bet.save();

      // Update user balance
      await user.updateBalance(amount, 'subtract');

      // Create bet transaction
      const transaction = new Transaction({
        user: userId,
        type: 'bet',
        amount: amount,
        status: 'completed',
        description: `Bet on ${betType}: ${betValue} for game ${this.currentGame.period}`,
        balanceBefore: user.balance + amount,
        balanceAfter: user.balance
      });
      await transaction.save();

      // Update game statistics
      await this.currentGame.addBet(betType, betValue, amount);

      // Emit bet placed event
      if (this.io) {
        this.io.emit('betPlaced', {
          gameId: this.currentGame.gameId,
          period: this.currentGame.period,
          betType,
          betValue,
          amount,
          totalBets: this.currentGame.totalBets,
          totalAmount: this.currentGame.totalAmount
        });
      }

      return bet;
    } catch (error) {
      throw error;
    }
  }

  getCurrentGame() {
    return this.currentGame;
  }

  getTimeLeft() {
    if (!this.currentGame) return 0;
    return Math.max(0, this.currentGame.endTime.getTime() - Date.now());
  }
}

module.exports = new GameService();