import React, { useState } from 'react';
import { supabase } from '../supabase';

function AdminLogin({ onLogin, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else if (data.session) {
      onLogin(data.session);
    }
  };

  return (
    <div className="landing-shell">
      <div className="landing-grid"></div>
      <div className="landing-orb landing-orb-left"></div>
      <div className="landing-orb landing-orb-right"></div>
      <div className="landing-content" style={{ maxWidth: '400px', padding: '32px' }}>
        <h2 className="landing-title" style={{ fontSize: '2rem', marginBottom: '8px' }}>Admin Login</h2>
        <p className="landing-copy" style={{ marginBottom: '24px' }}>Sign in to access the administrator panel.</p>
        
        {error && (
          <div style={{ color: '#fca5a5', marginBottom: '16px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="search-field">
             <label className="search-field-label" style={{ textAlign: 'left' }}>Email</label>
             <input 
               type="email" 
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               required
               placeholder="admin@example.com"
             />
          </div>
          <div className="search-field">
             <label className="search-field-label" style={{ textAlign: 'left' }}>Password</label>
             <input 
               type="password" 
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               required
               placeholder="••••••••"
             />
          </div>
          
          <div className="landing-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="ghost-action" onClick={onBack} disabled={loading} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="primary-action" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
