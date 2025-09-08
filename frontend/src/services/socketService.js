import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isAuthenticated = false;
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
        this.isAuthenticated = false;
        console.log('Disconnected from server');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      // Handle authentication response
      this.socket.on('authenticated', (data) => {
        if (data.success) {
          this.isAuthenticated = true;
          console.log('Socket authenticated successfully');
        } else {
          this.isAuthenticated = false;
          console.error('Socket authentication failed:', data.error);
        }
      });
    }
    return this.socket;
  }

  authenticate(token) {
    if (this.socket && token) {
      console.log('Authenticating socket with token');
      this.socket.emit('authenticate', token);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isAuthenticated = false;
    }
  }

  joinAuction(auctionId) {
    if (this.socket && this.isConnected) {
      console.log('Joining auction:', auctionId);
      this.socket.emit('joinAuction', auctionId);
    } else {
      console.warn('Cannot join auction: socket not connected');
    }
  }

  placeBid(bidData) {
    if (this.socket && this.isConnected) {
      console.log('Placing bid:', bidData);
      this.socket.emit('placeBid', bidData);
    } else {
      console.warn('Cannot place bid: socket not connected');
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

  onAuthenticated(callback) {
    if (this.socket) {
      this.socket.on('authenticated', callback);
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
      // Re-add essential connection listeners
      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('Connected to server');
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        this.isAuthenticated = false;
        console.log('Disconnected from server');
      });

      this.socket.on('authenticated', (data) => {
        if (data.success) {
          this.isAuthenticated = true;
          console.log('Socket authenticated successfully');
        } else {
          this.isAuthenticated = false;
          console.error('Socket authentication failed:', data.error);
        }
      });
    }
  }

  // Remove specific event listeners
  removeListener(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      authenticated: this.isAuthenticated
    };
  }
}

export default new SocketService();
