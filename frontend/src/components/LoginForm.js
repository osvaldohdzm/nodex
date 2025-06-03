import React, { useState } from 'react';
import "../assets/css/styles.css";

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log({ username, password });
  };

  return (
    <div className="login">
      <form className="login__form" onSubmit={handleSubmit}>
        <h1 className="login__title">Login</h1>
        <div className="login__content">
          <div className="login__box">
            <i className="login__icon ri-user-line"></i>
            <input
              type="text"
              className="login__input"
              placeholder=" "
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <label className="login__label">Username</label>
          </div>
          <div className="login__box">
            <i className="login__icon ri-lock-line"></i>
            <input
              type="password"
              className="login__input"
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label className="login__label">Password</label>
          </div>
        </div>
        <button type="submit" className="login__button">Login</button>
        <p className="login__register">
          Don't have an account? <a href="#">Register</a>
        </p>
      </form>
    </div>
  );
}

export default LoginForm;
