import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Login = ({ onSwitchToRegister, onBack }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const { signIn } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setMessage('Please fill in all fields');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await signIn(formData.email, formData.password);
      
      if (error) {
        setMessage(error.message || 'Login failed');
        setMessageType('error');
      } else {
        setMessage('Login successful!');
        setMessageType('success');
        // The AuthContext will handle the redirect via state change
      }
    } catch (error) {
      setMessage('An unexpected error occurred');
      setMessageType('error');
    } finally {
      setLoading(false);
      if (message) {
        setTimeout(() => setMessage(''), 5000);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">
            Sign in to your account to start bidding and selling
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your password"
              required
            />
          </div>

          {message && (
            <div className={`message message-${messageType}`}>
              {message}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="loading-spinner" style={{ 
                  width: '16px', 
                  height: '16px', 
                  marginRight: '8px',
                  marginBottom: '0'
                }}></div>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-links">
          <button 
            type="button" 
            className="link-button"
            onClick={onSwitchToRegister}
          >
            Don't have an account? Sign up
          </button>
        </div>

        <div className="auth-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onBack}
            disabled={loading}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;