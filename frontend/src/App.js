import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import CreateAuction from './components/CreateAuction';
import ParticipateAuction from './components/ParticipateAuction';
import AuthWrapper from './components/auth/AuthWrapper';
import UserProfile from './components/UserProfile';
import './App.css';

function AppContent() {
  const [currentView, setCurrentView] = useState('home');
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const renderNavigation = () => (
    <nav className="nav-header">
      <div className="nav-container">
        <a href="#" className="logo" onClick={() => setCurrentView('home')}>
          <div className="logo-icon">A</div>
          AuctionHub Pro
        </a>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="user-greeting">
                Welcome, {user.user_metadata?.full_name || user.email.split('@')[0]}
              </span>
              <button 
                className="btn btn-secondary"
                onClick={() => setCurrentView('profile')}
              >
                My Account
              </button>
            </>
          ) : (
            currentView !== 'auth' && (
              <button 
                className="btn btn-secondary"
                onClick={() => setCurrentView('auth')}
              >
                Sign In
              </button>
            )
          )}
          {currentView !== 'home' && (
            <button 
              className="btn btn-secondary"
              onClick={() => setCurrentView('home')}
            >
              Back to Home
            </button>
          )}
        </div>
      </div>
    </nav>
  );

  const renderFeatures = () => (
    <div className="features-section">
      <div className="feature-card">
        <div className="feature-icon">RT</div>
        <h3 className="feature-title">Real-Time Bidding Technology</h3>
        <p className="feature-description">
          Experience lightning-fast bid updates with our advanced WebSocket infrastructure. 
          Every bid is processed and broadcast instantly to all participants.
        </p>
      </div>
      <div className="feature-card">
        <div className="feature-icon">SEC</div>
        <h3 className="feature-title">Enterprise Security</h3>
        <p className="feature-description">
          Bank-level encryption and multi-layer security protocols protect your transactions. 
          All auction data is encrypted and stored securely with user authentication.
        </p>
      </div>
      <div className="feature-card">
        <div className="feature-icon">24/7</div>
        <h3 className="feature-title">Global Marketplace</h3>
        <p className="feature-description">
          Connect with verified buyers and sellers worldwide. Our platform operates 24/7 
          with automated notifications and seamless user management.
        </p>
      </div>
    </div>
  );

  const handleCreateAuction = () => {
    if (!user) {
      setCurrentView('auth');
      return;
    }
    setCurrentView('create');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'create':
        return <CreateAuction onBack={() => setCurrentView('home')} />;
      case 'participate':
        return <ParticipateAuction onBack={() => setCurrentView('home')} />;
      case 'auth':
        return <AuthWrapper onBack={() => setCurrentView('home')} />;
      case 'profile':
        return user ? <UserProfile onBack={() => setCurrentView('home')} /> : setCurrentView('auth');
      default:
        return (
          <div className="home-container">
            <div className="hero-section">
              <h1 className="hero-title">
                The Premier <span className="gradient-text">Auction Platform</span>
              </h1>
              <p className="hero-subtitle">
                Join thousands of verified buyers and sellers in our secure, real-time marketplace. 
                Create auctions, place bids, and complete transactions with confidence.
              </p>
              <div className="cta-buttons">
                <button 
                  className="cta-button cta-primary"
                  onClick={handleCreateAuction}
                >
                  {user ? 'Start Selling' : 'Sign In to Sell'}
                </button>
                <button 
                  className="cta-button cta-secondary"
                  onClick={() => setCurrentView('participate')}
                >
                  Browse Auctions
                </button>
              </div>
              {!user && (
                <p className="auth-notice">
                  🔐 Authentication required for bidding and selling
                </p>
              )}
            </div>

            {renderFeatures()}

            
          </div>
        );
    }
  };

  return (
    <div className="App">
      {renderNavigation()}
      {renderCurrentView()}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;