import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

// API base URL - use relative URL for production, localhost for development
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? (process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000')
  : '';  // Empty string for production (same domain)

const UserProfile = ({ onBack }) => {
  const { user, signOut, getAccessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [myAuctions, setMyAuctions] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [activeTab, setActiveTab] = useState('auctions'); // 'auctions', 'bids', 'profile'
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    if (activeTab === 'auctions') {
      fetchMyAuctions();
    } else if (activeTab === 'bids') {
      fetchMyBids();
    }
  }, [activeTab]);

  const fetchMyAuctions = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      const response = await axios.get(`${API_BASE_URL}/api/auctions/my-auctions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setMyAuctions(response.data);
    } catch (error) {
      console.error('Error fetching auctions:', error);
      setMessage('Failed to fetch your auctions');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBids = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      const response = await axios.get(`${API_BASE_URL}/api/auctions/my-bids`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setMyBids(response.data);
    } catch (error) {
      console.error('Error fetching bids:', error);
      setMessage('Failed to fetch your bids');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
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

  const renderMyAuctions = () => (
    <div className="profile-section">
      <h3 className="section-title">My Auctions</h3>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your auctions...</p>
        </div>
      ) : myAuctions.length === 0 ? (
        <div className="empty-state">
          <p>You haven't created any auctions yet.</p>
        </div>
      ) : (
        <div className="auctions-grid">
          {myAuctions.map(auction => (
            <div key={auction.id} className="auction-card">
              {auction.images && auction.images.length > 0 && (
                <div className="auction-image">
                  <img src={auction.images[0].data} alt={auction.itemName} />
                </div>
              )}
              <div className="auction-info">
                <h4 className="auction-title">{auction.itemName}</h4>
                <p className="auction-description">{auction.description}</p>
                <div className="auction-details">
                  <div className="detail-row">
                    <span className="label">Starting Price:</span>
                    <span className="value">${parseFloat(auction.startingPrice).toFixed(2)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Current Bid:</span>
                    <span className="value">${parseFloat(auction.currentHighestBid).toFixed(2)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Status:</span>
                    <span className={`status ${auction.status}`}>{auction.status}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Time:</span>
                    <span className="value">{formatTimeRemaining(auction.timeRemaining)}</span>
                  </div>
                  {auction.highestBidder && (
                    <div className="detail-row">
                      <span className="label">Leading Bidder:</span>
                      <span className="value">{auction.highestBidder}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderMyBids = () => (
    <div className="profile-section">
      <h3 className="section-title">My Bids</h3>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your bids...</p>
        </div>
      ) : myBids.length === 0 ? (
        <div className="empty-state">
          <p>You haven't placed any bids yet.</p>
        </div>
      ) : (
        <div className="bids-list">
          {myBids.map(bid => (
            <div key={bid.id} className="bid-card">
              <div className="bid-info">
                <h4 className="auction-title">{bid.Auction.itemName}</h4>
                <div className="bid-details">
                  <div className="detail-row">
                    <span className="label">Your Bid:</span>
                    <span className="value">${parseFloat(bid.bidAmount).toFixed(2)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Current Highest:</span>
                    <span className="value">${parseFloat(bid.currentHighestBid).toFixed(2)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Status:</span>
                    <span className={`status ${bid.isWinning ? 'winning' : 'outbid'}`}>
                      {bid.isWinning ? 'Winning' : 'Outbid'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Auction Status:</span>
                    <span className={`status ${bid.Auction.status}`}>{bid.Auction.status}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Bid Time:</span>
                    <span className="value">{new Date(bid.bidTime).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="profile-section">
      <h3 className="section-title">Account Information</h3>
      <div className="profile-info">
        <div className="info-card">
          <div className="detail-row">
            <span className="label">Full Name:</span>
            <span className="value">{user?.user_metadata?.full_name || 'Not provided'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Email:</span>
            <span className="value">{user?.email}</span>
          </div>
          <div className="detail-row">
            <span className="label">Member Since:</span>
            <span className="value">{new Date(user?.created_at).toLocaleDateString()}</span>
          </div>
          <div className="detail-row">
            <span className="label">Email Verified:</span>
            <span className={`status ${user?.email_confirmed_at ? 'verified' : 'unverified'}`}>
              {user?.email_confirmed_at ? 'Verified' : 'Not Verified'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-title-section">
          <h1 className="profile-title">My Account</h1>
          <p className="profile-subtitle">
            Welcome back, {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
        <div className="profile-actions">
          <button 
            className="btn btn-secondary"
            onClick={onBack}
          >
            Back to Home
          </button>
          <button 
            className="btn btn-outline"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'auctions' ? 'active' : ''}`}
          onClick={() => setActiveTab('auctions')}
        >
          My Auctions
        </button>
        <button 
          className={`tab-button ${activeTab === 'bids' ? 'active' : ''}`}
          onClick={() => setActiveTab('bids')}
        >
          My Bids
        </button>
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
      </div>

      {message && (
        <div className={`message message-${messageType}`}>
          {message}
        </div>
      )}

      <div className="profile-content">
        {activeTab === 'auctions' && renderMyAuctions()}
        {activeTab === 'bids' && renderMyBids()}
        {activeTab === 'profile' && renderProfile()}
      </div>
    </div>
  );
};

export default UserProfile;