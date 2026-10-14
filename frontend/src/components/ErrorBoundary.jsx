import React, { Component } from 'react';

/**
 * Catches dynamic import / chunk load errors when a new deployment occurs.
 * Automatically refreshes the page once to pull fresh assets instead of showing a white screen.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Check if error is related to dynamic chunk loading failure
    const errorMsg = error?.message || error?.toString() || '';
    const isChunkFailure =
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Importing a module script failed') ||
      errorMsg.includes('error loading dynamically imported module') ||
      errorMsg.includes('Loading chunk') ||
      errorMsg.includes('Loading CSS chunk');

    if (isChunkFailure) {
      const storageKey = 'chunk_reload_timestamp';
      const lastReload = sessionStorage.getItem(storageKey);
      const now = Date.now();

      // Only auto-reload if not already reloaded in the last 10 seconds (prevents reload loop)
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(storageKey, String(now));
        window.location.reload();
      }
    }
  }

  handleManualReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Updating Application...</h2>
          <p className="text-xs text-gray-500 max-w-sm mb-4">
            A new version was deployed or network connection was briefly interrupted.
          </p>
          <button
            type="button"
            onClick={this.handleManualReload}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition-colors"
          >
            Refresh Screen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
