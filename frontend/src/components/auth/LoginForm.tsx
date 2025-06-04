import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../assets/css/styles.css';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Loading state
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent multiple submissions

    setError('');
    setLoading(true); // Set loading state

    try {
      console.log('Attempting fetch to http://192.168.0.4:8000/token');

      const response = await fetch('http://192.168.0.4:8000/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ username, password }).toString(),
      });

      console.log('Fetch response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Login failed:', errorData);
        setError(errorData.detail || 'Login failed');
        return;
      }

      const data = await response.json();
      console.log('Token from backend:', data.access_token);
      localStorage.setItem('access_token', data.access_token);
      onLoginSuccess();
      navigate('/graph');
    } catch (err) {
      console.error('Login fetch CATCH block error:', err);
      setError('An error occurred during login. Check console for details.');
    } finally {
      setLoading(false); // Reset loading state
      console.log('handleSubmit finally block, loading set to false');
    }
  };

  return (
    <div className="login"> {/* This class ensures proper styling for the login form */}
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
              />
              <label htmlFor="login-username" className="login__label">Username</label>
            </div>
          </div>

          <div className="login__box">
            <div className="login__box-input">
              <input
                type={showPassword ? "text" : "password"}
                className="login__input"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                id="login-password"
                required
              />
              <label htmlFor="login-password" className="login__label">Password</label>
            </div>
          </div>
        </div>

        <button type="submit" className="login__button" disabled={loading}> {/* Disable button when loading */}
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
