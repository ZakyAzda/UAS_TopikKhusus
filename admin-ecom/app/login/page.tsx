'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Hit API Login ke server Go
      const response = await api.post('/login', {
        email: email,
        password: password,
      });

      // 2. Tangkap tokennya
      const token = response.data.token;

      // 3. Decode JWT payload untuk cek role
      let payload: any = {};
      try {
        payload = JSON.parse(atob(token.split('.')[1]));
      } catch {
        setError('Token tidak valid. Hubungi administrator.');
        return;
      }

      // 4. Pastikan role adalah admin — tolak jika bukan!
      if (String(payload.role).toLowerCase() !== 'admin') {
        setError('Akses ditolak. Hanya admin yang dapat masuk ke panel ini.');
        return;
      }

      // 5. Simpan token di localStorage browser
      localStorage.setItem('admin_token', token);

      // 6. Redirect ke dashboard
      router.push('/');

    } catch (err: any) {
      console.error(err);
      if (err?.response?.status === 401) {
        setError('Email atau password salah. Silakan coba lagi.');
      } else {
        setError('Gagal terhubung ke server. Pastikan server berjalan.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

        * { font-family: 'Inter', sans-serif; box-sizing: border-box; }

        .login-bg {
          min-height: 100vh;
          background: #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .login-card {
          width: 100%;
          max-width: 380px;
          background: #000000;
          border: 1px solid #222222;
          border-radius: 8px;
          padding: 40px 32px;
        }

        .login-title {
          font-size: 24px;
          font-weight: 500;
          color: #ffffff;
          margin: 0 0 6px;
        }

        .login-subtitle {
          font-size: 14px;
          color: #888888;
          margin: 0 0 32px;
        }

        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #888888;
          margin-bottom: 8px;
        }

        .input-wrapper {
          position: relative;
          margin-bottom: 20px;
        }

        .field-input {
          width: 100%;
          background: transparent;
          border: 1px solid #333333;
          color: #ffffff;
          font-size: 14px;
          padding: 12px 16px;
          border-radius: 6px;
          outline: none;
          transition: border-color 0.2s;
        }
        
        .field-input::placeholder { color: #555555; }
        
        .field-input:focus {
          border-color: #ffffff;
        }

        .field-input:-webkit-autofill,
        .field-input:-webkit-autofill:hover,
        .field-input:-webkit-autofill:focus,
        .field-input:-webkit-autofill:active {
          -webkit-text-fill-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0px 9999px #000000 inset !important;
          box-shadow: 0 0 0px 9999px #000000 inset !important;
          background-color: transparent !important;
          transition: background-color 9999s ease-in-out 0s;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #666666;
          display: flex;
          align-items: center;
          padding: 4px;
        }
        .password-toggle:hover { color: #ffffff; }

        .error-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #1a0a0a;
          border: 1px solid #4a1a1a;
          color: #ff5555;
          padding: 10px 14px;
          border-radius: 6px;
          margin-bottom: 24px;
          font-size: 13px;
        }

        .submit-btn {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 6px;
          background: #ffffff;
          color: #000000;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 12px;
        }
        .submit-btn:hover:not(:disabled) {
          opacity: 0.8;
        }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(0,0,0,0.2);
          border-top-color: #000;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="login-bg">
        <div className="login-card">
          <h1 className="login-title">Admin</h1>
          <p className="login-subtitle">Sign in to your account</p>

          {error && (
            <div className="error-box">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div>
              <label className="field-label" htmlFor="login-email">Email</label>
              <div className="input-wrapper">
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input"
                  placeholder="admin@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="login-password">Password</label>
              <div className="input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input"
                  style={{ paddingRight: '40px' }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}