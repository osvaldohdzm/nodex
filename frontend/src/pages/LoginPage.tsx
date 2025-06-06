import React from 'react';
import LoginForm from '../components/auth/LoginForm';
import AnimatedBackground from '../components/AnimatedBackground.js'; // Now available
import '../assets/css/styles.css';

const LoginPage: React.FC = () => {
  const handleLoginSuccess = () => {
    // This function is called on successful login from LoginForm
    // It can be used to update global state if needed, e.g., force App re-render
    // For now, navigation is handled within LoginForm.
    console.log('Login success callback triggered in LoginPage.');
  };

  return (
    <div className="login-page-container">
      <AnimatedBackground /> {/* Now uncommented */}
      <div className="login"> {/* Esta clase de styles.css centra el formulario */}
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
};

export default LoginPage;