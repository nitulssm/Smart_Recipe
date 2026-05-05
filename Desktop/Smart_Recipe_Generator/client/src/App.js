import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

/* ── Auth page ───────────────────────────────── */
function AuthPage({ onAuth }) {
  const [mode, setMode]           = useState('login'); // 'login' | 'register' | 'forgot' | 'verify'
  const [form, setForm]           = useState({ name: '', email: '', password: '' });
  const [verifyEmail, setVerifyEmail]       = useState('');
  const [verifyCode, setVerifyCode]         = useState('');
  const [verifyDevCode, setVerifyDevCode]   = useState('');
  const [verifyEmailSent, setVerifyEmailSent] = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  // Forgot-password flow state
  const [forgotStep, setForgotStep]       = useState(1); // 1 = enter email, 2 = enter code + new pass
  const [forgotEmail, setForgotEmail]     = useState('');
  const [forgotCode, setForgotCode]       = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [showNewPass, setShowNewPass]     = useState(false);
  const [devCode, setDevCode]             = useState('');
  const [forgotEmailSent, setForgotEmailSent] = useState(false);

  const switchMode = (m) => {
    setMode(m); setError(''); setSuccess('');
    setForm({ name: '', email: '', password: '' });
    setForgotStep(1); setForgotEmail(''); setForgotCode('');
    setForgotNewPass(''); setDevCode(''); setForgotEmailSent(false); setShowPass(false);
    setVerifyCode(''); setVerifyDevCode('');
  };

  /* ── Login / Register submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const url  = `http://localhost:5000/api/auth/${mode === 'login' ? 'login' : 'register'}`;
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };
      const res = await axios.post(url, body);
      if (res.data.requiresVerification) {
        setVerifyEmail(res.data.email);
        setVerifyDevCode(res.data.code || '');
        setVerifyEmailSent(res.data.emailSent || false);
        setMode('verify');
      } else {
        localStorage.setItem('authToken', res.data.token);
        localStorage.setItem('authUser', JSON.stringify(res.data.user));
        onAuth(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  /* ── Verify email submit ── */
  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/verify-email', {
        email: verifyEmail, code: verifyCode,
      });
      localStorage.setItem('authToken', res.data.token);
      localStorage.setItem('authUser', JSON.stringify(res.data.user));
      onAuth(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  /* ── Forgot step 1 — request reset code ── */
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/forgot-password', { email: forgotEmail });
      setDevCode(res.data.code || '');
      setForgotEmailSent(res.data.emailSent || false);
      setForgotStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  /* ── Forgot step 2 — submit new password ── */
  const handleForgotReset = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await axios.post('http://localhost:5000/api/auth/reset-password', {
        email: forgotEmail, code: forgotCode, newPassword: forgotNewPass,
      });
      setSuccess('Password reset successfully! Redirecting to login…');
      setTimeout(() => switchMode('login'), 2200);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  /* shared sub-components */
  const EyeIcon   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
  const EyeOffIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

  const ErrorBox = ({ msg }) => (
    <div className="auth-error-box">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {msg}
    </div>
  );

  const SuccessBox = ({ msg }) => (
    <div className="auth-success-box">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
      </svg>
      {msg}
    </div>
  );

  /* ════════════════════════════════════════════ */
  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo-row">
          <svg viewBox="0 0 32 32" width="38" height="38" fill="none">
            <rect width="32" height="32" rx="8" fill="#16a34a"/>
            <path d="M10 22 Q16 8 22 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <circle cx="16" cy="13" r="2.5" fill="white"/>
          </svg>
          <span className="auth-brand-name">Smart <span style={{ color: '#16a34a' }}>Recipe AI</span></span>
        </div>

        {/* ── EMAIL VERIFICATION FLOW ── */}
        {mode === 'verify' && (
          <>
            <div className="auth-greeting">
              <div className="forgot-icon-wrap">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h2 className="auth-title">Verify your email</h2>
              <p className="auth-subtitle">Enter the 6-digit code for <strong>{verifyEmail}</strong></p>
            </div>

            {verifyEmailSent && (
              <div className="forgot-email-sent-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                Verification email sent! Check your inbox and spam folder.
              </div>
            )}

            {verifyDevCode && !verifyEmailSent && (
              <div className="forgot-dev-code-box">
                <div className="forgot-dev-code-header">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  Your Verification Code
                </div>
                <div className="forgot-dev-code-value">{verifyDevCode.split('').join(' ')}</div>
                <p className="forgot-dev-code-note">Email not configured — use this code.</p>
              </div>
            )}

            <form onSubmit={handleVerify} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">6-Digit Verification Code</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input className="auth-input forgot-code-input" type="text" placeholder="_ _ _ _ _ _"
                    maxLength={6} value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    required autoFocus/>
                </div>
              </div>

              {error && <ErrorBox msg={error}/>}

              <button type="submit" disabled={loading || verifyCode.length < 6} className="auth-submit-btn">
                {loading ? <><span className="spinner"/>Verifying…</> : 'Verify & Create Account'}
              </button>
            </form>

            <p className="auth-switch-text">
              Wrong email?{' '}
              <button className="auth-switch-link" onClick={() => switchMode('register')}>
                Go back
              </button>
            </p>
          </>
        )}

        {/* ── FORGOT PASSWORD FLOW ── */}
        {mode === 'forgot' && (
          <>
            <button className="auth-back-btn" onClick={() => switchMode('login')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back to Login
            </button>

            {/* Step 1 — Enter email */}
            {forgotStep === 1 && (
              <>
                <div className="auth-greeting">
                  <div className="forgot-icon-wrap">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <h2 className="auth-title">Forgot Password?</h2>
                  <p className="auth-subtitle">Enter your registered email and we'll send you a reset code.</p>
                </div>

                <form onSubmit={handleForgotRequest} className="auth-form">
                  <div className="auth-field">
                    <label className="auth-label">Email Address</label>
                    <div className="auth-input-wrap">
                      <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                      </svg>
                      <input className="auth-input" type="email" placeholder="you@example.com"
                        value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required autoFocus/>
                    </div>
                  </div>
                  {error && <ErrorBox msg={error}/>}
                  <button type="submit" disabled={loading} className="auth-submit-btn">
                    {loading ? <><span className="spinner"/>Sending…</> : 'Send Reset Code'}
                  </button>
                </form>
              </>
            )}

            {/* Step 2 — Enter code + new password */}
            {forgotStep === 2 && (
              <>
                <div className="auth-greeting">
                  <div className="forgot-icon-wrap forgot-icon-sent">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <h2 className="auth-title">Enter Reset Code</h2>
                  <p className="auth-subtitle">Enter the reset code for <strong>{forgotEmail}</strong></p>
                </div>

                {forgotEmailSent && (
                  <div className="forgot-email-sent-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Reset code sent! Check your inbox and spam folder.
                  </div>
                )}
                {devCode && !forgotEmailSent && (
                  <div className="forgot-dev-code-box">
                    <div className="forgot-dev-code-header">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                      Your Reset Code
                    </div>
                    <div className="forgot-dev-code-value">{devCode.split('').join(' ')}</div>
                    <p className="forgot-dev-code-note">Email not configured — use this code.</p>
                  </div>
                )}

                <form onSubmit={handleForgotReset} className="auth-form">
                  <div className="auth-field">
                    <label className="auth-label">6-Digit Reset Code</label>
                    <div className="auth-input-wrap">
                      <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <input className="auth-input forgot-code-input" type="text" placeholder="_ _ _ _ _ _"
                        maxLength={6} value={forgotCode}
                        onChange={e => setForgotCode(e.target.value.replace(/\D/g, ''))}
                        required autoFocus/>
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">New Password</label>
                    <div className="auth-input-wrap">
                      <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <input className="auth-input" type={showNewPass ? 'text' : 'password'}
                        placeholder="New password (min 6 chars)" value={forgotNewPass}
                        onChange={e => setForgotNewPass(e.target.value)} required minLength={6}
                        autoComplete="new-password"/>
                      <button type="button" className="auth-pass-eye" onClick={() => setShowNewPass(s => !s)} tabIndex={-1}>
                        {showNewPass ? <EyeOffIcon/> : <EyeIcon/>}
                      </button>
                    </div>
                    <p className="auth-hint">Minimum 6 characters</p>
                  </div>

                  {error   && <ErrorBox msg={error}/>}
                  {success && <SuccessBox msg={success}/>}

                  <button type="submit" disabled={loading || !!success} className="auth-submit-btn">
                    {loading ? <><span className="spinner"/>Resetting…</> : 'Reset Password'}
                  </button>
                </form>

                <p className="auth-switch-text">
                  Didn't get the code?{' '}
                  <button className="auth-switch-link" onClick={() => { setForgotStep(1); setError(''); setForgotCode(''); setDevCode(''); }}>
                    Try again
                  </button>
                </p>
              </>
            )}
          </>
        )}

        {/* ── LOGIN / REGISTER FLOW ── */}
        {mode !== 'forgot' && mode !== 'verify' && (
          <>
            <div className="auth-tabs">
              <button className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => switchMode('login')}>Log In</button>
              <button className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`} onClick={() => switchMode('register')}>Register</button>
            </div>

            <div className="auth-greeting">
              <h2 className="auth-title">{mode === 'login' ? 'Welcome back!' : 'Create your account'}</h2>
              <p className="auth-subtitle">{mode === 'login' ? 'Sign in to access your recipes' : 'Start generating smart recipes today'}</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {mode === 'register' && (
                <div className="auth-field">
                  <label className="auth-label">Full Name</label>
                  <div className="auth-input-wrap">
                    <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input className="auth-input" type="text" placeholder="John Doe" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoComplete="name"/>
                  </div>
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label">Email Address</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input className="auth-input" type="email" placeholder="you@example.com" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required autoComplete="email"/>
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label className="auth-label">Password</label>
                  {mode === 'login' && (
                    <button type="button" className="auth-forgot-link" onClick={() => switchMode('forgot')}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input className="auth-input" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/>
                  <button type="button" className="auth-pass-eye" onClick={() => setShowPass(s => !s)} tabIndex={-1}>
                    {showPass ? <EyeOffIcon/> : <EyeIcon/>}
                  </button>
                </div>
                {mode === 'register' && <p className="auth-hint">Minimum 6 characters</p>}
              </div>

              {error && <ErrorBox msg={error}/>}

              <button type="submit" disabled={loading} className="auth-submit-btn">
                {loading
                  ? <><span className="spinner"/>Processing…</>
                  : mode === 'login' ? 'Sign In' : 'Create Account'
                }
              </button>
            </form>

            <p className="auth-switch-text">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button className="auth-switch-link" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? 'Register free' : 'Log In'}
              </button>
            </p>
          </>
        )}

      </div>
    </div>
  );
}

/* ── Ingredient chip ─────────────────────────── */
function IngredientChip({ item, onRemove }) {
  const [imgError, setImgError] = useState(false);
  const normalized = item.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const imgUrl = `https://spoonacular.com/cdn/ingredients_100x100/${normalized}.jpg`;
  return (
    <div className="ingredient-chip-card">
      <button className="chip-remove-btn" onClick={() => onRemove(item.name)} title="Remove">✕</button>
      <div className="chip-img-wrap">
        {!imgError
          ? <img src={imgUrl} alt={item.name} className="chip-img" onError={() => setImgError(true)} />
          : <div className="chip-img-fallback">{item.name.charAt(0).toUpperCase()}</div>}
      </div>
      <div className="chip-info">
        <span className="chip-name">{item.name}</span>
        <span className="chip-confidence">{item.confidence}%</span>
      </div>
    </div>
  );
}

/* ── Recipe card ─────────────────────────────── */
function RecipeCard({ rec, index, onView, isSaved, onToggleSave }) {
  const [imgError, setImgError] = useState(false);
  const mealImg = (!imgError && rec.imageUrl) ? rec.imageUrl : null;

  return (
    <div className="recipe-grid-card">
      <div className="recipe-card-img-wrap">
        {mealImg
          ? <img src={mealImg} alt={rec.title} className="recipe-card-img" onError={() => setImgError(true)} />
          : <div className="recipe-card-img-placeholder">🍽️</div>}
        {index === 0 && <span className="best-match-badge">Best Match</span>}
      </div>
      <div className="recipe-card-body">
        <h3 className="recipe-card-title">{rec.title}</h3>
        <div className="recipe-card-meta">
          <span className="recipe-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {rec.time || '20 mins'}
          </span>
          <span className="recipe-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            {rec.difficulty || 'Easy'}
          </span>
        </div>
        {rec.ingredients?.length > 0 && (
          <div className="recipe-card-tags">
            {rec.ingredients.slice(0, 3).map((ing, i) => <span key={i} className="recipe-tag">{typeof ing === 'object' ? (ing.name || '') : ing}</span>)}
          </div>
        )}
        <div className="recipe-card-footer">
          <button className="btn-view-recipe" onClick={() => onView(rec)}>View Recipe</button>
          <button
            className={`btn-heart ${isSaved ? 'saved' : ''}`}
            onClick={() => onToggleSave(rec)}
            title={isSaved ? 'Remove from saved' : 'Save recipe'}
          >
            {isSaved ? '♥' : '♡'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Shared view-toggle icons ────────────────── */
const GridIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
const ListIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const TableIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>;

function ViewToggle({ mode, onChange }) {
  return (
    <div className="view-toggle-group">
      {[['grid', <GridIcon/>], ['list', <ListIcon/>], ['table', <TableIcon/>]].map(([m, icon]) => (
        <button key={m} className={`view-toggle-btn ${mode === m ? 'active' : ''}`} onClick={() => onChange(m)} title={`${m} view`}>
          {icon}
        </button>
      ))}
    </div>
  );
}

/* ── Recipe table rows (shared) ──────────────── */
function RecipeTableRows({ recipes, onView, onClose, actionLabel, onAction, actionIcon }) {
  return (
    <div className="table-wrap">
      <table className="recipe-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Recipe</th>
            <th>Time</th>
            <th>Difficulty</th>
            <th>Ingredients</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {recipes.map((rec, i) => (
            <tr key={i}>
              <td className="table-num">{i + 1}</td>
              <td>
                <div className="table-recipe-cell">
                  <div className="table-img-wrap">
                    {rec.imageUrl
                      ? <img src={rec.imageUrl} alt={rec.title} className="table-recipe-img" />
                      : <div className="table-recipe-placeholder">🍽️</div>}
                  </div>
                  <div className="table-recipe-info">
                    <span className="table-recipe-name">{rec.title}</span>
                    {i === 0 && <span className="table-best-match-badge">Best Match</span>}
                  </div>
                </div>
              </td>
              <td className="table-meta">{rec.time || '20 mins'}</td>
              <td>
                <span className={`table-difficulty diff-${(rec.difficulty || 'Easy').toLowerCase()}`}>
                  {rec.difficulty || 'Easy'}
                </span>
              </td>
              <td>
                <div className="recipe-card-tags">
                  {(rec.ingredients || []).slice(0, 3).map((ing, j) => (
                    <span key={j} className="recipe-tag">{typeof ing === 'object' ? (ing.name || '') : ing}</span>
                  ))}
                </div>
              </td>
              <td>
                <div className="table-actions">
                  <button className="btn-view-recipe" onClick={() => { onView(rec); if (onClose) onClose(); }}>
                    View
                  </button>
                  <button className="table-action-btn" onClick={() => onAction(rec)} title={actionLabel}>
                    {actionIcon(rec)}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Saved recipes modal ─────────────────────── */
function SavedModal({ recipes, onClose, onRemove, onView }) {
  const [viewMode, setViewMode] = useState('list');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="saved-modal-content" onClick={e => e.stopPropagation()}>
        <div className="saved-modal-header">
          <h2 className="saved-modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Saved Recipes
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {recipes.length > 0 && <ViewToggle mode={viewMode} onChange={setViewMode} />}
            <button className="modal-close-btn" style={{ position: 'static', background: '#f1f5f9', color: '#374151' }} onClick={onClose}>✕</button>
          </div>
        </div>

        {recipes.length === 0 ? (
          <div className="saved-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <p className="saved-empty-title">No saved recipes yet</p>
            <p className="saved-empty-sub">Click the ♡ on any recipe card to save it here</p>
          </div>
        ) : (
          <>
            {/* Grid view */}
            {viewMode === 'grid' && (
              <div className="all-recipes-grid" style={{ padding: '1.2rem 1.4rem' }}>
                {recipes.map((rec, i) => (
                  <div key={i} className="recipe-grid-card">
                    <div className="recipe-card-img-wrap">
                      {rec.imageUrl
                        ? <img src={rec.imageUrl} alt={rec.title} className="recipe-card-img" />
                        : <div className="recipe-card-img-placeholder">🍽️</div>}
                    </div>
                    <div className="recipe-card-body">
                      <h3 className="recipe-card-title">{rec.title}</h3>
                      <div className="recipe-card-meta">
                        <span className="recipe-meta-item">{rec.time || '20 mins'}</span>
                        <span className="recipe-meta-item">{rec.difficulty || 'Easy'}</span>
                      </div>
                      <div className="recipe-card-tags">
                        {(rec.ingredients || []).slice(0, 3).map((ing, j) => <span key={j} className="recipe-tag">{typeof ing === 'object' ? (ing.name || '') : ing}</span>)}
                      </div>
                      <div className="recipe-card-footer">
                        <button className="btn-view-recipe" onClick={() => { onView(rec); onClose(); }}>View</button>
                        <button className="saved-remove-btn" onClick={() => onRemove(rec)} title="Remove"><TrashIcon /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* List view */}
            {viewMode === 'list' && (
              <div className="saved-list">
                {recipes.map((rec, i) => (
                  <div key={i} className="saved-item">
                    <div className="saved-item-img-wrap">
                      {rec.imageUrl
                        ? <img src={rec.imageUrl} alt={rec.title} className="saved-item-img" />
                        : <div className="saved-item-img-placeholder">🍽️</div>}
                    </div>
                    <div className="saved-item-info">
                      <h4 className="saved-item-title">{rec.title}</h4>
                      <p className="saved-item-meta">{rec.time || '20 mins'} · {rec.difficulty || 'Easy'}</p>
                      <div className="saved-item-tags">
                        {(rec.ingredients || []).slice(0, 3).map((ing, j) => <span key={j} className="recipe-tag">{typeof ing === 'object' ? (ing.name || '') : ing}</span>)}
                      </div>
                    </div>
                    <div className="saved-item-actions">
                      <button className="btn-view-recipe" onClick={() => { onView(rec); onClose(); }}>View</button>
                      <button className="saved-remove-btn" onClick={() => onRemove(rec)} title="Remove"><TrashIcon /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Table view */}
            {viewMode === 'table' && (
              <RecipeTableRows
                recipes={recipes}
                onView={onView}
                onClose={onClose}
                actionLabel="Remove"
                onAction={onRemove}
                actionIcon={() => <TrashIcon />}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Recipe modal ────────────────────────────── */
function RecipeModal({ rec, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        {rec.imageUrl && <img src={rec.imageUrl} alt={rec.title} className="modal-img" />}
        <div className="modal-body">
          <h2 className="modal-title">{rec.title}</h2>
          <div className="modal-meta">
            <span className="modal-meta-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {rec.time || '20 mins'}
            </span>
            <span className="modal-meta-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              {rec.difficulty || 'Easy'}
            </span>
          </div>
          {rec.ingredients?.length > 0 && (
            <div className="modal-section">
              <h4 className="modal-section-title">Ingredients</h4>
              <div className="modal-tags">
                {rec.ingredients.map((ing, i) => <span key={i} className="recipe-tag">{typeof ing === 'object' ? (ing.name || '') : ing}</span>)}
              </div>
            </div>
          )}
          <div className="modal-section">
            <h4 className="modal-section-title">Instructions</h4>
            <ol className="modal-steps">
              {rec.steps.map((step, i) => <li key={i} className="modal-step">{step}</li>)}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Recipe list card (horizontal) ──────────── */
function RecipeListCard({ rec, index, onView, isSaved, onToggleSave }) {
  const [imgError, setImgError] = useState(false);
  const mealImg = (!imgError && rec.imageUrl) ? rec.imageUrl : null;
  return (
    <div className="recipe-list-card">
      <div className="recipe-list-img-wrap">
        {mealImg
          ? <img src={mealImg} alt={rec.title} className="recipe-list-img" onError={() => setImgError(true)} />
          : <div className="recipe-card-img-placeholder" style={{ fontSize: '2rem' }}>🍽️</div>}
        {index === 0 && <span className="best-match-badge">Best Match</span>}
      </div>
      <div className="recipe-list-body">
        <h3 className="recipe-card-title">{rec.title}</h3>
        <div className="recipe-card-meta">
          <span className="recipe-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {rec.time || '20 mins'}
          </span>
          <span className="recipe-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            {rec.difficulty || 'Easy'}
          </span>
        </div>
        {rec.ingredients?.length > 0 && (
          <div className="recipe-card-tags">
            {rec.ingredients.slice(0, 4).map((ing, i) => <span key={i} className="recipe-tag">{typeof ing === 'object' ? (ing.name || '') : ing}</span>)}
          </div>
        )}
      </div>
      <div className="recipe-list-actions">
        <button className="btn-view-recipe" onClick={() => onView(rec)}>View Recipe</button>
        <button className={`btn-heart ${isSaved ? 'saved' : ''}`} onClick={() => onToggleSave(rec)}>
          {isSaved ? '♥' : '♡'}
        </button>
      </div>
    </div>
  );
}

/* ── All Recipes modal ───────────────────────── */
function AllRecipesModal({ recipes, onClose, onView, isSaved, onToggleSave }) {
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="all-recipes-modal" onClick={e => e.stopPropagation()}>
        <div className="saved-modal-header">
          <h2 className="saved-modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2h18M3 8h18M3 14h18M3 20h18"/>
            </svg>
            All Suggested Recipes
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ViewToggle mode={viewMode} onChange={setViewMode} />
            <button className="modal-close-btn" style={{ position: 'static', background: '#f1f5f9', color: '#374151' }} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Grid view */}
        {viewMode === 'grid' && (
          <div className="all-recipes-grid">
            {recipes.map((rec, i) => (
              <div key={i} className="recipe-grid-card">
                <div className="recipe-card-img-wrap">
                  {rec.imageUrl
                    ? <img src={rec.imageUrl} alt={rec.title} className="recipe-card-img" />
                    : <div className="recipe-card-img-placeholder">🍽️</div>}
                  {i === 0 && <span className="best-match-badge">Best Match</span>}
                </div>
                <div className="recipe-card-body">
                  <h3 className="recipe-card-title">{rec.title}</h3>
                  <div className="recipe-card-meta">
                    <span className="recipe-meta-item">{rec.time || '20 mins'}</span>
                    <span className="recipe-meta-item">{rec.difficulty || 'Easy'}</span>
                  </div>
                  <div className="recipe-card-tags">
                    {(rec.ingredients || []).slice(0, 3).map((ing, j) => <span key={j} className="recipe-tag">{typeof ing === 'object' ? (ing.name || '') : ing}</span>)}
                  </div>
                  <div className="recipe-card-footer">
                    <button className="btn-view-recipe" onClick={() => { onView(rec); onClose(); }}>View Recipe</button>
                    <button className={`btn-heart ${isSaved(rec) ? 'saved' : ''}`} onClick={() => onToggleSave(rec)}>
                      {isSaved(rec) ? '♥' : '♡'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List view */}
        {viewMode === 'list' && (
          <div className="saved-list">
            {recipes.map((rec, i) => (
              <div key={i} className="saved-item">
                <div className="saved-item-img-wrap">
                  {rec.imageUrl
                    ? <img src={rec.imageUrl} alt={rec.title} className="saved-item-img" />
                    : <div className="saved-item-img-placeholder">🍽️</div>}
                </div>
                <div className="saved-item-info">
                  <h4 className="saved-item-title">{rec.title}</h4>
                  <p className="saved-item-meta">{rec.time || '20 mins'} · {rec.difficulty || 'Easy'}</p>
                  <div className="saved-item-tags">
                    {(rec.ingredients || []).slice(0, 3).map((ing, j) => <span key={j} className="recipe-tag">{typeof ing === 'object' ? (ing.name || '') : ing}</span>)}
                  </div>
                </div>
                <div className="saved-item-actions">
                  <button className="btn-view-recipe" onClick={() => { onView(rec); onClose(); }}>View</button>
                  <button className={`btn-heart ${isSaved(rec) ? 'saved' : ''}`} onClick={() => onToggleSave(rec)}>
                    {isSaved(rec) ? '♥' : '♡'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table view */}
        {viewMode === 'table' && (
          <RecipeTableRows
            recipes={recipes}
            onView={onView}
            onClose={onClose}
            actionLabel="Save / Unsave"
            onAction={onToggleSave}
            actionIcon={(rec) => (
              <span style={{ color: isSaved(rec) ? '#ef4444' : '#d1d5db', fontSize: '1.1rem' }}>
                {isSaved(rec) ? '♥' : '♡'}
              </span>
            )}
          />
        )}
      </div>
    </div>
  );
}

/* ── My Recipes modal (Viewed + Saved tabs) ──── */
function MyRecipesModal({ viewedRecipes, savedRecipes, onClose, onView, isSaved, onToggleSave }) {
  const [activeTab, setActiveTab] = useState('viewed');
  const [viewMode, setViewMode]   = useState('grid');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const list = activeTab === 'viewed' ? viewedRecipes : savedRecipes;

  const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );

  const renderGrid = () => (
    <div className="all-recipes-grid">
      {list.map((rec, i) => (
        <div key={i} className="recipe-grid-card">
          <div className="recipe-card-img-wrap">
            {rec.imageUrl
              ? <img src={rec.imageUrl} alt={rec.title} className="recipe-card-img" />
              : <div className="recipe-card-img-placeholder">🍽️</div>}
            {i === 0 && <span className="best-match-badge">Best Match</span>}
          </div>
          <div className="recipe-card-body">
            <h3 className="recipe-card-title">{rec.title}</h3>
            <div className="recipe-card-meta">
              <span className="recipe-meta-item">{rec.time || '20 mins'}</span>
              <span className="recipe-meta-item">{rec.difficulty || 'Easy'}</span>
            </div>
            <div className="recipe-card-tags">
              {(rec.ingredients || []).slice(0, 3).map((ing, j) => <span key={j} className="recipe-tag">{typeof ing === 'object' ? (ing.name || '') : ing}</span>)}
            </div>
            <div className="recipe-card-footer">
              <button className="btn-view-recipe" onClick={() => { onView(rec); onClose(); }}>View Recipe</button>
              <button className={`btn-heart ${isSaved(rec) ? 'saved' : ''}`} onClick={() => onToggleSave(rec)}>
                {isSaved(rec) ? '♥' : '♡'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderList = () => (
    <div className="saved-list">
      {list.map((rec, i) => (
        <div key={i} className="saved-item">
          <div className="saved-item-img-wrap">
            {rec.imageUrl
              ? <img src={rec.imageUrl} alt={rec.title} className="saved-item-img" />
              : <div className="saved-item-img-placeholder">🍽️</div>}
          </div>
          <div className="saved-item-info">
            <h4 className="saved-item-title">{rec.title}</h4>
            <p className="saved-item-meta">{rec.time || '20 mins'} · {rec.difficulty || 'Easy'}</p>
            <div className="saved-item-tags">
              {(rec.ingredients || []).slice(0, 3).map((ing, j) => <span key={j} className="recipe-tag">{typeof ing === 'object' ? (ing.name || '') : ing}</span>)}
            </div>
          </div>
          <div className="saved-item-actions">
            <button className="btn-view-recipe" onClick={() => { onView(rec); onClose(); }}>View</button>
            <button className={`btn-heart ${isSaved(rec) ? 'saved' : ''}`} onClick={() => onToggleSave(rec)}>
              {isSaved(rec) ? '♥' : '♡'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTable = () => (
    <RecipeTableRows
      recipes={list}
      onView={onView}
      onClose={onClose}
      actionLabel="Save / Unsave"
      onAction={onToggleSave}
      actionIcon={(rec) => (
        <span style={{ color: isSaved(rec) ? '#ef4444' : '#d1d5db', fontSize: '1.1rem' }}>
          {isSaved(rec) ? '♥' : '♡'}
        </span>
      )}
    />
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="my-recipes-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="saved-modal-header">
          <h2 className="saved-modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            My Recipes
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {list.length > 0 && <ViewToggle mode={viewMode} onChange={setViewMode} />}
            <button className="modal-close-btn" style={{ position: 'static', background: '#f1f5f9', color: '#374151' }} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="my-recipes-tabs">
          <button className={`tab-btn ${activeTab === 'viewed' ? 'active' : ''}`} onClick={() => setActiveTab('viewed')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Viewed Recipes
            <span className="tab-count">{viewedRecipes.length}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => setActiveTab('saved')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={activeTab === 'saved' ? '#ef4444' : 'none'} stroke={activeTab === 'saved' ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Saved Recipes
            <span className="tab-count">{savedRecipes.length}</span>
          </button>
        </div>

        {/* Content */}
        {list.length === 0 ? (
          <div className="saved-empty">
            {activeTab === 'viewed'
              ? <><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <p className="saved-empty-title">No viewed recipes yet</p>
                  <p className="saved-empty-sub">Click "View Recipe" on any suggestion to see it here</p></>
              : <><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  <p className="saved-empty-title">No saved recipes yet</p>
                  <p className="saved-empty-sub">Click the ♡ on any recipe to save it here</p></>
            }
          </div>
        ) : (
          <>
            {viewMode === 'grid'  && renderGrid()}
            {viewMode === 'list'  && renderList()}
            {viewMode === 'table' && renderTable()}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Profile modal ───────────────────────────── */
/* ── Recipe Search (Home) ───────────────────── */
function RecipeSearch({ onGoToFridge, savedRecipes = [], onToggleSave, onRecipeViewed }) {
  const [query, setQuery]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [recipe, setRecipe]     = useState(null);

  const [fridgeIngredients, setFridgeIngredients] = useState(null);
  const [fridgeLoading, setFridgeLoading]         = useState(false);
  const [fridgeError, setFridgeError]             = useState('');
  const [showFridgeCamera, setShowFridgeCamera]   = useState(false);
  const fridgeFileRef = React.useRef(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(''); setRecipe(null); setFridgeIngredients(null);
    try {
      const res = await axios.post('http://localhost:5000/api/recipe-by-name', { recipeName: query });
      const raw = res.data.recipe;
      setRecipe(raw);
      // Normalize for saving — flatten object arrays to strings so existing card components work
      const forSave = {
        ...raw,
        ingredients: (raw.ingredients || []).map(ing =>
          typeof ing === 'object' ? `${ing.name}${ing.quantity ? ' – ' + ing.quantity : ''}` : ing
        ),
        steps: (raw.steps || []).map(step =>
          typeof step === 'object' ? `${step.title ? step.title + ': ' : ''}${step.instruction || ''}` : step
        ),
      };
      if (onRecipeViewed) onRecipeViewed(forSave);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch recipe. Please try again.');
    }
    setLoading(false);
  };

  const handleFridgeFile = async (file) => {
    if (!file) return;
    setFridgeLoading(true); setFridgeError(''); setFridgeIngredients(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await axios.post('http://localhost:5000/api/detect-only', fd);
      setFridgeIngredients(res.data.ingredients || []);
    } catch (err) {
      setFridgeError('Could not detect ingredients. Try a clearer photo.');
    }
    setFridgeLoading(false);
  };

  const getFridgeComparison = () => {
    if (!fridgeIngredients || !recipe?.ingredients) return { have: [], need: [] };
    const fridgeLower = fridgeIngredients.map(f =>
      f.toLowerCase().replace(/[^a-z\s]/g, '').trim()
    );
    const have = [], need = [];
    (recipe.ingredients || []).forEach(ing => {
      const rawName = typeof ing === 'object' ? ing.name : ing;
      const clean = rawName.replace(/\(.*?\)/g, '').toLowerCase().replace(/[^a-z\s]/g, '').trim();
      const words = clean.split(/\s+/).filter(w => w.length > 2);
      const matched = fridgeLower.some(f =>
        words.some(w => f.includes(w)) || f.split(/\s+/).some(fw => fw.length > 2 && clean.includes(fw))
      );
      if (matched) have.push(rawName);
      else need.push(rawName);
    });
    return { have, need };
  };

  const suggestions = ['Paneer Butter Masala', 'Veg Pulao', 'Chole Bhature', 'Masala Dosa', 'Chocolate Cake', 'Pasta Carbonara'];

  return (
    <div className="rs-root">
      {/* Fixed search panel */}
      <div className="rs-panel">
        <h2 className="rs-hero-title">Find Any Recipe</h2>
        <p className="rs-hero-sub">Search for any recipe and get ingredients &amp; step-by-step guide.</p>
        <form className="rs-search-form" onSubmit={handleSearch}>
          <div className="rs-search-wrap">
            <svg className="rs-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="rs-search-input"
              type="text"
              placeholder="Search any recipe…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {query && <button type="button" className="rs-clear-btn" onClick={() => { setQuery(''); setRecipe(null); setError(''); }}>✕</button>}
          </div>
          <button type="submit" className="rs-search-btn" disabled={loading || !query.trim()}>
            {loading ? <span className="spinner"/> : 'Search'}
          </button>
        </form>
        <div className="rs-suggestions">
          <span className="rs-suggestions-label">Popular Searches:</span>
          {suggestions.map(s => (
            <button key={s} className="rs-suggestion-chip" onClick={() => setQuery(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable results */}
      <div className="rs-results-area">

      {error && (
        <div className="rs-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {loading && (
        <div className="rs-loading">
          <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }}/>
          <p>Generating recipe for <strong>{query}</strong>…</p>
        </div>
      )}

      {recipe && (
        <div className="rs-result">
          {/* Horizontal summary card */}
          <div className="rs-result-card">
            {recipe.imageUrl
              ? <img className="rs-result-card-img" src={recipe.imageUrl} alt={recipe.title}
                  onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
              : null}
            <div className="rs-result-card-img rs-result-card-img-placeholder"
              style={{ display: recipe.imageUrl ? 'none' : 'flex' }}>🍽️</div>
            <div className="rs-result-card-info">
              <h2 className="rs-result-title">{recipe.title}</h2>
              <div className="rs-result-meta">
                <span className="rs-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {recipe.time}
                </span>
                <span className="rs-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
                  {recipe.difficulty}
                </span>
                {recipe.servings && <span className="rs-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Serves {recipe.servings}
                </span>}
              </div>
              {recipe.description && <p className="rs-result-desc">{recipe.description}</p>}
            </div>
            {(() => {
              const saved = savedRecipes.some(r => r.title?.toLowerCase() === recipe.title?.toLowerCase());
              return (
                <button
                  className={`rs-save-btn${saved ? ' rs-save-btn-saved' : ''}`}
                  onClick={() => {
                    if (!onToggleSave) return;
                    const forSave = {
                      ...recipe,
                      ingredients: (recipe.ingredients || []).map(ing =>
                        typeof ing === 'object' ? `${ing.name}${ing.quantity ? ' – ' + ing.quantity : ''}` : ing
                      ),
                      steps: (recipe.steps || []).map(step =>
                        typeof step === 'object' ? `${step.title ? step.title + ': ' : ''}${step.instruction || ''}` : step
                      ),
                    };
                    onToggleSave(forSave);
                  }}
                >
                  {saved ? '♥' : '♡'} {saved ? 'Saved' : 'Save Recipe'}
                </button>
              );
            })()}
          </div>

          {/* Two-column detail layout */}
          <div className="rs-detail-cols">

            {/* LEFT: Ingredients + Fridge check */}
            <div className="rs-col-left">
              <div className="rs-section">
                <h3 className="rs-section-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  Ingredients
                </h3>
                <table className="rs-ingr-table">
                  <tbody>
                    {(recipe.ingredients || []).map((ing, i) => {
                      const name = typeof ing === 'object' ? ing.name : ing;
                      const qty  = typeof ing === 'object' ? ing.quantity : '';
                      return (
                        <tr key={i} className="rs-ingr-row">
                          <td className="rs-ingr-name"><span className="rs-ingr-dot"/>  {name}</td>
                          <td className="rs-ingr-qty">{qty}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Fridge check */}
              <div className="rs-fridge-check">
                <h3 className="rs-fridge-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/>
                  </svg>
                  Check With My Fridge
                </h3>
                <p className="rs-fridge-sub">Compare with your available ingredients</p>

                {fridgeLoading && (
                  <div className="rs-fridge-detecting">
                    <span className="spinner" style={{width:20,height:20,borderWidth:2.5,borderColor:'rgba(22,163,74,0.2)',borderTopColor:'#16a34a'}}/>
                    <span>Detecting fridge ingredients…</span>
                  </div>
                )}

                {fridgeError && (
                  <div className="rs-fridge-error">{fridgeError}</div>
                )}

                {fridgeIngredients && !fridgeLoading && (() => {
                  const { have, need } = getFridgeComparison();
                  return (
                    <div className="rs-fridge-result">
                      <div className="rs-fridge-cols">
                        <div className="rs-fridge-have">
                          <div className="rs-fridge-col-title rs-fridge-have-title">You Have ({have.length})</div>
                          {have.map((item, i) => (
                            <div key={i} className="rs-fridge-item rs-fridge-item-have">
                              <span className="rs-fridge-bullet">•</span>{item}
                              <svg className="rs-fridge-check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                          ))}
                          {have.length === 0 && <div className="rs-fridge-empty">None found</div>}
                        </div>
                        <div className="rs-fridge-need">
                          <div className="rs-fridge-col-title rs-fridge-need-title">You Need ({need.length})</div>
                          {need.map((item, i) => (
                            <div key={i} className="rs-fridge-item rs-fridge-item-need">
                              <span className="rs-fridge-bullet">•</span>{item}
                            </div>
                          ))}
                          {need.length === 0 && <div className="rs-fridge-empty" style={{color:'#16a34a'}}>You have everything!</div>}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {!fridgeLoading && (
                  <div className="rs-fridge-upload-row">
                    <input type="file" accept="image/*" ref={fridgeFileRef} style={{display:'none'}}
                      onChange={e => { if(e.target.files[0]) handleFridgeFile(e.target.files[0]); e.target.value=''; }} />
                    <button className="rs-fridge-upload-btn" onClick={() => fridgeFileRef.current.click()}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                      {fridgeIngredients ? 'Re-upload Image' : 'Upload Fridge Image'}
                    </button>
                    <button className="rs-fridge-camera-btn" onClick={() => setShowFridgeCamera(true)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                      </svg>
                      Camera
                    </button>
                  </div>
                )}
              </div>

              {showFridgeCamera && (
                <CameraModal
                  onCapture={file => { setShowFridgeCamera(false); handleFridgeFile(file); }}
                  onClose={() => setShowFridgeCamera(false)}
                />
              )}
            </div>

            {/* RIGHT: Preparation guide */}
            <div className="rs-col-right">
              <h3 className="rs-section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                Preparation Guide
              </h3>
              <div className="rs-steps">
                {(recipe.steps || []).map((step, i) => {
                  const title       = typeof step === 'object' ? step.title       : '';
                  const instruction = typeof step === 'object' ? step.instruction : step;
                  const stepImg = `https://source.unsplash.com/120x90/?${encodeURIComponent((title || recipe.title) + ',food,cooking')}`;
                  return (
                    <div key={i} className="rs-step">
                      <div className="rs-step-num">{i + 1}</div>
                      <div className="rs-step-content">
                        {title && <strong className="rs-step-title">{title}</strong>}
                        <p className="rs-step-text">{instruction}</p>
                      </div>
                      <img className="rs-step-img" src={stepImg} alt={title}
                        onError={e => { e.target.style.display='none'; }} />
                    </div>
                  );
                })}
              </div>

              {/* Tips */}
              {recipe.tips?.length > 0 && (
                <div className="rs-section rs-tips-section" style={{marginTop:16}}>
                  <h3 className="rs-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    Pro Tips
                  </h3>
                  {recipe.tips.map((tip, i) => (
                    <div key={i} className="rs-tip-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                      </svg>
                      {tip}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

/* ── Camera modal ────────────────────────────── */
function CameraModal({ onCapture, onClose }) {
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState('');
  const [facingMode, setFacingMode] = React.useState('environment');

  const startCamera = React.useCallback(async (mode) => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; setReady(true); setError(''); }
    } catch (e) {
      setError('Camera access denied. Please allow camera permission and try again.');
    }
  }, []);

  React.useEffect(() => { startCamera(facingMode); return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); }; }, []);

  const switchCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next); startCamera(next);
  };

  const capture = () => {
    const video = videoRef.current; const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="camera-modal" onClick={e => e.stopPropagation()}>
        <div className="camera-modal-header">
          <span className="camera-modal-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
            </svg>
            Take Photo
          </span>
          <button className="camera-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="camera-viewfinder">
          {error ? (
            <div className="camera-error">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>{error}</p>
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <div className="camera-modal-footer">
          <button className="camera-switch-btn" onClick={switchCamera} title="Switch camera">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
          </button>
          <button className="camera-capture-btn" onClick={capture} disabled={!ready || !!error}>
            <span className="camera-capture-ring"/>
          </button>
          <div style={{ width: 44 }}/>
        </div>
      </div>
    </div>
  );
}

function ProfileModal({ user, savedCount, viewedCount, onClose, onLogout }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const memberSince = (() => {
    const d = user.createdAt
      ? new Date(user.createdAt)
      : new Date(parseInt(user.id));
    return isNaN(d) ? 'Recently' : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        {/* Header banner */}
        <div className="profile-header">
          <button className="profile-close-btn" onClick={onClose} title="Close">✕</button>
          <div className="profile-avatar-lg">{user.name.charAt(0).toUpperCase()}</div>
          <h2 className="profile-name">{user.name}</h2>
          <p className="profile-email-text">{user.email}</p>
          <span className="profile-since-badge">Member since {memberSince}</span>
        </div>

        {/* Stats */}
        <div className="profile-stats-row">
          <div className="profile-stat">
            <span className="profile-stat-val">{savedCount}</span>
            <span className="profile-stat-lbl">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              Saved Recipes
            </span>
          </div>
          <div className="profile-stat-sep"/>
          <div className="profile-stat">
            <span className="profile-stat-val">{viewedCount}</span>
            <span className="profile-stat-lbl">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Viewed Recipes
            </span>
          </div>
        </div>

        {/* Info section */}
        <div className="profile-info-section">
          <div className="profile-info-row">
            <div className="profile-info-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <p className="profile-info-label">Full Name</p>
              <p className="profile-info-value">{user.name}</p>
            </div>
          </div>
          <div className="profile-info-row">
            <div className="profile-info-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div>
              <p className="profile-info-label">Email Address</p>
              <p className="profile-info-value">{user.email}</p>
            </div>
          </div>
          <div className="profile-info-row">
            <div className="profile-info-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <p className="profile-info-label">Joined</p>
              <p className="profile-info-value">{memberSince}</p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="profile-footer">
          <button className="profile-logout-btn" onClick={() => { onClose(); onLogout(); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── How It Works modal ─────────────────────── */
function HowItWorksModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const DotArrow = ({ color = '#16a34a' }) => (
    <svg width="56" height="16" viewBox="0 0 56 16" fill="none" style={{flexShrink:0}}>
      <line x1="0" y1="8" x2="42" y2="8" stroke={color} strokeWidth="2" strokeDasharray="5,3" opacity="0.5"/>
      <polyline points="36,3 46,8 36,13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const FlowStep = ({ num, icon, title, desc, color }) => (
    <div className="hiw2-step">
      <div className="hiw2-icon-ring" style={{ background: color === 'green' ? '#f0fdf4' : '#eff6ff', border: `1.5px solid ${color === 'green' ? '#bbf7d0' : '#bfdbfe'}` }}>
        {icon}
      </div>
      <div className="hiw2-step-num" style={{ background: color === 'green' ? '#16a34a' : '#3b82f6' }}>{num}</div>
      <p className="hiw2-step-title">{title}</p>
      <p className="hiw2-step-desc">{desc}</p>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="hiw-modal hiw2-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" style={{ position:'absolute', top:'1rem', right:'1rem', background:'#f1f5f9', color:'#374151' }} onClick={onClose}>✕</button>

        {/* Header */}
        <div className="hiw-header" style={{marginBottom:'1.4rem'}}>
          <h2 className="hiw-title">How It Works</h2>
          <div className="hiw-title-underline"/>
          <p className="hiw-subtitle">Two smart ways to get the perfect recipe for you</p>
        </div>

        {/* Two flows */}
        <div className="hiw2-flows-wrap">

          {/* FLOW 1 — Search Recipe */}
          <div className="hiw2-flow">
            <div className="hiw2-flow-header">
              <span className="hiw2-badge hiw2-badge-green">FLOW 1</span>
              <span className="hiw2-flow-title">Search Recipe</span>
              <span style={{fontSize:'1.1rem'}}>🔍</span>
            </div>
            <p className="hiw2-flow-sub">Search any recipe, get ingredients &amp; steps</p>
            <div className="hiw2-steps-row">
              <FlowStep num={1} color="green"
                title="Search Any Recipe"
                desc="Type the recipe you want to cook."
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
              />
              <DotArrow color="#16a34a"/>
              <FlowStep num={2} color="green"
                title="Get Ingredients"
                desc="See the complete list of ingredients you need."
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
              />
              <DotArrow color="#16a34a"/>
              <FlowStep num={3} color="green"
                title="Step-by-Step Guide"
                desc="Follow easy step-by-step instructions to cook perfectly."
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="hiw2-divider"/>

          {/* FLOW 2 — Scan Fridge */}
          <div className="hiw2-flow">
            <div className="hiw2-flow-header">
              <span className="hiw2-badge hiw2-badge-blue">FLOW 2</span>
              <span className="hiw2-flow-title">Scan Fridge</span>
              <span style={{fontSize:'1.1rem'}}>🖼️</span>
            </div>
            <p className="hiw2-flow-sub">Scan your fridge, AI finds recipes for you</p>
            <div className="hiw2-steps-row">
              <FlowStep num={1} color="blue"
                title="Upload Fridge Image"
                desc="Take a photo of your fridge or upload from gallery."
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
              />
              <DotArrow color="#3b82f6"/>
              <FlowStep num={2} color="blue"
                title="AI Detects Ingredients"
                desc="Our AI scans the image and identifies available ingredients."
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></svg>}
              />
              <DotArrow color="#3b82f6"/>
              <FlowStep num={3} color="blue"
                title="Get Recipe Suggestions"
                desc="Get personalized recipe ideas you can make with what you have."
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12h20c0-5.52-4.48-10-10-10z"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M6 16c0 3.31 2.69 6 6 6s6-2.69 6-6"/></svg>}
              />
            </div>
          </div>

        </div>

        {/* 4 feature cards */}
        <div className="hiw2-features">
          {[
            { bg:'#fce7f3', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, title:'Save & Organize', desc:'Save your favorite recipes and access them anytime.' },
            { bg:'#dcfce7', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12h20c0-5.52-4.48-10-10-10z"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M6 16c0 3.31 2.69 6 6 6s6-2.69 6-6"/></svg>, title:'Cook with Confidence', desc:'Easy guides help you cook delicious meals every time.' },
            { bg:'#fef9c3', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, title:'AI Powered', desc:'Smart AI makes cooking easier, faster and personalized.' },
            { bg:'#eff6ff', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title:'Private & Secure', desc:'Your data and images are 100% safe with us.' },
          ].map((f, i) => (
            <div key={i} className="hiw2-feature-card">
              <div className="hiw2-feature-icon" style={{background: f.bg}}>{f.icon}</div>
              <div>
                <p className="hiw2-feature-title">{f.title}</p>
                <p className="hiw2-feature-desc">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tip bar */}
        <div className="hiw2-tip-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span><strong>Tip:</strong> Use a clear, well-lit image for the best results.</span>
        </div>

      </div>
    </div>
  );
}

/* ── Step indicator ──────────────────────────── */
function StepBar({ currentStep }) {
  const steps = [
    { num: 1, label: 'Upload Fridge Photo' },
    { num: 2, label: 'AI Detects Ingredients' },
    { num: 3, label: 'Get Recipes Instantly' },
  ];
  return (
    <div className="steps-bar">
      <div className="steps-inner">
        {steps.map((s, i) => (
          <React.Fragment key={s.num}>
            {i > 0 && <div className={`step-connector${currentStep > i ? ' done' : ''}`} />}
            <div className={`step-item${currentStep >= s.num ? ' active' : ''}`}>
              <div className="step-circle">{s.num}</div>
              <span className="step-label">{s.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ── App ─────────────────────────────────────── */
function App() {
  const [image, setImage]             = useState(null);
  const [preview, setPreview]         = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [status, setStatus]           = useState('');
  const [error, setError]             = useState('');
  const [dragOver, setDragOver]       = useState(false);
  const [addingIngr, setAddingIngr]   = useState(false);
  const [newIngrName, setNewIngrName] = useState('');
  const [viewingRecipe, setViewingRecipe]   = useState(null);
  const [showSaved, setShowSaved]           = useState(false);
  const [recipeViewMode, setRecipeViewMode] = useState('grid');
  const [showAllRecipes, setShowAllRecipes] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try { const u = localStorage.getItem('authUser'), t = localStorage.getItem('authToken'); return (u && t) ? JSON.parse(u) : null; } catch { return null; }
  });
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userKey = currentUser?.id || 'guest';

  const [savedRecipes, setSavedRecipes]   = useState(() => {
    try { const k = (() => { try { const u = JSON.parse(localStorage.getItem('authUser')||'null'); return u?.id||'guest'; } catch { return 'guest'; } })(); return JSON.parse(localStorage.getItem(`savedRecipes_${k}`) || '[]'); } catch { return []; }
  });
  const [viewedRecipes, setViewedRecipes] = useState(() => {
    try { const k = (() => { try { const u = JSON.parse(localStorage.getItem('authUser')||'null'); return u?.id||'guest'; } catch { return 'guest'; } })(); return JSON.parse(localStorage.getItem(`viewedRecipes_${k}`) || '[]'); } catch { return []; }
  });
  const [showMyRecipes, setShowMyRecipes]   = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showProfile, setShowProfile]       = useState(false);
  const [activeTab, setActiveTab]           = useState('home'); // 'home' | 'fridge'

  const normalizeRecipeList = (list) => (list || []).map(rec => ({
    ...rec,
    ingredients: (rec.ingredients || []).map(ing =>
      typeof ing === 'object' ? `${ing.name || ''}${ing.quantity ? ' – ' + ing.quantity : ''}` : ing
    ),
    steps: (rec.steps || []).map(step =>
      typeof step === 'object' ? `${step.title ? step.title + ': ' : ''}${step.instruction || ''}` : step
    ),
  }));

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token || !currentUser) {
      setSavedRecipes([]);
      setViewedRecipes([]);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    axios.get('http://localhost:5000/api/recipes/saved', { headers })
      .then(r => setSavedRecipes(normalizeRecipeList(r.data)))
      .catch(() => setSavedRecipes([]));
    axios.get('http://localhost:5000/api/recipes/viewed', { headers })
      .then(r => setViewedRecipes(normalizeRecipeList(r.data)))
      .catch(() => setViewedRecipes([]));
  }, [userKey]);

  useEffect(() => {
    if (!showUserMenu) return;
    const close = () => setShowUserMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showUserMenu]);

  const handleLogin = (user) => setCurrentUser(user);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setCurrentUser(null);
    setShowUserMenu(false);
    setImage(null); setPreview(null);
    setIngredients([]); setRecipes([]);
    setError(''); setStatus('');
  };

  const toggleSave = async (rec) => {
    const token = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${token}` };
    const exists = savedRecipes.find(r => r.title === rec.title);
    if (exists) {
      setSavedRecipes(prev => prev.filter(r => r.title !== rec.title));
      if (token) axios.delete(`http://localhost:5000/api/recipes/saved/${encodeURIComponent(rec.title)}`, { headers }).catch(() => {});
    } else {
      setSavedRecipes(prev => [...prev, rec]);
      if (token) axios.post('http://localhost:5000/api/recipes/saved', rec, { headers }).catch(() => {});
    }
  };

  const isRecipeSaved = (rec) => savedRecipes.some(r => r.title === rec.title);

  const handleViewRecipe = (rec) => {
    setViewingRecipe(rec);
    if (!viewedRecipes.find(r => r.title === rec.title)) {
      setViewedRecipes(prev => [rec, ...prev]);
      const token = localStorage.getItem('authToken');
      if (token) axios.post('http://localhost:5000/api/recipes/viewed', rec, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
  };

  const hasResults  = ingredients.length > 0 || recipes.length > 0;
  const currentStep = recipes.length > 0 ? 3 : (loading || ingredients.length > 0) ? 2 : image ? 1 : 0;

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const applyFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImage(file); setPreview(URL.createObjectURL(file));
    setIngredients([]); setRecipes([]); setError(''); setStatus('');
  };

  const handleImageChange = (e) => applyFile(e.target.files[0]);

  const handleRemoveImage = (e) => {
    e.preventDefault();
    setImage(null); setPreview(null);
    setIngredients([]); setRecipes([]);
    setError(''); setStatus('');
    const inp = document.getElementById('file-input');
    if (inp) inp.value = '';
  };

  const handleDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = ()  => setDragOver(false);
  const handleDrop      = (e) => { e.preventDefault(); setDragOver(false); applyFile(e.dataTransfer.files[0]); };

  const [showCamera, setShowCamera] = useState(false);

  const regenerateRecipes = async (updatedIngredients) => {
    if (updatedIngredients.length === 0) { setRecipes([]); return; }
    setLoading(true); setStatus('Updating recipes…');
    try {
      const res = await axios.post('http://localhost:5000/api/recipes-from-ingredients', {
        ingredients: updatedIngredients.map(i => i.name),
      });
      setRecipes(res.data.recipes || []);
    } catch {
      // keep existing recipes on failure
    }
    setLoading(false); setStatus('');
  };

  const removeIngredient = (name) => {
    const updated = ingredients.filter(i => i.name !== name);
    setIngredients(updated);
    regenerateRecipes(updated);
  };

  const confirmAddIngredient = () => {
    const t = newIngrName.trim();
    if (t) {
      const updated = [...ingredients, { name: t, confidence: 100 }];
      setIngredients(updated);
      regenerateRecipes(updated);
    }
    setNewIngrName(''); setAddingIngr(false);
  };

  const avgConfidence = ingredients.length > 0
    ? Math.round(ingredients.reduce((s, i) => s + i.confidence, 0) / ingredients.length) : 0;

  const handleUpload = async () => {
    if (!image) return;
    setLoading(true); setError(''); setIngredients([]); setRecipes([]);
    const formData = new FormData();
    formData.append('image', image);
    try {
      setStatus('Analysing image with Groq AI...');
      const res = await axios.post('http://localhost:5000/api/upload', formData, { timeout: 300000 });
      const detectedIngredients = res.data.ingredients || [];
      const detectedRecipes = (res.data.recipes || []).filter(r =>
        r.title && r.title !== 'Recipe suggestion' && (r.ingredients || []).length > 0
      );
      if (detectedIngredients.length === 0) {
        setError('No food ingredients detected in this image. Please upload a clear photo of your fridge or food items.');
        setStatus('');
      } else {
        setIngredients(detectedIngredients.map(name => ({
          name, confidence: Math.floor(Math.random() * 15) + 85,
        })));
        setRecipes(detectedRecipes);
        setStatus('');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to process image.');
      setStatus('');
    }
    setLoading(false);
  };

  if (!currentUser) return <AuthPage onAuth={handleLogin} />;

  return (
    <div className="app-root">

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-logo">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
              <rect width="32" height="32" rx="8" fill="#16a34a"/>
              <path d="M10 22 Q16 8 22 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <circle cx="16" cy="13" r="2.5" fill="white"/>
            </svg>
          </div>
          <div>
            <h1 className="brand-title">Smart <span className="brand-accent">Recipe</span></h1>
            <p className="brand-sub">Scan your fridge or search a recipe—cook smarter</p>
          </div>
        </div>
        <nav className="header-nav">
          <button className={`nav-link${activeTab === 'home' ? ' nav-link-active' : ''}`} onClick={() => setActiveTab('home')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Home
          </button>
          <button className={`nav-link${activeTab === 'fridge' ? ' nav-link-active' : ''}`} onClick={() => setActiveTab('fridge')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="5" y1="10" x2="19" y2="10"/>
            </svg>
            Scan Fridge
          </button>
          <button className="nav-link" onClick={() => setShowMyRecipes(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            My Recipes
            {(viewedRecipes.length > 0 || savedRecipes.length > 0) && (
              <span className="saved-badge">{viewedRecipes.length + savedRecipes.length}</span>
            )}
          </button>
          <button className="nav-link" onClick={() => setShowSaved(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Saved
            {savedRecipes.length > 0 && (
              <span className="saved-badge">{savedRecipes.length}</span>
            )}
          </button>
          <button className="nav-link" onClick={() => setShowHowItWorks(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            How It Works
          </button>
          <div className="nav-avatar user-avatar-btn" onClick={(e) => { e.stopPropagation(); setShowUserMenu(s => !s); }}>
            <span className="user-initial-circle">{currentUser.name.charAt(0).toUpperCase()}</span>
            {showUserMenu && (
              <div className="user-dropdown" onClick={e => e.stopPropagation()}>
                <div className="user-dropdown-info">
                  <div className="user-dropdown-initial">{currentUser.name.charAt(0).toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <p className="user-dropdown-name">{currentUser.name}</p>
                    <p className="user-dropdown-email">{currentUser.email}</p>
                  </div>
                </div>
                <hr className="user-dropdown-divider"/>
                <button className="user-dropdown-item" onClick={() => { setShowProfile(true); setShowUserMenu(false); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  View Profile
                </button>
                <hr className="user-dropdown-divider"/>
                <button className="user-dropdown-logout" onClick={handleLogout}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* ── Home tab ── */}
      {activeTab === 'home' && (
        <div className="main-scroll-area">
          <RecipeSearch
            onGoToFridge={() => setActiveTab('fridge')}
            savedRecipes={savedRecipes}
            onToggleSave={toggleSave}
            onRecipeViewed={rec => {
              if (!viewedRecipes.find(r => r.title === rec.title)) {
                setViewedRecipes(prev => [rec, ...prev]);
                const token = localStorage.getItem('authToken');
                if (token) axios.post('http://localhost:5000/api/recipes/viewed', rec, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
              }
            }}
          />
        </div>
      )}

      {/* ── Fridge AI tab ── */}
      {activeTab === 'fridge' && (<>
      <div className="main-scroll-area">
      <div className="content-wrapper">
        <div className="two-col-layout">

          {/* LEFT */}
          <div className="left-col">
            <div className="card">
              <div className="card-header-row">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                <div>
                  <h2 className="section-title" style={{ marginBottom: 0 }}>Upload Your Fridge Photo</h2>
                  <p className="section-sub">Upload a clear photo of your fridge interior</p>
                </div>
              </div>

              <div
                className={`upload-dropzone${dragOver ? ' drag-over' : ''}`}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                onClick={() => document.getElementById('file-input').click()}
              >
                <div className="upload-cloud-circle">
                  <svg className="upload-cloud-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 16 12 12 8 16"/>
                    <line x1="12" y1="12" x2="12" y2="21"/>
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                  </svg>
                </div>
                <p className="upload-drag-text">Drag &amp; drop your image here</p>
                <p className="upload-browse-text">or <span className="upload-browse-link">click to browse</span></p>
                <p className="upload-file-types">JPG • PNG • WEBP (Max 10MB)</p>
              </div>

              <div className="upload-or-row">
                <span className="upload-or-line"/><span className="upload-or-text">or</span><span className="upload-or-line"/>
              </div>

              <button
                type="button"
                className="upload-camera-btn"
                onClick={e => { e.stopPropagation(); setShowCamera(true); }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Take Photo with Camera
              </button>

              <input id="file-input" type="file" accept="image/*" onChange={handleImageChange} className="file-input-hidden" />

              {preview && (
                <div className="upload-preview-bar">
                  <div className="preview-thumb-wrap">
                    <img src={preview} alt="preview" className="preview-thumb" />
                    <button className="btn-remove-img" onClick={handleRemoveImage} title="Remove">✕</button>
                  </div>
                  <div className="preview-meta">
                    <p className="preview-filename">{image?.name}</p>
                    <p className="preview-filesize">{formatFileSize(image?.size)}</p>
                    <label className="btn-change-img" htmlFor="file-input">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Change Image
                    </label>
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={loading || !image}
                className={`btn-analyse ${loading || !image ? 'btn-disabled' : ''}`}
              >
                {loading
                  ? <span className="btn-loading"><span className="spinner" /> Processing…</span>
                  : <span className="btn-loading">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      Analyze Fridge
                    </span>
                }
              </button>

              <p className="privacy-note">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Your photo is private and secure
              </p>

              {status && (
                <div className="status-msg">
                  <span className="pulse-dot"/>
                  {status} <small style={{ color: '#9ca3af' }}>(may take 5–15 s)</small>
                </div>
              )}
              {error && <div className="error-box">⚠️ {error}</div>}
            </div>
          </div>

          {/* RIGHT */}
          <div className="right-col">

            {!hasResults && !loading && (
              <div className="card results-placeholder">
                <div className="placeholder-inner">
                  <span style={{ fontSize: '3rem' }}>🥗</span>
                  <p className="placeholder-title">Results will appear here</p>
                  <p className="placeholder-sub">Upload a fridge photo and click Analyze Fridge to detect ingredients and get recipe suggestions.</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="card results-placeholder">
                <div className="placeholder-inner">
                  <span className="spinner spinner-lg"/>
                  <p className="placeholder-title">Analysing your fridge…</p>
                  <p className="placeholder-sub">Detecting ingredients and generating recipes</p>
                </div>
              </div>
            )}

            {/* Ingredients */}
            {ingredients.length > 0 && (
              <div className="card">
                <div className="ingr-header-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    <h2 className="section-title" style={{ marginBottom: 0 }}>Detected Ingredients</h2>
                  </div>
                  <span className="ai-confidence-badge">AI Confidence: {avgConfidence}%</span>
                </div>
                <div className="ingredients-row">
                  {ingredients.map((item, i) => (
                    <IngredientChip key={i} item={item} onRemove={removeIngredient} />
                  ))}
                  {addingIngr ? (
                    <div className="add-ingr-input-wrap">
                      <input autoFocus className="add-ingr-input" value={newIngrName}
                        onChange={e => setNewIngrName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmAddIngredient();
                          if (e.key === 'Escape') { setAddingIngr(false); setNewIngrName(''); }
                        }}
                        placeholder="e.g. garlic"
                      />
                      <button className="add-ingr-confirm" onClick={confirmAddIngredient}>✓</button>
                      <button className="add-ingr-cancel" onClick={() => { setAddingIngr(false); setNewIngrName(''); }}>✕</button>
                    </div>
                  ) : (
                    <button className="add-ingr-btn" onClick={() => setAddingIngr(true)}>
                      <span>+</span> Add Ingredient
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Recipes */}
            {recipes.length > 0 && (
              <div className="card">
                <div className="recipes-section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ViewToggle mode={recipeViewMode} onChange={setRecipeViewMode} />
                    <h2 className="section-title" style={{ marginBottom: 0 }}>Suggested Recipes</h2>
                  </div>
                  <button className="view-all-btn" onClick={() => setShowAllRecipes(true)}>
                    View all recipes →
                  </button>
                </div>

                {recipeViewMode === 'grid' && (
                  <div className="recipes-grid">
                    {recipes.map((rec, i) => (
                      <RecipeCard key={i} rec={rec} index={i}
                        onView={handleViewRecipe} isSaved={isRecipeSaved(rec)} onToggleSave={toggleSave} />
                    ))}
                  </div>
                )}

                {recipeViewMode === 'list' && (
                  <div className="recipes-list-view">
                    {recipes.map((rec, i) => (
                      <RecipeListCard key={i} rec={rec} index={i}
                        onView={handleViewRecipe} isSaved={isRecipeSaved(rec)} onToggleSave={toggleSave} />
                    ))}
                  </div>
                )}

                {recipeViewMode === 'table' && (
                  <RecipeTableRows
                    recipes={recipes}
                    onView={handleViewRecipe}
                    actionLabel="Save / Unsave"
                    onAction={toggleSave}
                    actionIcon={(rec) => (
                      <span style={{ color: isRecipeSaved(rec) ? '#ef4444' : '#d1d5db', fontSize: '1.1rem' }}>
                        {isRecipeSaved(rec) ? '♥' : '♡'}
                      </span>
                    )}
                  />
                )}
              </div>
            )}

          </div>
        </div>
      </div>
      </div>

      {/* ── Tip bar ── */}
      <div className="tip-bar">
        <div className="tip-content">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p><strong>Tip:</strong> Get better results by capturing a well-lit photo with the fridge door open.</p>
        </div>
        <button className="btn-sample" onClick={() => document.getElementById('file-input').click()}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          Try Sample Image
        </button>
      </div>
      </>)}

      {viewingRecipe && <RecipeModal rec={viewingRecipe} onClose={() => setViewingRecipe(null)} />}
      {showAllRecipes && (
        <AllRecipesModal
          recipes={recipes}
          onClose={() => setShowAllRecipes(false)}
          onView={handleViewRecipe}
          isSaved={isRecipeSaved}
          onToggleSave={toggleSave}
        />
      )}
      {showSaved && (
        <SavedModal
          recipes={savedRecipes}
          onClose={() => setShowSaved(false)}
          onRemove={toggleSave}
          onView={handleViewRecipe}
        />
      )}
      {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}
      {showCamera && (
        <CameraModal
          onCapture={(file) => { applyFile(file); setShowCamera(false); }}
          onClose={() => setShowCamera(false)}
        />
      )}
      {showProfile && (
        <ProfileModal
          user={currentUser}
          savedCount={savedRecipes.length}
          viewedCount={viewedRecipes.length}
          onClose={() => setShowProfile(false)}
          onLogout={handleLogout}
        />
      )}
      {showMyRecipes && (
        <MyRecipesModal
          viewedRecipes={viewedRecipes}
          savedRecipes={savedRecipes}
          onClose={() => setShowMyRecipes(false)}
          onView={handleViewRecipe}
          isSaved={isRecipeSaved}
          onToggleSave={toggleSave}
        />
      )}
    </div>
  );
}

export default App;
