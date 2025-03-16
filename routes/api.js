const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../utils/logger');

// Base URL for the external API
const API_BASE_URL = process.env.API_BASE_URL || 'https://zplay1.in';

// Middleware to handle API errors
const handleApiError = (err, res) => {
  logger.error(`API Error: ${err.message}`, { stack: err.stack });
  
  const status = err.response?.status || 500;
  const message = err.response?.data?.message || 'Internal server error';
  
  return res.status(status).json({
    success: false,
    message,
    error: err.message
  });
};

// Get all available sports
router.get('/sports', async (req, res) => {
  // Return hardcoded sports data instead of making an API call
  const sportsData = {
    success: true,
    data: [
      { id: '4', name: 'Cricket' },
      { id: '1', name: 'Football' },
      { id: '2', name: 'Tennis' },
      { id: '7522', name: 'Basketball' },
      { id: '7511', name: 'Baseball' },
      { id: '27454574', name: 'Table Tennis' }
    ]
  };
  
  logger.info('Returning predefined sports data');
  return res.json(sportsData);
});

// Get in-play matches - IMPORTANT: This route must be defined BEFORE /matches/:sportId
router.get('/matches/inplay', async (req, res) => {
  try {
    // New endpoint for in-play matches
    const response = await axios.get(`${API_BASE_URL}/sports/api/v1/events/inplay`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
      }
    });
    
    // Log the response structure
    console.log('Inplay API response structure:', Object.keys(response.data));
    console.log('Inplay API data structure:', response.data.data ? Object.keys(response.data.data[0] || {}) : 'No data');
    
    logger.info('Successfully fetched in-play matches');
    return res.json(response.data);
  } catch (err) {
    return handleApiError(err, res);
  }
});

// Get matches for a specific sport
router.get('/matches/:sportId', async (req, res) => {
  const { sportId } = req.params;
  
  try {
    // Updated URL to use the correct endpoint
    const response = await axios.get(`${API_BASE_URL}/sports/api/v1/events/matches/${sportId}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
      }
    });
    
    // Log the response structure
    console.log(`Sport ${sportId} API response structure:`, Object.keys(response.data));
    console.log(`Sport ${sportId} API data structure:`, response.data.data ? Object.keys(response.data.data[0] || {}) : 'No data');
    
    logger.info(`Successfully fetched matches for sport ID: ${sportId}`);
    return res.json(response.data);
  } catch (err) {
    return handleApiError(err, res);
  }
});

// Get match details
router.get('/match/:eventId', async (req, res) => {
  const { eventId } = req.params;
  
  try {
    // Updated URL to use the correct endpoint
    const response = await axios.get(`${API_BASE_URL}/sports/api/v1/events/matchDetails/${eventId}`, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9,en-IN;q=0.8',
        'Origin': 'https://www.lotusbet365.com',
        'Referer': 'https://www.lotusbet365.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
      }
    });
    
    // Process the response to extract all markets and odds
    const matchData = response.data;
    
    // Log the structure of the response for debugging
    logger.info(`Match details structure for event ID ${eventId}: ${JSON.stringify(Object.keys(matchData.data || {}))}`);
    
    // If there are markets in the response, log their types
    if (matchData.data && matchData.data.markets) {
      logger.info(`Market types for event ID ${eventId}: ${JSON.stringify(matchData.data.markets.map(m => m.marketName || m.marketId))}`);
    }
    
    logger.info(`Successfully fetched comprehensive match details for event ID: ${eventId}`);
    return res.json(matchData);
  } catch (err) {
    return handleApiError(err, res);
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 