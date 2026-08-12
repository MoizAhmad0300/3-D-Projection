import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import MainPage from './components/MainPage';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import { getActiveEmail, setActiveEmail, normalizeDatabase } from './data';
import { loadDatabaseFromSupabase, saveDatabaseToSupabase, seedDatabaseToSupabase } from './database';
import { supabase } from './supabase';

function App() {
  const [activeScreen, setActiveScreen] = useState('home');
  const [lightMode, setLightMode] = useState(false);
  const [route, setRoute] = useState(() => window.location.pathname);
  const [database, setDatabase] = useState(null);
  const [loadingDb, setLoadingDb] = useState(true);
  const [activeEmail, setCurrentActiveEmail] = useState(() => getActiveEmail());
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Keep theme class on document root so CSS can target it
    const root = document.documentElement;
    if (lightMode) root.classList.add('light-theme');
    else root.classList.remove('light-theme');
  }, [lightMode]);

  useEffect(() => {
    async function initDb() {
      let db = await loadDatabaseFromSupabase();

      if (db) {
        setDatabase(db);
      } else {
        setDatabase({ users: [], groups: [], companies: [], directors: [], audit_log: [] });
      }
      setLoadingDb(false);
    }
    initDb();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.email) {
        setCurrentActiveEmail(session.user.email);
        ensureUserIsAdmin(session.user.email);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email) {
        setCurrentActiveEmail(session.user.email);
        ensureUserIsAdmin(session.user.email);
      }
      if (_event === 'SIGNED_OUT') {
        setCurrentActiveEmail('');
        setActiveEmail('');
      }
    });

    const handleRouteChange = () => setRoute(window.location.pathname);
    const handleActiveEmailUpdate = (event) => setCurrentActiveEmail(event.detail || getActiveEmail());

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('naar:active-email-updated', handleActiveEmailUpdate);

    // Supabase Realtime Subscription
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, async () => {
        const db = await loadDatabaseFromSupabase();
        if (db) setDatabase(db);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('naar:active-email-updated', handleActiveEmailUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

  const ensureUserIsAdmin = async (email) => {
    // Only run this if we have a database loaded
    setDatabase((currentDb) => {
      if (!currentDb) return currentDb;

      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = currentDb.users.find(u => u.email.toLowerCase().trim() === normalizedEmail);

      if (!existingUser) {
        console.log(`Auto-creating super_admin for authenticated user: ${email}`);
        const newUser = {
          id: `user-${Date.now()}`,
          name: email.split('@')[0],
          email: normalizedEmail,
          role: 'super_admin',
          allowedGroupIds: currentDb.groups.map(g => g.id),
          active: true,
        };
        const nextDb = { ...currentDb, users: [...currentDb.users, newUser] };
        saveDatabaseToSupabase(nextDb); // persist it
        return nextDb;
      }

      return currentDb;
    });
  };

  const toggleLightMode = () => setLightMode((s) => !s);
  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setRoute(path);
  };

  const handleDatabaseSave = async (nextDatabase) => {
    setDatabase(nextDatabase); // Optimistic UI update
    await saveDatabaseToSupabase(nextDatabase);
  };

  const handleActiveEmailChange = (email) => {
    setActiveEmail(email);
    setCurrentActiveEmail(getActiveEmail());
  };

  if (loadingDb) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#060d1b', color: '#fff', fontFamily: 'sans-serif' }}>
        <p>Loading database...</p>
      </div>
    );
  }

  if (route === '/admin') {
    if (!session) {
      return <AdminLogin onLogin={(session) => setSession(session)} onBack={() => navigateTo('/')} />;
    }
    return (
      <AdminPanel
        database={database}
        activeEmail={activeEmail}
        onActiveEmailChange={handleActiveEmailChange}
        onDatabaseSave={handleDatabaseSave}
        onBackDirectory={() => navigateTo('/')}
        onLogout={() => supabase.auth.signOut()}
      />
    );
  }

  if (activeScreen === 'network') {
    return (
      <MainPage
        onBackHome={() => setActiveScreen('home')}
        onOpenAdmin={() => navigateTo('/admin')}
        lightMode={lightMode}
        onToggleLightMode={toggleLightMode}
        database={database}
        activeEmail={activeEmail}
        onActiveEmailChange={handleActiveEmailChange}
      />
    );
  }

  return <HomePage onEnterNetwork={() => setActiveScreen('network')} />;
}

export default App;
