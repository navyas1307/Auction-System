import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    if (!this.socket) {
      // For production, connect to same domain. For development, use localhost
      const socketUrl = process.env.NODE_ENV === 'development' 
        ? (process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000')
        : window.location.origin; // Use current domain in production
      
      console.log('Connecting to socket at:', socketUrl);
      this.socket = io(socketUrl);
      
      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('Connected to server');
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        console.log('Disconnected from server');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  joinAuction(auctionId) {
    if (this.socket) {
      console.log('Joining auction:', auctionId);
      this.socket.emit('joinAuction', auctionId);
    }
  }

  placeBid(bidData) {
    if (this.socket) {
      console.log('Placing bid:', bidData);
      this.socket.emit('placeBid', bidData);
    }
  }

  onNewBid(callback) {
    if (this.socket) {
      this.socket.on('newBid', callback);
    }
  }

  onBidError(callback) {
    if (this.socket) {
      this.socket.on('bidError', callback);
    }
  }

  onAuctionEnded(callback) {
    if (this.socket) {
      this.socket.on('auctionEnded', callback);
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export default new SocketService();
