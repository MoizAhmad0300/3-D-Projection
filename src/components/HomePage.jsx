import React from 'react';

const HomePage = ({ onEnterNetwork }) => (
  <main className="landing-shell">
    <div className="landing-grid" aria-hidden="true" />
    <div className="landing-orb landing-orb-left" aria-hidden="true" />
    <div className="landing-orb landing-orb-right" aria-hidden="true" />

    <section className="landing-content">
      <div className="landing-kicker">Corporate Relationship Intelligence</div>

      <div className="logo-stage" aria-label="NAAR logo">
        <div className="logo-stack">
          <span className="logo-shadow logo-shadow-back">NAAR</span>
          <span className="logo-shadow logo-shadow-mid">NAAR</span>
          <span className="logo-wordmark">NAAR</span>
        </div>
        <div className="logo-subtitle">Barristers & Advocates</div>
      </div>

      <h1 className="landing-title">Modernized network analysis with the new UI and the real relationship data behind it.</h1>
      <p className="landing-copy">
        Explore directors, partners, and connected companies in a cleaner interface while keeping the interactive graph and entity details fully connected.
      </p>

      <div className="landing-actions">
        <button type="button" className="primary-action" onClick={onEnterNetwork}>
          Enter Directory
        </button>
      </div>
    </section>
  </main>
);

export default HomePage;
