// redisService.js — Upstash REST version (No ioredis)

import { Redis } from "@upstash/redis";

// fallback memory
let memoryStorage = new Map();
let redis = null;
let redisConnected = false;

// Initialize Upstash REST client
const initRedis = () => {
  try {
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      redisConnected = true;
      console.log("✅ Redis REST connected successfully");
    } else {
      console.log("⚠️ Missing Upstash REST env vars → Using in-memory fallback");
    }
  } catch (err) {
    console.log("❌ Redis init failed → Using memory fallback", err.message);
  }
};

initRedis();

// -------------------- SET HIGHEST BID --------------------
export const setHighestBid = async (auctionId, amount, email, name) => {
  const bidData = {
    amount: parseFloat(amount),
    bidderEmail: email,
    bidderName: name,
    timestamp: new Date().toISOString(),
  };

  try {
    if (redisConnected) {
      await redis.set(`auction:${auctionId}:highest_bid`, JSON.stringify(bidData));
    } else {
      memoryStorage.set(`auction:${auctionId}:highest_bid`, bidData);
    }

    return bidData;
  } catch (err) {
    console.log("❌ Redis error, using fallback:", err.message);
    memoryStorage.set(`auction:${auctionId}:highest_bid`, bidData);
    return bidData;
  }
};

// -------------------- GET CURRENT HIGHEST BID --------------------
export const getCurrentHighestBid = async (auctionId) => {
  try {
    if (redisConnected) {
      const data = await redis.get(`auction:${auctionId}:highest_bid`);
      if (data) return JSON.parse(data).amount;
    }

    const fallback = memoryStorage.get(`auction:${auctionId}:highest_bid`);
    return fallback ? fallback.amount : 0;
  } catch (err) {
    const fallback = memoryStorage.get(`auction:${auctionId}:highest_bid`);
    return fallback ? fallback.amount : 0;
  }
};

// -------------------- GET FULL BID DATA --------------------
export const getHighestBidData = async (auctionId) => {
  try {
    if (redisConnected) {
      const data = await redis.get(`auction:${auctionId}:highest_bid`);
      return data ? JSON.parse(data) : null;
    }
    return memoryStorage.get(`auction:${auctionId}:highest_bid`) || null;
  } catch (err) {
    return memoryStorage.get(`auction:${auctionId}:highest_bid`) || null;
  }
};

// Debug endpoint helper
export const getConnectionStatus = () => ({
  redisConnected,
  redisUrl: process.env.UPSTASH_REDIS_REST_URL ? "Set" : "Not set",
  memoryStorage: memoryStorage.size,
});

