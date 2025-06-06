// frontend/src/components/auth/LoginForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../assets/css/styles.css';
import config from '../../config';

interface LoginFormProps {
  onLoginSuccess: () => void; // This prop might become less critical if AppContent handles state
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // const [showPassword, setShowPassword] = useState(false); // Not used in current UI
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const response = await fetch(config.api.endpoints.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ username, password }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Login failed. Server error.' }));
        setError(errorData.detail || 'Login failed');
        setLoading(false);
        return;
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      
      // Dispatch a custom event to notify AppContent
      window.dispatchEvent(new CustomEvent('loginSuccess'));
      
      onLoginSuccess(); // Call original prop if still needed for other purposes
      navigate('/graph', { replace: true }); // Use replace to avoid login page in history

    } catch (err) {
      console.error('Login fetch error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      // setLoading(false); // setLoading will be handled by navigation and re-render
      // No, keep setLoading(false) in case of error before navigation
      if (!localStorage.getItem('access_token')) { // Only set loading false if not navigated
          setLoading(false);
      }
    }
  };

  return (
    <div className="login">
      <form className="login__form" onSubmit={handleSubmit}>
        <h1 className="login__title">Login</h1>
        {error && (
          <p className="text-sm text-red-500 mb-4 text-center bg-red-900 bg-opacity-50 p-2 rounded">
            {error}
          </p>
        )}
        <div className="login__content">
          <div className="login__box">
            <div className="login__box-input">
              <input
                type="text"
                className="login__input"
                placeholder=" "
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                id="login-username"
                required
                autoComplete="username"
              />
              <label htmlFor="login-username" className="login__label">Username</label>
            </div>
          </div>
          <div className="login__box">
            <div className="login__box-input">
              <input
                type="password" // Was: type={showPassword ? "text" : "password"}
                className="login__input"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                id="login-password"
                required
                autoComplete="current-password"
              />
              <label htmlFor="login-password" className="login__label">Password</label>
            </div>
          </div>
        </div>
        <button type="submit" className="login__button" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;