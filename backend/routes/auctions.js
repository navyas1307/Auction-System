import express from 'express';
import { Auction, Bid } from '../models/index.js';
import * as redisService from '../services/redisService.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Helper function to validate and process images
const processImages = (images) => {
  if (!images || !Array.isArray(images)) {
    return [];
  }
  
  // Validate each image
  const validImages = images.filter(image => {
    if (!image || typeof image !== 'object') return false;
    if (!image.data || !image.data.startsWith('data:image/')) return false;
    if (!image.name || typeof image.name !== 'string') return false;
    
    // Check file size (base64 string length roughly corresponds to file size)
    const sizeInBytes = image.data.length * 0.75; // Rough estimate for base64
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    return sizeInBytes <= maxSize;
  });
  
  // Limit to maximum 5 images
  return validImages.slice(0, 5);
};

// Create a new auction (requires authentication)
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { itemName, description, startingPrice, bidIncrement, duration, images } = req.body;
    const user = req.user;
    
    // Validate input
    if (!itemName || !startingPrice || !bidIncrement || !duration) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Process and validate images
    const processedImages = processImages(images);

    const auction = await Auction.create({
      itemName,
      description,
      images: processedImages,
      startingPrice: parseFloat(startingPrice),
      bidIncrement: parseFloat(bidIncrement),
      duration: parseInt(duration),
      sellerName: user.user_metadata?.full_name || user.email.split('@')[0],
      sellerEmail: user.email,
      sellerId: user.id
    });

    // Initialize Redis with starting price (no bidder initially)
    await redisService.setHighestBid(auction.id, startingPrice, null, null);

    // Set timer to end auction
    setTimeout(() => {
      if (global.endAuction) {
        console.log(`⏰ Timer triggered for auction ${auction.id}`);
        global.endAuction(auction.id);
      }
    }, duration * 60 * 1000); // Convert minutes to milliseconds

    console.log(`✅ Created auction ${auction.id} for ${itemName}, duration: ${duration} minutes, images: ${processedImages.length}`);
    res.json({ 
      success: true, 
      auction: auction.toJSON(),
      message: `Auction created successfully! ID: ${auction.id}`
    });
  } catch (error) {
    console.error('❌ Error creating auction:', error);
    res.status(500).json({ error: 'Failed to create auction', details: error.message });
  }
});

// Get all active auctions (public, no auth required)
router.get('/active', optionalAuth, async (req, res) => {
  try {
    const auctions = await Auction.findAll({
      where: { status: 'active' },
      order: [['createdAt', 'DESC']]
    });

    // Get current highest bids from Redis and check if auctions should be ended
    const auctionsWithBids = await Promise.all(
      auctions.map(async (auction) => {
        // Check if auction should be ended
        const startTime = new Date(auction.startTime);
        const endTime = new Date(startTime.getTime() + auction.duration * 60 * 1000);
        const now = new Date();
        
        if (now > endTime && auction.status === 'active') {
          // End the auction if time has passed
          if (global.endAuction) {
            await global.endAuction(auction.id);
          }
          return null; // Don't include ended auctions
        }
        
        const currentBid = await redisService.getCurrentHighestBid(auction.id);
        const bidData = await redisService.getHighestBidData(auction.id);
        
        const auctionData = {
          ...auction.toJSON(),
          currentHighestBid: currentBid,
          timeRemaining: Math.max(0, endTime - now),
          highestBidder: bidData?.bidderName || null,
          isOwner: req.user ? auction.sellerId === req.user.id : false
        };

        // Don't include seller contact info in public listings
        delete auctionData.sellerEmail;
        
        return auctionData;
      })
    );

    // Filter out null values (ended auctions)
    const activeAuctions = auctionsWithBids.filter(auction => auction !== null);

    res.json(activeAuctions);
  } catch (error) {
    console.error('❌ Error fetching auctions:', error);
    res.status(500).json({ error: 'Failed to fetch auctions' });
  }
});

// Get user's own auctions (requires authentication)
router.get('/my-auctions', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const auctions = await Auction.findAll({
      where: { sellerId: user.id },
      order: [['createdAt', 'DESC']]
    });

    // Get current highest bids from Redis
    const auctionsWithBids = await Promise.all(
      auctions.map(async (auction) => {
        const currentBid = await redisService.getCurrentHighestBid(auction.id);
        const bidData = await redisService.getHighestBidData(auction.id);
        
        const startTime = new Date(auction.startTime);
        const endTime = new Date(startTime.getTime() + auction.duration * 60 * 1000);
        const now = new Date();
        
        return {
          ...auction.toJSON(),
          currentHighestBid: currentBid,
          timeRemaining: Math.max(0, endTime - now),
          highestBidder: bidData?.bidderName || null,
          isOwner: true
        };
      })
    );

    res.json(auctionsWithBids);
  } catch (error) {
    console.error('❌ Error fetching user auctions:', error);
    res.status(500).json({ error: 'Failed to fetch auctions' });
  }
});

// Get user's bid history (requires authentication)
router.get('/my-bids', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const bids = await Bid.findAll({
      where: { bidderId: user.id },
      include: [{
        model: Auction,
        attributes: ['id', 'itemName', 'status', 'sellerId', 'sellerName']
      }],
      order: [['bidTime', 'DESC']],
      limit: 50
    });

    // Get current status for each auction
    const bidsWithStatus = await Promise.all(
      bids.map(async (bid) => {
        const currentBid = await redisService.getCurrentHighestBid(bid.auctionId);
        const bidData = await redisService.getHighestBidData(bid.auctionId);
        
        return {
          ...bid.toJSON(),
          isWinning: bidData?.bidderEmail === user.email,
          currentHighestBid: currentBid
        };
      })
    );

    res.json(bidsWithStatus);
  } catch (error) {
    console.error('❌ Error fetching user bids:', error);
    res.status(500).json({ error: 'Failed to fetch bid history' });
  }
});

// Get specific auction details (public with optional auth)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const auctionId = parseInt(req.params.id);
    if (isNaN(auctionId)) {
      return res.status(400).json({ error: 'Invalid auction ID' });
    }

    const auction = await Auction.findByPk(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Check if auction should be ended
    const startTime = new Date(auction.startTime);
    const endTime = new Date(startTime.getTime() + auction.duration * 60 * 1000);
    const now = new Date();
    
    if (now > endTime && auction.status === 'active') {
      // End the auction if time has passed
      if (global.endAuction) {
        await global.endAuction(auction.id);
      }
      // Refresh auction data
      const updatedAuction = await Auction.findByPk(auctionId);
      
      const currentHighestBid = await redisService.getCurrentHighestBid(auction.id);
      const bidData = await redisService.getHighestBidData(auction.id);

      const auctionData = {
        ...updatedAuction.toJSON(),
        currentHighestBid,
        highestBidder: bidData?.bidderName || null,
        timeRemaining: 0,
        isOwner: req.user ? auction.sellerId === req.user.id : false
      };

      // Only include seller email if user is owner or winner
      const isWinner = req.user && bidData?.bidderEmail === req.user.email;
      const isOwner = req.user && auction.sellerId === req.user.id;
      if (!isOwner && !isWinner) {
        delete auctionData.sellerEmail;
      }

      return res.json(auctionData);
    }

    const currentHighestBid = await redisService.getCurrentHighestBid(auction.id);
    const bidData = await redisService.getHighestBidData(auction.id);

    const auctionData = {
      ...auction.toJSON(),
      currentHighestBid,
      highestBidder: bidData?.bidderName || null,
      timeRemaining: Math.max(0, endTime - now),
      isOwner: req.user ? auction.sellerId === req.user.id : false
    };

    // Only include seller email if user is owner
    if (!req.user || auction.sellerId !== req.user.id) {
      delete auctionData.sellerEmail;
    }

    res.json(auctionData);
  } catch (error) {
    console.error('❌ Error fetching auction:', error);
    res.status(500).json({ error: 'Failed to fetch auction' });
  }
});

// Get auction history/bids (public)
router.get('/:id/bids', async (req, res) => {
  try {
    const auctionId = parseInt(req.params.id);
    if (isNaN(auctionId)) {
      return res.status(400).json({ error: 'Invalid auction ID' });
    }

    const bids = await Bid.findAll({
      where: { auctionId },
      order: [['bidTime', 'DESC']],
      limit: 20, // Get last 20 bids
      attributes: ['id', 'bidAmount', 'bidderName', 'bidTime'] // Don't expose bidder emails or IDs
    });

    res.json(bids);
  } catch (error) {
    console.error('❌ Error fetching bids:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

// Manual end auction (for testing - only auction owner)
router.post('/:id/end', authenticateToken, async (req, res) => {
  try {
    const auctionId = parseInt(req.params.id);
    if (isNaN(auctionId)) {
      return res.status(400).json({ error: 'Invalid auction ID' });
    }

    const auction = await Auction.findByPk(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Check if user owns this auction
    if (auction.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only end your own auctions' });
    }

    if (global.endAuction) {
      await global.endAuction(auctionId);
      res.json({ success: true, message: 'Auction ended manually' });
    } else {
      res.status(500).json({ error: 'End auction function not available' });
    }
  } catch (error) {
    console.error('❌ Error ending auction manually:', error);
    res.status(500).json({ error: 'Failed to end auction' });
  }
});

export default router;