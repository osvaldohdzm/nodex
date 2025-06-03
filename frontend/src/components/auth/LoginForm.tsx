import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Simulated login logic
    if (email === 'test@example.com' && password === 'password') {
      console.log('Login successful (simulated)');
      localStorage.setItem('token', 'fake-jwt-token');
      onLoginSuccess();
      navigate('/graph');
    } else {
      setError('Invalid email or password. (Use test@example.com and password)');
    }
  };

  return (
    <div className="w-full max-w-sm p-8 space-y-6 bg-bg-glass backdrop-blur-md rounded-xl shadow-2xl border border-border-glass">
      <h1 className="text-3xl font-bold text-center text-accent-cyan">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-3 rounded-md bg-input-bg border border-input-border text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-colors"
          />
        </div>
        <div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-md bg-input-bg border border-input-border text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-colors"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          className="w-full py-3 rounded-md bg-accent-cyan text-bg-primary font-bold hover:bg-accent-cyan-darker transition-colors"
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
