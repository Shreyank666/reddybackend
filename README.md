# Lotus365 Betting Platform

A full-stack betting platform with real-time odds updates using WebSockets.

## Features

- Real-time odds updates using WebSockets
- Responsive React frontend with styled-components
- Node.js backend with Express
- Support for multiple sports and betting markets
- Scalable architecture to handle 10K+ concurrent users

## Project Structure

```
.
├── client/                 # React frontend
│   ├── public/             # Static files
│   └── src/                # React source code
├── config/                 # Configuration files
├── logs/                   # Application logs
├── routes/                 # API routes
├── services/               # Service layer
├── utils/                  # Utility functions
├── .env                    # Environment variables
├── package.json            # Project dependencies
├── README.md               # Project documentation
└── server.js               # Entry point
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```
   npm install
   ```
3. Install frontend dependencies:
   ```
   cd client
   npm install
   ```

### Running the Application

1. Start the backend server:
   ```
   npm run dev
   ```
2. Start the frontend development server:
   ```
   cd client
   npm start
   ```
3. Or run both concurrently:
   ```
   npm run dev-full
   ```

## API Endpoints

- `GET /api/sports` - Get all available sports
- `GET /api/matches/:sportId` - Get matches for a specific sport
- `GET /api/match/:eventId` - Get match details
- `GET /api/health` - Health check endpoint

## WebSocket Events

### Client to Server

- `subscribe` - Subscribe to a match for real-time updates
- `unsubscribe` - Unsubscribe from a match

### Server to Client

- `matchUpdate` - Real-time match updates

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
API_BASE_URL=https://zplay1.in
WEBSOCKET_URL=wss://zplay1.in/socket.io/?EIO=4&transport=websocket
LOG_LEVEL=info
```

## License

This project is licensed under the MIT License. 