import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';

const AuthWrapper = ({ onBack }) => {
  const [currentView, setCurrentView] = useState('login'); // 'login' or 'register'

  const switchToRegister = () => setCurrentView('register');
  const switchToLogin = () => setCurrentView('login');

  return (
    <>
      {currentView === 'login' ? (
        <Login 
          onSwitchToRegister={switchToRegister}
          onBack={onBack}
        />
      ) : (
        <Register 
          onSwitchToLogin={switchToLogin}
          onBack={onBack}
        />
      )}
    </>
  );
};

export default AuthWrapper;