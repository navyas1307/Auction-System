import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, Auction, Bid } from './models/index.js';
import auctionRoutes from './routes/auctions.js';
import * as redisService from './services/redisService.js';
import fs from 'fs';
import sgMail from '@sendgrid/mail';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SendGrid if API key is provided
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Debug: Check if public directory and index.html exist
const publicDir = path.join(__dirname, 'public');
const indexPath = path.join(publicDir, 'index.html');

console.log('📂 Current directory:', __dirname);
console.log('📂 Public directory:', publicDir);
console.log('📄 Index file:', indexPath);

try {
  if (fs.existsSync(publicDir)) {
    console.log('✅ Public directory exists');
    const files = fs.readdirSync(publicDir);
    console.log('📋 Files in public:', files.slice(0, 10)); // Show first 10 files
  } else {
    console.log('❌ Public directory does not exist');
  }
  
  if (fs.existsSync(indexPath)) {
    console.log('✅ index.html exists');
  } else {
    console.log('❌ index.html does not exist');
  }
} catch (error) {
  console.error('❌ Error checking files:', error.message);
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React build (public directory)
// Try multiple possible paths for the public directory
const possiblePublicPaths = [
  path.join(__dirname, 'public'),
  path.join(__dirname, '..', 'public'), 
  path.join(process.cwd(), 'backend', 'public'),
  path.join(process.cwd(), 'public')
];

let publicPath = null;
for (const testPath of possiblePublicPaths) {
  if (fs.existsSync(testPath)) {
    publicPath = testPath;
    console.log(`✅ Found public directory at: ${testPath}`);
    break;
  }
}

if (publicPath) {
  app.use(express.static(publicPath));
} else {
  console.log('❌ Could not find public directory at any expected location');
  console.log('Tried paths:', possiblePublicPaths);
}

// Debug middleware to log all API requests
app.use('/api', (req, res, next) => {
  console.log(`📡 API Request: ${req.method} ${req.path}`);
  console.log('📦 Request body:', req.body);
  next();
});

// Test route to verify API is working
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug route to check Redis connection
app.get('/api/debug', async (req, res) => {
  try {
    const redisStatus = await redisService.getConnectionStatus();
    res.json({
      database: 'Connected',
      redis: redisStatus,
      models: {
        auction: typeof Auction !== 'undefined',
        bid: typeof Bid !== 'undefined'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        upstashRedisUrl: process.env.UPSTASH_REDIS_URL ? 'Set' : 'Not set'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// API Routes - MUST come before the catch-all handler
try {
  // Check if the route file exists and dependencies are available
  console.log('🔍 Checking auction route dependencies...');
  
  // Test if models are available
  console.log('📦 Auction model available:', typeof Auction !== 'undefined');
  console.log('📦 Bid model available:', typeof Bid !== 'undefined');
  
  // Test Redis service
  try {
    await redisService.getCurrentHighestBid(1); // Test call
    console.log('✅ Redis service is available');
  } catch (redisError) {
    console.log('⚠️ Redis service issue:', redisError.message);
  }
  
  app.use('/api/auctions', auctionRoutes);
  console.log('✅ Auction routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading auction routes:', error.message);
  console.error('Stack:', error.stack);
  
  // Fallback routes if the main routes file fails
  app.get('/api/auctions/active', (req, res) => {
    res.status(500).json({ 
      error: 'Auction routes not available', 
      details: error.message,
      suggestion: 'Check server logs for missing dependencies'
    });
  });
  
  app.post('/api/auctions/create', (req, res) => {
    res.status(500).json({ 
      error: 'Auction creation not available', 
      details: error.message,
      suggestion: 'Check server logs for missing dependencies'
    });
  });
}

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  console.log(`📥 Request for: ${req.path}`);
  
  // Only serve index.html for non-API routes
  if (!req.path.startsWith('/api/')) {
    const indexFile = publicPath ? path.join(publicPath, 'index.html') : path.join(__dirname, 'public', 'index.html');
    
    if (fs.existsSync(indexFile)) {
      console.log(`✅ Serving index.html for: ${req.path}`);
      res.sendFile(indexFile);
    } else {
      console.log(`❌ index.html not found at: ${indexFile}`);
      res.status(404).send(`
        <h1>React App Not Found</h1>
        <p>The React build files are not available.</p>
        <p>Expected location: ${indexFile}</p>
        <p>Current directory: ${__dirname}</p>
        <p>Process CWD: ${process.cwd()}</p>
      `);
    }
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join auction room - matching your frontend event names
  socket.on('joinAuction', (auctionId) => {
    socket.join(`auction_${auctionId}`);
    console.log(`User ${socket.id} joined auction ${auctionId}`);
  });

  // Handle bid placement - matching your frontend event names
  socket.on('placeBid', async (bidData) => {
    try {
      const { auctionId, bidAmount, bidderEmail, bidderName } = bidData;
      console.log(`Received bid: ${bidAmount} from ${bidderName} for auction ${auctionId}`);
      
      // Get auction details
      const auction = await Auction.findByPk(auctionId);
      if (!auction) {
        socket.emit('bidError', 'Auction not found');
        return;
      }

      // Check if auction is still active
      if (auction.status !== 'active') {
        socket.emit('bidError', 'Auction has ended');
        return;
      }

      // Check if auction time has expired
      const startTime = new Date(auction.startTime);
      const endTime = new Date(startTime.getTime() + auction.duration * 60 * 1000);
      if (new Date() > endTime) {
        // End the auction if time has expired
        await endAuction(auctionId);
        socket.emit('bidError', 'Auction has ended');
        return;
      }

      // Get current highest bid
      const currentHighestBid = await redisService.getCurrentHighestBid(auctionId);
      const minimumBid = currentHighestBid + parseFloat(auction.bidIncrement);

      // Validate bid amount
      if (parseFloat(bidAmount) < minimumBid) {
        socket.emit('bidError', `Bid must be at least $${minimumBid.toFixed(2)}`);
        return;
      }

      // Save bid to database
      await Bid.create({
        auctionId,
        bidAmount: parseFloat(bidAmount),
        bidderName,
        bidderEmail
      });

      // Update highest bid in Redis
      await redisService.setHighestBid(auctionId, bidAmount, bidderEmail, bidderName);

      // Broadcast new bid to all users in the auction room
      io.to(`auction_${auctionId}`).emit('newBid', {
        auctionId,
        bidAmount: parseFloat(bidAmount),
        bidderName,
        bidderEmail
      });

      console.log(`✅ New bid placed: $${bidAmount} by ${bidderName} on auction ${auctionId}`);

    } catch (error) {
      console.error('❌ Error placing bid:', error);
      socket.emit('bidError', 'Failed to place bid. Please try again.');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Function to end auction with email notifications
const endAuction = async (auctionId) => {
  try {
    console.log(`🏁 Ending auction ${auctionId}...`);
    
    // Update auction status
    await Auction.update(
      { status: 'ended' },
      { where: { id: auctionId } }
    );

    // Get auction and winner details
    const auction = await Auction.findByPk(auctionId);
    const winnerData = await redisService.getHighestBidData(auctionId);

    if (auction && winnerData && winnerData.bidderEmail && process.env.SENDGRID_API_KEY) {
      // Send emails to seller and winner
      await sendAuctionEndEmails(
        auction.sellerEmail,
        winnerData.bidderEmail,
        auction.itemName,
        winnerData.amount,
        winnerData.bidderName,
        auction.sellerName
      );

      // Notify all users in the auction room
      io.to(`auction_${auctionId}`).emit('auctionEnded', {
        auctionId,
        winner: winnerData.bidderName,
        highestBid: winnerData.amount,
        itemName: auction.itemName
      });

      console.log(`✅ Auction ${auctionId} ended. Winner: ${winnerData.bidderName} with $${winnerData.amount}`);
    } else {
      // No bids were placed or no email setup
      io.to(`auction_${auctionId}`).emit('auctionEnded', {
        auctionId,
        winner: winnerData ? winnerData.bidderName : 'No bids placed',
        highestBid: winnerData ? winnerData.amount : auction.startingPrice,
        itemName: auction.itemName
      });

      console.log(`✅ Auction ${auctionId} ended with ${winnerData ? 'winner: ' + winnerData.bidderName : 'no bids'}`);
    }

  } catch (error) {
    console.error(`❌ Error ending auction ${auctionId}:`, error);
  }
};

// Email service function
const sendAuctionEndEmails = async (sellerEmail, bidderEmail, itemName, winningBid, winnerName, sellerName) => {
  try {
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      console.log('⚠️ SendGrid not configured, skipping email notifications');
      return;
    }

    // Email to seller
    const sellerMsg = {
      to: sellerEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `Auction Ended - ${itemName}`,
      html: `
        <h2>Your Auction Has Ended! 🎉</h2>
        <p>Dear ${sellerName},</p>
        <p>Your auction for <strong>${itemName}</strong> has ended.</p>
        <p><strong>Winning Bid:</strong> $${parseFloat(winningBid).toFixed(2)}</p>
        <p><strong>Winner:</strong> ${winnerName}</p>
        <p><strong>Winner's Email:</strong> ${bidderEmail}</p>
        <p>Please contact the winner to complete the transaction.</p>
        <br>
        <p>Thank you for using our auction platform!</p>
      `
    };

    // Email to winning bidder
    const bidderMsg = {
      to: bidderEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `Congratulations! You Won - ${itemName}`,
      html: `
        <h2>Congratulations! You Won the Auction! 🏆</h2>
        <p>Dear ${winnerName},</p>
        <p>You have won the auction for <strong>${itemName}</strong>!</p>
        <p><strong>Your Winning Bid:</strong> $${parseFloat(winningBid).toFixed(2)}</p>
        <p><strong>Seller:</strong> ${sellerName}</p>
        <p><strong>Seller's Email:</strong> ${sellerEmail}</p>
        <p>The seller will contact you soon to complete the transaction.</p>
        <br>
        <p>Thank you for participating in our auction!</p>
      `
    };

    await Promise.all([
      sgMail.send(sellerMsg),
      sgMail.send(bidderMsg)
    ]);
    
    console.log('📧 Auction end emails sent successfully');
  } catch (error) {
    console.error('❌ Error sending emails:', error);
  }
};

// Make endAuction function globally available for routes
global.endAuction = endAuction;

// Initialize database and start server
const PORT = process.env.PORT || 3000;

try {
  await initializeDatabase();
  console.log('✅ Database initialized successfully');
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📧 Email notifications: ${process.env.SENDGRID_API_KEY ? 'Enabled' : 'Disabled (add SENDGRID_API_KEY to enable)'}`);
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
