import React from 'react';
import LoginForm from '../components/auth/LoginForm';
import AnimatedBackground from '../components/AnimatedBackground.js';
import '../assets/css/styles.css';

const LoginPage: React.FC = () => {
  const handleLoginSuccess = () => {
    console.log('Login success callback triggered in LoginPage.');
  };

  return (
    <div className="login-page-container">
      <AnimatedBackground />
      <div className="flex items-center justify-center h-screen">
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
};

export default LoginPage;
