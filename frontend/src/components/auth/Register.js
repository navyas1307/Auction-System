import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Register = ({ onSwitchToLogin, onBack }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const { signUp } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setMessage('Full name is required');
      setMessageType('error');
      return false;
    }

    if (!formData.email.trim()) {
      setMessage('Email is required');
      setMessageType('error');
      return false;
    }

    if (!formData.email.includes('@')) {
      setMessage('Please enter a valid email address');
      setMessageType('error');
      return false;
    }

    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setMessageType('error');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await signUp(formData.email, formData.password, formData.fullName);
      
      if (error) {
        setMessage(error.message || 'Registration failed');
        setMessageType('error');
      } else {
        setMessage('Registration successful! Please check your email to verify your account.');
        setMessageType('success');
        // Clear form
        setFormData({
          fullName: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      setMessage('An unexpected error occurred');
      setMessageType('error');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 8000);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">
            Join our auction community and start trading today
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your full name"
              required
            />
          </div>

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
              placeholder="Create a password (min. 6 characters)"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="form-input"
              placeholder="Confirm your password"
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
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-links">
          <button 
            type="button" 
            className="link-button"
            onClick={onSwitchToLogin}
          >
            Already have an account? Sign in
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

export default Register;