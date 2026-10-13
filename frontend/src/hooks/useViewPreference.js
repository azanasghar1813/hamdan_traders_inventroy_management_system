import { useState } from 'react';

/**
 * Persists a list/card choice per page in localStorage.
 * Usage: const [view, setView] = useViewPreference('sales', 'list');
 */
export default function useViewPreference(key, defaultView = 'list') {
  const storageKey = `view:${key}`;

  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || defaultView;
    } catch {
      return defaultView; // storage unavailable (private mode) — fall back safely
    }
  });

  const changeView = (next) => {
    setView(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* ignore — preference just won't persist */
    }
  };

  return [view, changeView];
}
