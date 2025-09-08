import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

// API base URL - use relative URL for production, localhost for development
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? (process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000')
  : '';  // Empty string for production (same domain)

const ParticipateAuction = ({ onBack }) => {
  const { user, getAccessToken } = useAuth();
  const [auctions, setAuctions] = useState([]);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [socket, setSocket] = useState(null);
  const [bids, setBids] = useState([]);

  useEffect(() => {
    fetchAuctions();
    
    // Initialize socket connection
    const socketUrl = process.env.NODE_ENV === 'development' 
      ? (process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000')
      : window.location.origin;
    
    console.log('Connecting to socket at:', socketUrl);
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    // Authenticate socket if user is logged in
    if (user) {
      getAccessToken().then(token => {
        if (token) {
          newSocket.emit('authenticate', token);
        }
      });
    }

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.on('authenticated', (data) => {
      if (data.success) {
        console.log('Socket authenticated successfully');
      } else {
        console.error('Socket authentication failed:', data.error);
      }
    });

    newSocket.on('newBid', (bidData) => {
      console.log('New bid received:', bidData);
      updateAuctionBid(bidData);
      
      if (selectedAuction && selectedAuction.id === bidData.auctionId) {
        setBids(prevBids => [bidData, ...prevBids.slice(0, 19)]); // Keep last 20 bids
        fetchAuctionDetails(bidData.auctionId); // Refresh auction details
      }
    });

    newSocket.on('auctionEnded', (data) => {
      console.log('Auction ended:', data);
      setMessage(`Auction for "${data.itemName}" has ended! Winner: ${data.winner} with $${parseFloat(data.highestBid).toFixed(2)}`);
      setMessageType('info');
      setTimeout(() => setMessage(''), 10000);
      
      // Refresh auctions to update status
      fetchAuctions();
      
      if (selectedAuction && selectedAuction.id === data.auctionId) {
        fetchAuctionDetails(data.auctionId);
      }
    });

    newSocket.on('bidError', (error) => {
      console.error('Bid error:', error);
      setMessage(error);
      setMessageType('error');
      setBidding(false);
      setTimeout(() => setMessage(''), 5000);
    });

    return () => {
      console.log('Cleaning up socket connection');
      newSocket.close();
    };
  }, [user]);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const headers = {};
      
      if (user) {
        const token = await getAccessToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await axios.get(`${API_BASE_URL}/api/auctions/active`, { headers });
      setAuctions(response.data);
    } catch (error) {
      console.error('Error fetching auctions:', error);
      setMessage('Failed to fetch auctions');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuctionDetails = async (auctionId) => {
    try {
      const headers = {};
      
      if (user) {
        const token = await getAccessToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await axios.get(`${API_BASE_URL}/api/auctions/${auctionId}`, { headers });
      setSelectedAuction(response.data);
      
      // Fetch recent bids
      const bidsResponse = await axios.get(`${API_BASE_URL}/api/auctions/${auctionId}/bids`);
      setBids(bidsResponse.data);
    } catch (error) {
      console.error('Error fetching auction details:', error);
    }
  };

  const updateAuctionBid = (bidData) => {
    setAuctions(prevAuctions => 
      prevAuctions.map(auction => 
        auction.id === bidData.auctionId 
          ? { 
              ...auction, 
              currentHighestBid: bidData.bidAmount,
              highestBidder: bidData.bidderName
            }
          : auction
      )
    );

    if (selectedAuction && selectedAuction.id === bidData.auctionId) {
      setSelectedAuction(prev => ({
        ...prev,
        currentHighestBid: bidData.bidAmount,
        highestBidder: bidData.bidderName
      }));
    }
  };

  const selectAuction = (auction) => {
    setSelectedAuction(auction);
    setBidAmount('');
    fetchAuctionDetails(auction.id);
    
    if (socket) {
      console.log('Joining auction:', auction.id);
      socket.emit('joinAuction', auction.id);
    }
  };

  const handleBid = async () => {
    if (!user) {
      setMessage('You must be logged in to place bids');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    if (!selectedAuction) {
      setMessage('Please select an auction first');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    const bidValue = parseFloat(bidAmount);
    const minimumBid = parseFloat(selectedAuction.currentHighestBid) + parseFloat(selectedAuction.bidIncrement);

    if (isNaN(bidValue) || bidValue < minimumBid) {
      setMessage(`Bid must be at least $${minimumBid.toFixed(2)}`);
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    if (!socket) {
      setMessage('Connection error. Please refresh the page.');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    if (!socket.connected) {
      setMessage('Connection lost. Please refresh the page.');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    setBidding(true);
    console.log('Placing bid:', {
      auctionId: selectedAuction.id,
      bidAmount: bidValue,
      bidderName: user.user_metadata?.full_name || user.email.split('@')[0],
      bidderEmail: user.email
    });

    // Clear any previous messages
    setMessage('');
    
    try {
      socket.emit('placeBid', {
        auctionId: selectedAuction.id,
        bidAmount: bidValue
      });

      // Reset bidding state after a longer delay if no response received
      setTimeout(() => {
        if (bidding) {
          setBidding(false);
          setMessage('Bid timeout. Please try again.');
          setMessageType('error');
          setTimeout(() => setMessage(''), 5000);
        }
      }, 10000); // 10 second timeout

    } catch (error) {
      console.error('Error emitting bid:', error);
      setBidding(false);
      setMessage('Failed to place bid. Please try again.');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const formatTimeRemaining = (timeRemaining) => {
    if (timeRemaining <= 0) return 'Ended';
    
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const renderAuctionList = () => (
    <div className="auctions-list">
      <div className="list-header">
        <h2>Active Auctions</h2>
        <button onClick={fetchAuctions} className="btn btn-secondary">
          Refresh
        </button>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading auctions...</p>
        </div>
      ) : auctions.length === 0 ? (
        <div className="empty-state">
          <p>No active auctions at the moment.</p>
          <button onClick={fetchAuctions} className="btn btn-primary">
            Refresh
          </button>
        </div>
      ) : (
        <div className="auctions-grid">
          {auctions.map(auction => (
            <div 
              key={auction.id} 
              className={`auction-card ${selectedAuction?.id === auction.id ? 'selected' : ''}`}
              onClick={() => selectAuction(auction)}
            >
              {auction.images && auction.images.length > 0 && (
                <div className="auction-image">
                  <img src={auction.images[0].data} alt={auction.itemName} />
                </div>
              )}
              <div className="auction-info">
                <h3 className="auction-title">{auction.itemName}</h3>
                <p className="auction-description">{auction.description}</p>
                <div className="auction-details">
                  <div className="price-info">
                    <span className="current-bid">${parseFloat(auction.currentHighestBid).toFixed(2)}</span>
                    <span className="bid-info">Current Bid</span>
                  </div>
                  <div className="time-info">
                    <span className="time-remaining">{formatTimeRemaining(auction.timeRemaining)}</span>
                  </div>
                  <div className="seller-info">
                    <span className="seller">By: {auction.sellerName}</span>
                    {auction.isOwner && (
                      <span className="owner-badge">Your Auction</span>
                    )}
                  </div>
                </div>
                {auction.highestBidder && (
                  <div className="highest-bidder">
                    Leading: {auction.highestBidder}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAuctionDetails = () => (
    <div className="auction-details-panel">
      <div className="details-header">
        <h2>{selectedAuction.itemName}</h2>
        <button 
          onClick={() => setSelectedAuction(null)} 
          className="btn btn-secondary"
        >
          Back to List
        </button>
      </div>

      <div className="details-content">
        {selectedAuction.images && selectedAuction.images.length > 0 && (
          <div className="auction-main-image">
            <img src={selectedAuction.images[0].data} alt={selectedAuction.itemName} />
          </div>
        )}

        <div className="auction-info-detailed">
          <div className="description-section">
            <h3>Description</h3>
            <p>{selectedAuction.description || 'No description provided.'}</p>
          </div>

          <div className="pricing-section">
            <div className="price-row">
              <span className="label">Starting Price:</span>
              <span className="value">${parseFloat(selectedAuction.startingPrice).toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span className="label">Current Highest Bid:</span>
              <span className="value current-bid">${parseFloat(selectedAuction.currentHighestBid).toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span className="label">Bid Increment:</span>
              <span className="value">${parseFloat(selectedAuction.bidIncrement).toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span className="label">Next Minimum Bid:</span>
              <span className="value highlight">${(parseFloat(selectedAuction.currentHighestBid) + parseFloat(selectedAuction.bidIncrement)).toFixed(2)}</span>
            </div>
          </div>

          <div className="time-section">
            <div className="time-remaining-display">
              {formatTimeRemaining(selectedAuction.timeRemaining)}
            </div>
          </div>

          <div className="seller-section">
            <h4>Seller Information</h4>
            <p><strong>Name:</strong> {selectedAuction.sellerName}</p>
            {user && (selectedAuction.isOwner || selectedAuction.status === 'ended') && selectedAuction.sellerEmail && (
              <p><strong>Email:</strong> {selectedAuction.sellerEmail}</p>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="connection-status">
        <span className={`status-indicator ${socket?.connected ? 'connected' : 'disconnected'}`}>
          {socket?.connected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>

      {/* Bidding Section */}
      {selectedAuction.status === 'active' && selectedAuction.timeRemaining > 0 && (
        <div className="bidding-section">
          {!user ? (
            <div className="auth-required">
              <p>You must be logged in to place bids</p>
            </div>
          ) : selectedAuction.isOwner ? (
            <div className="own-auction-notice">
              <p>You cannot bid on your own auction</p>
            </div>
          ) : (
            <div className="bid-form">
              <h3>Place Your Bid</h3>
              <div className="bid-input-group">
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Minimum: $${(parseFloat(selectedAuction.currentHighestBid) + parseFloat(selectedAuction.bidIncrement)).toFixed(2)}`}
                  step="0.01"
                  min={parseFloat(selectedAuction.currentHighestBid) + parseFloat(selectedAuction.bidIncrement)}
                  disabled={bidding || !socket?.connected}
                  className="bid-input"
                />
                <button 
                  onClick={handleBid} 
                  disabled={bidding || !bidAmount || !socket?.connected}
                  className="btn btn-primary bid-button"
                >
                  {bidding ? 'Placing Bid...' : 'Place Bid'}
                </button>
              </div>
              {!socket?.connected && (
                <p className="connection-warning">⚠️ Connection lost. Please refresh the page.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent Bids */}
      <div className="bids-section">
        <h3>Recent Bids</h3>
        {bids.length === 0 ? (
          <p>No bids placed yet.</p>
        ) : (
          <div className="bids-list">
            {bids.map(bid => (
              <div key={bid.id} className="bid-item">
                <div className="bid-amount">${parseFloat(bid.bidAmount).toFixed(2)}</div>
                <div className="bid-details">
                  <div className="bidder">{bid.bidderName}</div>
                  <div className="bid-time">{new Date(bid.bidTime).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="participate-container">
      <div className="participate-header">
        <h1 className="participate-title">Auction Marketplace</h1>
        <p className="participate-subtitle">
          {user 
            ? `Welcome ${user.user_metadata?.full_name || user.email.split('@')[0]}! Browse and bid on active auctions.`
            : 'Browse active auctions. Sign in to place bids.'
          }
        </p>
        <button 
          className="btn btn-secondary" 
          onClick={onBack}
        >
          Back to Home
        </button>
      </div>

      {message && (
        <div className={`message message-${messageType}`}>
          {message}
        </div>
      )}

      <div className="participate-content">
        {selectedAuction ? renderAuctionDetails() : renderAuctionList()}
      </div>
    </div>
  );
};

export default ParticipateAuction;
