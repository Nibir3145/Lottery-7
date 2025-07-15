import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const [currentGame, setCurrentGame] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bettingEnabled, setBettingEnabled] = useState(true);

  // Fetch current game data
  const fetchCurrentGame = async () => {
    try {
      const response = await axios.get('/api/game/current');
      setCurrentGame(response.data.game);
      setTimeLeft(response.data.game.timeLeft);
      setBettingEnabled(response.data.game.timeLeft > 10000); // Disable betting in last 10 seconds
    } catch (error) {
      console.error('Failed to fetch current game:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch game history
  const fetchGameHistory = async (limit = 10) => {
    try {
      const response = await axios.get(`/api/game/history?limit=${limit}`);
      setGameHistory(response.data.games);
    } catch (error) {
      console.error('Failed to fetch game history:', error);
    }
  };

  // Fetch user's bet history
  const fetchMyBets = async (gameId = null) => {
    try {
      const url = gameId ? `/api/game/my-bets/${gameId}` : '/api/game/my-bets?limit=20';
      const response = await axios.get(url);
      setMyBets(response.data.bets);
    } catch (error) {
      console.error('Failed to fetch my bets:', error);
    }
  };

  // Place a bet
  const placeBet = async (betType, betValue, amount) => {
    try {
      if (!bettingEnabled) {
        toast.error('Betting is closed for this round');
        return { success: false };
      }

      const response = await axios.post('/api/game/bet', {
        betType,
        betValue,
        amount: parseInt(amount)
      });

      toast.success('Bet placed successfully!');
      
      // Refresh current game and bets
      await fetchCurrentGame();
      await fetchMyBets(currentGame?.gameId);

      return { success: true, bet: response.data.bet };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to place bet';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Get bet multiplier
  const getBetMultiplier = (betType, betValue) => {
    if (betType === 'color') {
      return betValue === 'violet' ? 4.5 : 2;
    } else if (betType === 'number') {
      return 9;
    } else if (betType === 'size') {
      return 2;
    }
    return 1;
  };

  // Calculate potential win
  const calculatePotentialWin = (betType, betValue, amount) => {
    const multiplier = getBetMultiplier(betType, betValue);
    return amount * multiplier;
  };

  // Get color from number
  const getColorFromNumber = (number) => {
    if ([1, 3, 7, 9].includes(number)) {
      return 'green';
    } else if ([2, 4, 6, 8].includes(number)) {
      return 'red';
    } else if ([0, 5].includes(number)) {
      return 'violet';
    }
    return 'unknown';
  };

  // Get size from number
  const getSizeFromNumber = (number) => {
    return number >= 5 ? 'big' : 'small';
  };

  // Update timer
  const updateTimer = (newTimeLeft) => {
    setTimeLeft(newTimeLeft);
    setBettingEnabled(newTimeLeft > 10000);
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchCurrentGame();
    fetchGameHistory();
  }, []);

  const value = {
    currentGame,
    gameHistory,
    myBets,
    timeLeft,
    loading,
    bettingEnabled,
    fetchCurrentGame,
    fetchGameHistory,
    fetchMyBets,
    placeBet,
    getBetMultiplier,
    calculatePotentialWin,
    getColorFromNumber,
    getSizeFromNumber,
    updateTimer,
    setCurrentGame,
    setGameHistory,
    setMyBets,
    setTimeLeft
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};