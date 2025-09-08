import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 10000; // Max 10 seconds
    this.pendingActions = []; // Queue actions until connected
  }

  connect() {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    // Clean up any existing socket
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    // For production, connect to same domain. For development, use localhost
    const socketUrl = process.env.NODE_ENV === 'development' 
      ? (process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000')
      : window.location.origin; // Use current domain in production
    
    console.log('Connecting to socket at:', socketUrl);
    
    // Configure socket with better options for cloud deployment
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      upgrade: true,
      timeout: 20000, // 20 seconds connection timeout
      reconnection: true,
      reconnectionAttempts: this.maxConnectionAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: this.maxReconnectDelay,
      maxHttpBufferSize: 1e6, // 1MB buffer
      pingTimeout: 60000, // 60 seconds
      pingInterval: 25000, // 25 seconds
      forceNew: true // Force a new connection
    });
    
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.connectionAttempts = 0; // Reset attempts on successful connection
      this.reconnectDelay = 1000; // Reset delay
      console.log('✅ Connected to server successfully');
      
      // Process any pending actions
      this.processPendingActions();
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.isAuthenticated = false;
      console.log('❌ Disconnected from server:', reason);
      
      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server disconnected us, reconnect manually
        console.log('🔄 Server disconnected, attempting manual reconnection...');
        setTimeout(() => this.connect(), 2000);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      this.connectionAttempts++;
      
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.error('❌ Max connection attempts reached. Please refresh the page.');
        this.isConnected = false;
      } else {
        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
        console.log(`🔄 Retrying connection in ${this.reconnectDelay}ms (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})`);
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected successfully after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.connectionAttempts = 0;
      this.processPendingActions();
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect after maximum attempts');
      this.isConnected = false;
    });

    // Handle authentication response
    this.socket.on('authenticated', (data) => {
      if (data.success) {
        this.isAuthenticated = true;
        console.log('✅ Socket authenticated successfully');
      } else {
        this.isAuthenticated = false;
        console.error('❌ Socket authentication failed:', data.error);
      }
    });

    return this.socket;
  }

  // Process actions that were queued while disconnected
  processPendingActions() {
    if (this.pendingActions.length > 0) {
      console.log(`🔄 Processing ${this.pendingActions.length} pending actions`);
      const actions = [...this.pendingActions];
      this.pendingActions = [];
      
      actions.forEach(action => {
        try {
          action();
        } catch (error) {
          console.error('❌ Error processing pending action:', error);
        }
      });
    }
  }

  authenticate(token) {
    if (this.socket && this.isConnected && token) {
      console.log('🔐 Authenticating socket with token');
      this.socket.emit('authenticate', token);
    } else if (token) {
      // Queue authentication if not connected
      this.pendingActions.push(() => this.authenticate(token));
      console.log('📋 Authentication queued until connection established');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isAuthenticated = false;
      this.pendingActions = [];
      console.log('🔌 Socket disconnected manually');
    }
  }

  joinAuction(auctionId) {
    const executeJoin = () => {
      if (this.socket && this.socket.connected) {
        console.log('🚪 Joining auction:', auctionId);
        this.socket.emit('joinAuction', auctionId);
        return true;
      }
      return false;
    };

    // Try to execute immediately
    if (executeJoin()) {
      return;
    }

    // If not connected, queue the action and try to connect
    console.log('📋 Queueing auction join until connected:', auctionId);
    this.pendingActions.push(() => executeJoin());
    
    // Ensure we're trying to connect
    if (!this.socket || !this.socket.connected) {
      console.log('🔄 Initiating connection for auction join');
      this.connect();
    }
  }

  placeBid(bidData) {
    const executeBid = () => {
      if (this.socket && this.socket.connected) {
        console.log('💰 Placing bid:', bidData);
        this.socket.emit('placeBid', bidData);
        return true;
      }
      return false;
    };

    // Try to execute immediately
    if (executeBid()) {
      return;
    }

    // If not connected, queue the action and try to connect
    console.log('📋 Queueing bid placement until connected:', bidData);
    this.pendingActions.push(() => executeBid());
    
    // Ensure we're trying to connect
    if (!this.socket || !this.socket.connected) {
      console.log('🔄 Initiating connection for bid placement');
      this.connect();
    }
  }

  // Event listeners with connection checking
  onNewBid(callback) {
    if (this.socket) {
      this.socket.on('newBid', callback);
    } else {
      this.pendingActions.push(() => {
        if (this.socket) this.socket.on('newBid', callback);
      });
    }
  }

  onBidError(callback) {
    if (this.socket) {
      this.socket.on('bidError', callback);
    } else {
      this.pendingActions.push(() => {
        if (this.socket) this.socket.on('bidError', callback);
      });
    }
  }

  onAuctionEnded(callback) {
    if (this.socket) {
      this.socket.on('auctionEnded', callback);
    } else {
      this.pendingActions.push(() => {
        if (this.socket) this.socket.on('auctionEnded', callback);
      });
    }
  }

  onAuthenticated(callback) {
    if (this.socket) {
      this.socket.on('authenticated', callback);
    } else {
      this.pendingActions.push(() => {
        if (this.socket) this.socket.on('authenticated', callback);
      });
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
      // Re-add essential connection listeners
      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('✅ Reconnected after removing listeners');
        this.processPendingActions();
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        this.isAuthenticated = false;
        console.log('❌ Disconnected after removing listeners:', reason);
      });

      this.socket.on('authenticated', (data) => {
        if (data.success) {
          this.isAuthenticated = true;
          console.log('✅ Socket authenticated successfully');
        } else {
          this.isAuthenticated = false;
          console.error('❌ Socket authentication failed:', data.error);
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
      connected: this.isConnected && this.socket && this.socket.connected,
      authenticated: this.isAuthenticated,
      socketExists: !!this.socket,
      connectionAttempts: this.connectionAttempts,
      pendingActions: this.pendingActions.length
    };
  }

  // Force reconnection method
  forceReconnect() {
    console.log('🔄 Forcing reconnection...');
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }

  // Health check method
  isHealthy() {
    return this.socket && this.socket.connected && this.isConnected;
  }
}

export default new SocketService();
