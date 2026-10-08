import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setError(err.response.data?.detail || 'Invalid email or password.');
        } else if (err.response.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError('Authentication failed. Please verify credentials and try again.');
        }
      } else {
        setError('Cannot connect to server. Please verify backend is running on port 8000.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (userEmail, userPass) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError('');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        {/* Brand Header */}
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="auth-brand-title">Shield</h1>
            <span className="auth-brand-tag">Access Management</span>
          </div>
        </div>

        {/* Card */}
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Sign In</h2>
            <p className="auth-subtitle">
              Enter your organization email and password to access the system.
            </p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <button
              type="submit"
              id="login-button"
              className="btn btn-primary btn-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="btn-spinner"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Development Quick-Fill Credentials Helper */}
          <div className="auth-quick-accounts">
            <span className="quick-accounts-label">Sample Development Accounts:</span>
            <div className="quick-account-buttons">
              <button
                type="button"
                className="btn-quick-fill"
                onClick={() => handleQuickFill('user2@example.com', 'TestUser2@123')}
                title="User 2 has all 6 permissions assigned"
              >
                <span className="quick-fill-tier badge-success">Admin</span>
                <span className="quick-fill-email">user2@example.com</span>
              </button>

              <button
                type="button"
                className="btn-quick-fill"
                onClick={() => handleQuickFill('user1@example.com', 'TestUser1@123')}
                title="User 1 has VIEW_EMPLOYEE and VIEW_SELF"
              >
                <span className="quick-fill-tier badge-info">Member</span>
                <span className="quick-fill-email">user1@example.com</span>
              </button>

              <button
                type="button"
                className="btn-quick-fill"
                onClick={() => handleQuickFill('user3@example.com', 'TestUser3@123')}
                title="User 3 has zero permissions assigned"
              >
                <span className="quick-fill-tier badge-neutral">Limited</span>
                <span className="quick-fill-email">user3@example.com</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="auth-footer">
          <span>Fine-Grained Capability Authorization · Built with Django & React</span>
        </div>
      </div>
    </div>
  );
}
