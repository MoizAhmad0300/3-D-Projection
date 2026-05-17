import React, { useState } from 'react';
import HomePage from './components/HomePage';
import MainPage from './components/MainPage';

function App() {
  const [activeScreen, setActiveScreen] = useState('home');

  if (activeScreen === 'network') {
    return <MainPage onBackHome={() => setActiveScreen('home')} />;
  }

  return <HomePage onEnterNetwork={() => setActiveScreen('network')} />;
}

export default App;
