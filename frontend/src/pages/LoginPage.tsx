import React from 'react';
import LoginForm from '../components/auth/LoginForm';

const LoginPage: React.FC = () => {
  const handleLoginSuccess = () => {
    console.log('User logged in successfully');
  };

  return (
    <div className="flex items-center justify-center h-screen bg-bg-primary">
      <LoginForm onLoginSuccess={handleLoginSuccess} />
    </div>
  );
};

export default LoginPage;
