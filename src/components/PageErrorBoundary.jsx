import React from 'react';
import Button from './Button';
import '../styles/components/PageErrorBoundary.css';

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Bayanihan Link page error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = this.props.homePath || '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="page-error-boundary">
        <div className="page-error-card">
          <span className="page-error-eyebrow">Bayanihan Link safety fallback</span>
          <h1>This page failed to load.</h1>
          <p>
            The app caught the error instead of showing a blank screen. Reload the page or go back to your dashboard.
          </p>
          {this.state.error?.message ? <code>{this.state.error.message}</code> : null}
          <div className="page-error-actions">
            <Button variant="primary" onClick={this.handleReload}>Reload page</Button>
            <Button variant="secondary" onClick={this.handleHome}>Go to dashboard</Button>
          </div>
        </div>
      </div>
    );
  }
}

export default PageErrorBoundary;
