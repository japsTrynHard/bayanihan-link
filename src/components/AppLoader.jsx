import React from 'react';
import logoIcon from '../styles/assets/bayanihan-logo-icon.png';
import '../styles/components/AppLoader.css';

function AppLoader({ message = 'Preparing your sign in', subtitle = 'Checking your saved session and loading the right dashboard.' }) {
  return (
    <div className="app-loader-shell" role="status" aria-live="polite" aria-busy="true">
      <div className="app-loader-bg app-loader-bg--left" />
      <div className="app-loader-bg app-loader-bg--right" />

      <div className="app-loader-card">
        <div className="app-loader-logo-wrap">
          <img src={logoIcon} alt="Bayanihan Link" className="app-loader-logo" />
        </div>

        <div className="app-loader-copy">
          <span>Bayanihan Link</span>
          <h2>{message}</h2>
          <p>{subtitle}</p>
        </div>

        <div className="app-loader-progress" aria-hidden="true">
          <span />
        </div>

        <div className="app-loader-steps" aria-hidden="true">
          <div><i /> Account</div>
          <div><i /> Theme</div>
          <div><i /> Dashboard</div>
        </div>
      </div>
    </div>
  );
}

export default AppLoader;
