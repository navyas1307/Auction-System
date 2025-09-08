import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

// API base URL - use relative URL for production, localhost for development
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? (process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000')
  : '';  // Empty string for production (same domain)

const CreateAuction = ({ onBack }) => {
  const { user, getAccessToken } = useAuth();
  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    startingPrice: '',
    bidIncrement: '',
    duration: '',
    image: null
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="form-container">
        <div className="form-card">
          <h2>Authentication Required</h2>
          <p>You must be logged in to create auctions.</p>
          <button className="btn btn-primary" onClick={onBack}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;

    const maxSizePerFile = 5 * 1024 * 1024; // 5MB per file
    
    setUploadingImage(true);

    // Check file size
    if (file.size > maxSizePerFile) {
      setMessage('Image is too large. Maximum size is 5MB.');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
      setUploadingImage(false);
      e.target.value = '';
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setMessage('Please select a valid image file.');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
      setUploadingImage(false);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = {
        id: Date.now(),
        name: file.name,
        data: e.target.result,
        size: file.size
      };
      
      setFormData(prev => ({
        ...prev,
        image: imageData
      }));
      
      setMessage('Image uploaded successfully');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
      setUploadingImage(false);
    };
    
    reader.onerror = () => {
      setMessage('Failed to read the image file');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
      setUploadingImage(false);
    };
    
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null
    }));
    const fileInput = document.getElementById('imageUpload');
    if (fileInput) fileInput.value = '';
  };

  const validateForm = () => {
    const { itemName, startingPrice, bidIncrement, duration } = formData;
    
    if (!itemName.trim()) {
      setMessage('Please enter an item name');
      setMessageType('error');
      return false;
    }
    
    if (!startingPrice || parseFloat(startingPrice) <= 0) {
      setMessage('Starting price must be greater than $0.00');
      setMessageType('error');
      return false;
    }
    
    if (!bidIncrement || parseFloat(bidIncrement) <= 0) {
      setMessage('Bid increment must be greater than $0.00');
      setMessageType('error');
      return false;
    }
    
    if (!duration || parseInt(duration) < 1) {
      setMessage('Duration must be at least 1 minute');
      setMessageType('error');
      return false;
    }
    
    return true;
  };

  const testConnection = async () => {
    try {
      console.log('Testing API connection...');
      setDebugInfo('Testing API connection...');
      
      const response = await axios.get(`${API_BASE_URL}/api/test`);
      console.log('API Test Response:', response.data);
      setDebugInfo(prev => prev + '\n✅ API connection successful: ' + JSON.stringify(response.data));
      return true;
    } catch (error) {
      console.error('API Test Failed:', error);
      setDebugInfo(prev => prev + '\n❌ API connection failed: ' + error.message);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setTimeout(() => setMessage(''), 5000);
      return;
    }
    
    setLoading(true);
    setMessage('');
    setDebugInfo('Starting auction creation...');

    try {
      // Test API connection first
      const connectionOk = await testConnection();
      if (!connectionOk) {
        setMessage('Cannot connect to server. Please check if the server is running.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      // Get and validate token
      console.log('Getting access token...');
      setDebugInfo(prev => prev + '\nGetting access token...');
      
      const token = await getAccessToken();
      console.log('Token received:', token ? 'Yes (length: ' + token.length + ')' : 'No');
      setDebugInfo(prev => prev + '\nToken: ' + (token ? '✅ Received' : '❌ Missing'));
      
      if (!token) {
        setMessage('Authentication required. Please log in again.');
        setMessageType('error');
        setLoading(false);
        setTimeout(() => setMessage(''), 5000);
        return;
      }

      // Prepare submission data
      const submissionData = {
        ...formData,
        images: formData.image ? [formData.image] : [],
        startingPrice: parseFloat(formData.startingPrice),
        bidIncrement: parseFloat(formData.bidIncrement),
        duration: parseInt(formData.duration)
      };

      console.log('Submission data:', {
        ...submissionData,
        images: submissionData.images.map(img => ({ 
          name: img.name, 
          size: img.size, 
          dataLength: img.data?.length || 0 
        }))
      });
      
      setDebugInfo(prev => prev + '\nPrepared data: ' + JSON.stringify({
        itemName: submissionData.itemName,
        startingPrice: submissionData.startingPrice,
        bidIncrement: submissionData.bidIncrement,
        duration: submissionData.duration,
        imageCount: submissionData.images.length
      }));

      // Make the API call
      console.log('Making API call to:', `${API_BASE_URL}/api/auctions/create`);
      setDebugInfo(prev => prev + '\nMaking API call...');
      
      const response = await axios.post(
        `${API_BASE_URL}/api/auctions/create`,
        submissionData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      console.log('API Response:', response.data);
      setDebugInfo(prev => prev + '\n✅ Success: ' + JSON.stringify(response.data));

      if (response.data.success) {
        setMessage(`Auction created successfully! Your auction ID is: ${response.data.auction.id}`);
        setMessageType('success');
        setFormData({
          itemName: '',
          description: '',
          startingPrice: '',
          bidIncrement: '',
          duration: '',
          image: null
        });
        const fileInput = document.getElementById('imageUpload');
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      console.error('Detailed error:', error);
      
      let errorMessage = 'Failed to create auction. ';
      let debugMessage = '❌ Error: ';
      
      if (error.code === 'ECONNREFUSED') {
        errorMessage += 'Server is not running or unreachable.';
        debugMessage += 'Connection refused - server may be down';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage += 'Cannot find server.';
        debugMessage += 'Server not found - check URL';
      } else if (error.response) {
        // Server responded with error
        const status = error.response.status;
        const responseData = error.response.data;
        
        debugMessage += `HTTP ${status}: ${JSON.stringify(responseData)}`;
        
        if (status === 401 || status === 403) {
          errorMessage += 'Authentication expired. Please log in again.';
        } else if (status === 400) {
          errorMessage += 'Invalid data sent to server.';
          if (responseData?.error) {
            errorMessage += ` Details: ${responseData.error}`;
          }
        } else if (status === 500) {
          errorMessage += 'Server error occurred.';
          if (responseData?.error) {
            errorMessage += ` Details: ${responseData.error}`;
          }
        } else {
          errorMessage += `Server error (${status}).`;
        }
      } else if (error.request) {
        errorMessage += 'No response from server.';
        debugMessage += 'Request made but no response received';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
        debugMessage += error.message;
      }
      
      setDebugInfo(prev => prev + '\n' + debugMessage);
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 8000);
    }
  };

  const durationOptions = [
    { value: '5', label: '5 minutes (Quick Test)' },
    { value: '10', label: '10 minutes' },
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour (Recommended)' },
    { value: '120', label: '2 hours' },
    { value: '180', label: '3 hours' },
    { value: '360', label: '6 hours' },
    { value: '720', label: '12 hours' },
    { value: '1440', label: '24 hours (Maximum)' }
  ];

  return (
    <div className="form-container">
      <div className="form-header">
        <h1 className="form-title">Create Professional Auction</h1>
        <p className="form-subtitle">
          List your items on our global marketplace and connect with serious buyers worldwide
        </p>
        <div className="user-info">
          <span>Creating as: {user.user_metadata?.full_name || user.email}</span>
        </div>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          {/* Item Information Section */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">ITEM</div>
              <span>Item Information</span>
            </div>
            
            <div className="form-group">
              <label className="form-label">Item Name *</label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter a clear, descriptive title for your item"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Provide comprehensive details about your item's condition, history, specifications, and any relevant information that would help potential buyers make informed decisions..."
                rows="5"
              />
            </div>

            {/* Single Image Upload Section */}
            <div className="form-group">
              <label className="form-label">Item Image (Optional)</label>
              <div className="image-upload-container">
                {!formData.image ? (
                  <>
                    <input
                      type="file"
                      id="imageUpload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="image-upload-input"
                      disabled={uploadingImage}
                    />
                    <label htmlFor="imageUpload" className="image-upload-button">
                      {uploadingImage ? (
                        <>
                          <div className="loading-spinner" style={{ width: '20px', height: '20px', marginRight: '8px' }}></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          Upload Image
                        </>
                      )}
                    </label>
                    <div className="upload-info">
                      Max 5MB. Supported formats: JPG, PNG, GIF, WebP
                    </div>
                  </>
                ) : (
                  <div className="single-image-preview">
                    <div className="image-preview-container">
                      <img src={formData.image.data} alt={formData.image.name} className="preview-image-single" />
                      <div className="image-overlay">
                        <button
                          type="button"
                          className="remove-image-btn"
                          onClick={removeImage}
                          title="Remove image"
                        >
                          ×
                        </button>
                        <button
                          type="button"
                          className="change-image-btn"
                          onClick={() => document.getElementById('imageUpload').click()}
                          title="Change image"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                    <div className="image-details">
                      <div className="image-name">{formData.image.name}</div>
                      <div className="image-size">{(formData.image.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    <input
                      type="file"
                      id="imageUpload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="image-upload-input"
                      disabled={uploadingImage}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Configuration Section */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">$</div>
              <span>Pricing Configuration</span>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Starting Price (USD) *</label>
                <div className="currency-input">
                  <input
                    type="number"
                    name="startingPrice"
                    value={formData.startingPrice}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    required
                  />
                  <span className="currency-symbol">$</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Minimum Bid Increment (USD) *</label>
                <div className="currency-input">
                  <input
                    type="number"
                    name="bidIncrement"
                    value={formData.bidIncrement}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    required
                  />
                  <span className="currency-symbol">$</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Auction Duration *</label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Select auction duration</option>
                {durationOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`message message-${messageType}`}>
              {message}
            </div>
          )}

          {/* Debug Information */}
          {debugInfo && (
            <div className="debug-info" style={{
              background: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              padding: '1rem',
              marginTop: '1rem',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              whiteSpace: 'pre-wrap',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              <strong>Debug Information:</strong>
              <br />
              {debugInfo}
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || uploadingImage}
            >
              {loading ? (
                <>
                  <div className="loading-spinner" style={{ 
                    width: '16px', 
                    height: '16px', 
                    marginRight: '8px',
                    marginBottom: '0'
                  }}></div>
                  Creating Auction...
                </>
              ) : (
                'Create Auction'
              )}
            </button>
            
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onBack}
              disabled={loading || uploadingImage}
            >
              Cancel
            </button>
          </div>

          {/* Professional Tips */}
          <div className="info-box">
            <div className="info-box-title">
              Professional Auction Tips
            </div>
            <div className="info-box-content">
              <ul>
                <li>Use specific, searchable keywords in your item title</li>
                <li>Include detailed condition reports and specifications</li>
                <li>Upload a high-quality image showing the item clearly</li>
                <li>Set competitive starting prices to encourage initial bidding</li>
                <li>Choose appropriate durations - longer auctions reach more bidders</li>
              </ul>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAuction;