# Color Prediction Website - Like 91 Club

A full-stack color prediction gaming platform with admin panel and payment gateway integration. Built with React.js, Node.js, Express, and MongoDB.

## 🚀 Features

### User Features
- **User Authentication**: Registration, login with referral system
- **Color Prediction Game**: Real-time betting on colors (Red, Green, Violet)
- **Multiple Bet Types**: Color, Number (0-9), Size (Big/Small)
- **Live Game Timer**: 3-minute game rounds with real-time updates
- **Wallet System**: Deposit, withdraw, balance management
- **Payment Integration**: Razorpay for secure payments
- **Referral Program**: Earn bonuses for referring new users
- **Transaction History**: Complete payment and betting history
- **Profile Management**: Update personal details, bank info, UPI ID

### Admin Features
- **Comprehensive Dashboard**: Real-time statistics and analytics
- **User Management**: 
  - View all users with search and filtering
  - Activate/deactivate user accounts
  - Update user wallet balances (add, subtract, set)
  - Configure user-specific UPI ID and QR codes
  - View detailed user activity logs
- **Payment Management**: 
  - Process withdrawal requests
  - Update payment configurations
  - Monitor all transactions
- **Game Management**: View game history and betting patterns
- **Activity Tracking**: Monitor user logins, actions, and system events

### Technical Features
- **Real-time Communication**: WebSocket integration for live updates
- **Secure Authentication**: JWT-based authentication system
- **Payment Security**: Razorpay integration with signature verification
- **Responsive Design**: Mobile-first approach with modern UI
- **Activity Logging**: Comprehensive user activity tracking
- **Data Validation**: Server-side validation for all inputs
- **Error Handling**: Graceful error handling and user feedback

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB ODM
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Razorpay** - Payment gateway
- **Bcrypt** - Password hashing

### Frontend
- **React.js** - UI framework
- **React Router** - Navigation
- **Styled Components** - CSS-in-JS styling
- **Axios** - HTTP client
- **Socket.io Client** - Real-time updates
- **React Hot Toast** - Notifications
- **Framer Motion** - Animations

## 📁 Project Structure

```
color-prediction-website/
├── server/                    # Backend application
│   ├── models/               # Database models
│   │   ├── User.js          # User model with activity tracking
│   │   ├── Game.js          # Game rounds model
│   │   ├── Bet.js           # User bets model
│   │   └── Transaction.js    # Payment transactions
│   ├── routes/              # API routes
│   │   ├── auth.js          # Authentication routes
│   │   ├── game.js          # Game management routes
│   │   ├── payment.js       # Payment handling routes
│   │   ├── admin.js         # Admin management routes
│   │   └── user.js          # User profile routes
│   ├── services/            # Business logic
│   │   ├── gameService.js   # Game logic and automation
│   │   └── socketHandler.js # WebSocket event handling
│   ├── middleware/          # Custom middleware
│   │   └── auth.js          # Authentication middleware
│   └── index.js             # Server entry point
├── client/                   # Frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Auth/        # Login/Register components
│   │   │   ├── Game/        # Game interface components
│   │   │   ├── Admin/       # Admin panel components
│   │   │   ├── Profile/     # User profile components
│   │   │   └── Common/      # Shared components
│   │   ├── contexts/        # React contexts
│   │   │   ├── AuthContext.js    # Authentication state
│   │   │   ├── GameContext.js    # Game state management
│   │   │   └── SocketContext.js  # WebSocket connection
│   │   └── App.js           # Main application component
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Razorpay account (for payment integration)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd color-prediction-website
```

2. **Install dependencies**
```bash
# Install root dependencies
npm run install-all

# Or install individually
npm install
cd server && npm install
cd ../client && npm install
```

3. **Environment Configuration**
```bash
# Copy environment template
cp server/.env.example server/.env
```

Edit `server/.env` with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/color_prediction
JWT_SECRET=your_very_long_and_secure_jwt_secret_key
JWT_EXPIRE=7d

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Admin Configuration
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# Game Configuration
GAME_DURATION=180
MIN_BET_AMOUNT=10
MAX_BET_AMOUNT=10000

NODE_ENV=development
```

4. **Start the application**
```bash
# Development mode (runs both server and client)
npm run dev

# Or start individually
npm run server  # Backend only
npm run client  # Frontend only
```

5. **Access the application**
- User Interface: http://localhost:3000
- Admin Panel: http://localhost:3000/admin
- API: http://localhost:5000

## 🎮 Game Logic

### Color Prediction Rules
- **Colors**: Red, Green, Violet
- **Numbers**: 0-9 with color mapping:
  - Green: 1, 3, 7, 9
  - Red: 2, 4, 6, 8
  - Violet: 0, 5
- **Size**: Big (5-9), Small (0-4)

### Betting Multipliers
- **Color Bets**: 2x (Red/Green), 4.5x (Violet)
- **Number Bets**: 9x
- **Size Bets**: 2x

### Game Cycle
- Each game lasts 3 minutes (configurable)
- Betting closes 10 seconds before game end
- Results are generated randomly
- Winnings are automatically credited

## 👨‍💼 Admin Features

### User Management
- **View Users**: Search, filter, and paginate user lists
- **User Details**: Comprehensive user information and statistics
- **Wallet Management**: 
  - Add/subtract/set user balance
  - View transaction history
  - Track deposits and withdrawals
- **Account Control**: Activate/deactivate user accounts

### Payment Configuration
- **UPI Settings**: Configure user-specific UPI IDs
- **QR Code Management**: Set custom QR codes for payments
- **Payment Status**: Enable/disable payment methods per user

### Activity Monitoring
- **Login History**: Track user login sessions with IP and device info
- **Activity Logs**: Monitor all user actions and admin changes
- **Real-time Tracking**: Live activity feed with detailed logging

### Transaction Management
- **Withdrawal Processing**: Approve/reject withdrawal requests
- **Payment Verification**: Monitor Razorpay transactions
- **Financial Reports**: View platform financial statistics

## 💳 Payment Integration

### Razorpay Setup
1. Create a Razorpay account
2. Get API keys from the dashboard
3. Configure webhook URLs for payment verification
4. Test with test mode before going live

### Supported Payment Methods
- **Deposits**: UPI, Cards, Net Banking via Razorpay
- **Withdrawals**: UPI, Bank Transfer (manual processing)

## 🔒 Security Features

- **Authentication**: JWT-based secure authentication
- **Password Security**: Bcrypt hashing with salt
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configured for secure cross-origin requests
- **Payment Security**: Razorpay signature verification

## 📱 Mobile Responsiveness

The application is fully responsive and optimized for:
- Desktop computers
- Tablets
- Mobile phones
- Progressive Web App (PWA) ready

## 🚨 Important Legal Notice

**WARNING**: This is a gambling/betting platform. Please ensure compliance with local laws and regulations:

- Obtain proper licenses for gambling operations
- Implement age verification (18+ only)
- Add responsible gambling features
- Comply with financial regulations
- Consider geo-blocking in restricted jurisdictions
- Implement proper KYC (Know Your Customer) procedures

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the code comments

## 🔧 Development Notes

### Database Indexes
The application creates necessary indexes for optimal performance:
- User email, username, phone
- Game periods and status
- Transaction references
- Bet user and game associations

### Scalability Considerations
- Implement Redis for session management
- Use database clustering for high traffic
- Consider CDN for static assets
- Implement proper logging and monitoring

### Testing
```bash
# Run tests (when implemented)
npm test
```

### Production Deployment
1. Set NODE_ENV=production
2. Use PM2 or similar for process management
3. Configure reverse proxy (Nginx)
4. Set up SSL certificates
5. Configure backup strategies
6. Implement monitoring and logging

---

**Disclaimer**: This software is for educational purposes. Ensure legal compliance before deploying any gambling platform.

