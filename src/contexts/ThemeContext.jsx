import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Theme: 'light' | 'dark' (Defaulting to light theme as warm ivory/forest green is primary identity)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('unfold_theme') || 'light';
  });

  // Chromatic explosion state
  const [isExploding, setIsExploding] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('unfold_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const triggerChromaticExplosion = useCallback(() => {
    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      return;
    }

    setIsExploding(true);
  }, []);

  const onExplosionComplete = useCallback(() => {
    setIsExploding(false);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        isExploding,
        triggerChromaticExplosion,
        onExplosionComplete,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
