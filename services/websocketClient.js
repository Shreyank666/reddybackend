const WebSocket = require('ws');
const logger = require('../utils/logger');
const socketIo = require('socket.io');

// Socket.io instance
let io;

// Active WebSocket connections
const activeConnections = new Map();

// Active subscriptions (matchId -> Set of clients)
const activeSubscriptions = new Map();

// Function to setup WebSocket client and Socket.IO
const setupSocket = (server) => {
  // Initialize Socket.IO
  io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST']
    }
  });
  
  // Handle Socket.IO connections
  io.on('connection', (socket) => {
    logger.info(`New client connected: ${socket.id}`);
    
    // Handle subscription to match
    socket.on('sub', (eventId) => {
      logger.info(`Client ${socket.id} subscribed to match: ${eventId}`);
      socket.join(eventId);
      
      // Create or get WebSocket connection for this event
      getOrCreateWebSocketConnection(eventId);
    });
    
    // Handle unsubscription
    socket.on('leave', (eventIds) => {
      // eventIds can be an array or a single value
      const ids = Array.isArray(eventIds) ? eventIds : [eventIds];
      
      ids.forEach(eventId => {
        logger.info(`Client ${socket.id} unsubscribed from match: ${eventId}`);
        socket.leave(eventId);
        
        // Check if there are still clients in this room
        const room = io.sockets.adapter.rooms.get(eventId);
        if (!room || room.size === 0) {
          // Clean up WebSocket connection if no clients are subscribed
          cleanupWebSocketConnection(eventId);
        }
      });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
  
  return io;
};

// Function to get or create a WebSocket connection for an event
const getOrCreateWebSocketConnection = (eventId) => {
  // Check if we already have a connection for this event
  if (activeConnections.has(eventId)) {
    logger.info(`Using existing WebSocket connection for event: ${eventId}`);
    return activeConnections.get(eventId);
  }
  
  // Create a new WebSocket connection
  logger.info(`Creating new WebSocket connection for event: ${eventId}`);
  
  try {
    // Use the correct WebSocket URL format
    const wsUrl = 'wss://zplay1.in/socket.io/?EIO=4&transport=websocket';
    const ws = new WebSocket(wsUrl);
    
    // Store the connection
    activeConnections.set(eventId, {
      socket: ws,
      lastPing: Date.now(),
      eventId
    });
    
    // Set up event handlers
    setupWebSocketEventHandlers(ws, eventId);
    
    return activeConnections.get(eventId);
  } catch (error) {
    logger.error(`Error creating WebSocket connection for event ${eventId}:`, error);
    return null;
  }
};

// Function to set up WebSocket event handlers
const setupWebSocketEventHandlers = (ws, eventId) => {
  ws.on('open', () => {
    logger.info(`WebSocket connection opened for event: ${eventId}`);
    
    // Send initial message to start the handshake
    ws.send('40');
  });
  
  ws.on('message', (data) => {
    try {
      const message = data.toString();
      
      // Handle different message types
      if (message.startsWith('0{')) {
        // Initial connection message - do nothing, wait for 40{
        logger.debug(`Received initial connection message for event ${eventId}`);
      }
      else if (message.startsWith('40{')) {
        // Socket.IO handshake complete
        logger.info(`Socket.IO handshake complete for event ${eventId}`);
        sendSubscription(ws, eventId);
      }
      else if (message === '2') {
        // Ping message, respond with pong
        ws.send('3');
        
        // Update last ping time
        if (activeConnections.has(eventId)) {
          activeConnections.get(eventId).lastPing = Date.now();
        }
      } 
      else if (message.startsWith('42["App\\\\Events\\\\')) {
        // Process data message
        try {
          // Extract the JSON part from the message
          const jsonStr = message.substring(2);
          const parsedData = JSON.parse(jsonStr);
          
          // Process based on message type
          if (parsedData[0] === 'App\\Events\\SportsBroadcastData') {
            // Handle market odds updates
            handleMarketOddsUpdate(eventId, parsedData[1]);
          } 
          else if (parsedData[0] === 'App\\Events\\BroadcastFancy') {
            // Handle fancy market updates
            handleFancyUpdate(eventId, parsedData[1]);
          } 
          else if (parsedData[0] === 'App\\Events\\BroadcastBookmaker') {
            // Handle bookmaker updates
            handleBookmakerUpdate(eventId, parsedData[1]);
          }
        } catch (error) {
          logger.error(`Error processing WebSocket message for event ${eventId}:`, error);
        }
      }
    } catch (error) {
      logger.error(`Error handling WebSocket message for event ${eventId}:`, error);
    }
  });
  
  ws.on('error', (error) => {
    logger.error(`WebSocket error for event ${eventId}:`, error);
    
    // Clean up connection
    cleanupWebSocketConnection(eventId);
    
    // Try to reconnect after a delay
    setTimeout(() => {
      if (!activeConnections.has(eventId)) {
        getOrCreateWebSocketConnection(eventId);
      }
    }, 5000);
  });
  
  ws.on('close', () => {
    logger.info(`WebSocket connection closed for event: ${eventId}`);
    
    // Clean up connection
    cleanupWebSocketConnection(eventId);
    
    // Try to reconnect after a delay
    setTimeout(() => {
      if (!activeConnections.has(eventId)) {
        getOrCreateWebSocketConnection(eventId);
      }
    }, 5000);
  });
};

// Function to send subscription message
const sendSubscription = (ws, eventId) => {
  try {
    // Format: 42["sub","eventId"]
    const subscriptionMessage = `42["sub","${eventId}"]`;
    ws.send(subscriptionMessage);
    logger.info(`Sent subscription for event: ${eventId}`);
  } catch (error) {
    logger.error(`Error sending subscription for event ${eventId}:`, error);
  }
};

// Function to clean up WebSocket connection
const cleanupWebSocketConnection = (eventId) => {
  if (activeConnections.has(eventId)) {
    const connection = activeConnections.get(eventId);
    
    try {
      // Close the WebSocket connection
      if (connection.socket && connection.socket.readyState === WebSocket.OPEN) {
        // Send unsubscribe message
        const unsubscribeMessage = `42["leave",["${eventId}"]]`;
        connection.socket.send(unsubscribeMessage);
        
        // Close the connection
        connection.socket.close();
      }
    } catch (error) {
      logger.error(`Error cleaning up WebSocket connection for event ${eventId}:`, error);
    }
    
    // Remove from active connections
    activeConnections.delete(eventId);
    logger.info(`Cleaned up WebSocket connection for event: ${eventId}`);
  }
};

// Handle market odds updates
const handleMarketOddsUpdate = (eventId, data) => {
  if (!data || !Array.isArray(data)) return;
  
  // Broadcast the market odds update to all clients subscribed to this match
  io.to(eventId).emit('matchUpdate', {
    type: 'odds',
    data: data,
    timestamp: Date.now()
  });
};

// Handle fancy market updates
const handleFancyUpdate = (eventId, data) => {
  if (!data || !data[0] || !data[0].eid || !data[0].ml) return;
  
  // Check if this update is for the current match
  if (data[0].eid === eventId) {
    // Broadcast the fancy market update to all clients
    io.to(eventId).emit('matchUpdate', {
      type: 'fancy',
      data: data[0].ml,
      timestamp: Date.now()
    });
  }
};

// Handle bookmaker updates
const handleBookmakerUpdate = (eventId, data) => {
  if (!data || !data[0] || !data[0].eid || !data[0].ml) return;
  
  // Check if this update is for the current match
  if (data[0].eid === eventId) {
    // Broadcast the bookmaker update to all clients
    io.to(eventId).emit('matchUpdate', {
      type: 'bookmaker',
      data: data[0].ml,
      timestamp: Date.now()
    });
  }
};

// Start a ping interval to keep connections alive
setInterval(() => {
  const now = Date.now();
  
  // Check each connection
  for (const [eventId, connection] of activeConnections.entries()) {
    try {
      // If it's been more than 20 seconds since the last ping
      if (now - connection.lastPing > 20000) {
        // Send a ping
        if (connection.socket && connection.socket.readyState === WebSocket.OPEN) {
          connection.socket.send('2');
          connection.lastPing = now;
        }
      }
    } catch (error) {
      logger.error(`Error sending ping for event ${eventId}:`, error);
    }
  }
}, 15000);

module.exports = setupSocket; 