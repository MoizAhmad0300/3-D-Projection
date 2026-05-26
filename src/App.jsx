import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import MainPage from './components/MainPage';

function App() {
  const [activeScreen, setActiveScreen] = useState('home');
  const [lightMode, setLightMode] = useState(false);

  useEffect(() => {
    // Keep theme class on document root so CSS can target it
    const root = document.documentElement;
    if (lightMode) root.classList.add('light-theme');
    else root.classList.remove('light-theme');
  }, [lightMode]);

  const toggleLightMode = () => setLightMode((s) => !s);

  if (activeScreen === 'network') {
    return (
      <MainPage
        onBackHome={() => setActiveScreen('home')}
        lightMode={lightMode}
        onToggleLightMode={toggleLightMode}
      />
    );
  }

  return <HomePage onEnterNetwork={() => setActiveScreen('network')} />;
}

export default App;
