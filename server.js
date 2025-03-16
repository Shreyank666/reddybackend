require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

// Import routes
const apiRoutes = require('./routes/api');

// Create Express app
const app = express();
const server = http.createServer(app);

// Import Socket.IO setup (simplified for serverless)
const setupSocket = require('./services/websocketClient');

// Middleware
// More permissive CORS configuration
app.use(cors({
  origin: '*', // Allow all origins in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Configure Helmet with less restrictive settings
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(express.json());
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Routes
app.use('/api', apiRoutes);

// Health check endpoint for Vercel
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running'
  });
});

// Initialize Socket.IO only if not in serverless environment
if (process.env.NODE_ENV !== 'production') {
  // Initialize Socket.IO with the server
  const io = setupSocket(server);
  
  // Start the server on a specific port for local development
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
} else {
  // In production/serverless, we don't need to call server.listen()
  logger.info('Server configured for serverless environment');
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  // Don't crash the server
});

// Export for serverless
module.exports = app;
