import Redis from 'ioredis';

// In-memory fallback storage
let memoryStorage = new Map();
let redisConnected = false;
let redis = null;

// Initialize Redis with error handling
const initRedis = async () => {
  try {
    if (process.env.UPSTASH_REDIS_URL) {
      redis = new Redis(process.env.UPSTASH_REDIS_URL);
      
      // Test the connection
      await redis.ping();
      redisConnected = true;
      console.log('✅ Redis connected successfully');
      return true;
    } else {
      console.log('⚠️ UPSTASH_REDIS_URL not found, using in-memory storage');
      return false;
    }
  } catch (error) {
    console.log('❌ Redis connection failed, falling back to in-memory storage:', error.message);
    redis = null;
    redisConnected = false;
    return false;
  }
};

// Initialize on module load
initRedis();

export const setHighestBid = async (auctionId, amount, bidderEmail, bidderName) => {
  const bidData = {
    amount: parseFloat(amount),
    bidderEmail: bidderEmail,
    bidderName: bidderName,
    timestamp: new Date().toISOString()
  };
  
  try {
    if (redisConnected && redis) {
      const key = `auction:${auctionId}:highest_bid`;
      await redis.set(key, JSON.stringify(bidData));
      console.log(`💾 Redis: Stored bid for auction ${auctionId}: $${amount} by ${bidderName || 'Starting price'}`);
    } else {
      // Fallback to in-memory storage
      memoryStorage.set(`auction:${auctionId}:highest_bid`, bidData);
      console.log(`💾 Memory: Stored bid for auction ${auctionId}: $${amount} by ${bidderName || 'Starting price'}`);
    }
    return bidData;
  } catch (error) {
    console.error('❌ Error setting highest bid, falling back to memory:', error.message);
    // Fallback to memory if Redis fails
    memoryStorage.set(`auction:${auctionId}:highest_bid`, bidData);
    return bidData;
  }
};

export const getCurrentHighestBid = async (auctionId) => {
  try {
    if (redisConnected && redis) {
      const key = `auction:${auctionId}:highest_bid`;
      const data = await redis.get(key);
      
      if (data) {
        const bidData = JSON.parse(data);
        return parseFloat(bidData.amount);
      }
    } else {
      // Fallback to in-memory storage
      const data = memoryStorage.get(`auction:${auctionId}:highest_bid`);
      if (data) {
        return parseFloat(data.amount);
      }
    }
    
    return 0;
  } catch (error) {
    console.error('❌ Error getting current highest bid, trying memory fallback:', error.message);
    // Try memory fallback
    const data = memoryStorage.get(`auction:${auctionId}:highest_bid`);
    return data ? parseFloat(data.amount) : 0;
  }
};

export const getHighestBidData = async (auctionId) => {
  try {
    if (redisConnected && redis) {
      const key = `auction:${auctionId}:highest_bid`;
      const data = await redis.get(key);
      
      if (data) {
        const bidData = JSON.parse(data);
        return {
          ...bidData,
          amount: parseFloat(bidData.amount)
        };
      }
    } else {
      // Fallback to in-memory storage
      const data = memoryStorage.get(`auction:${auctionId}:highest_bid`);
      if (data) {
        return {
          ...data,
          amount: parseFloat(data.amount)
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting highest bid data, trying memory fallback:', error.message);
    // Try memory fallback
    const data = memoryStorage.get(`auction:${auctionId}:highest_bid`);
    return data ? { ...data, amount: parseFloat(data.amount) } : null;
  }
};

// Export connection status for debugging
export const getConnectionStatus = () => ({
  redisConnected,
  redisUrl: process.env.UPSTASH_REDIS_URL ? 'Set' : 'Not set',
  memoryStorageSize: memoryStorage.size
});
