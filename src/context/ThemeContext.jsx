import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { getTheme, setTheme as setThemeStorage } from '../utils/storage';

const ThemeContext = createContext();

const getSystemPreference = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export function ThemeProvider({ children }) {
  // useState: Current theme setting ng app. Puwedeng light, dark, o system.
  const [theme, setThemeState] = useState('system');
  // useState: Actual resolved theme na ina-apply sa screen base sa selected mode.
  const [resolvedTheme, setResolvedTheme] = useState('light');

  const applyTheme = (nextTheme) => {
    const finalTheme = nextTheme === 'system' ? getSystemPreference() : nextTheme;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(finalTheme);
    document.documentElement.dataset.theme = finalTheme;
    setResolvedTheme(finalTheme);
  };

  useEffect(() => {
    const savedTheme = getTheme();
    setThemeState(savedTheme);
    applyTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') applyTheme('system');
    };
    mediaQuery.addEventListener?.('change', handleSystemThemeChange);
    mediaQuery.addListener?.(handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener?.('change', handleSystemThemeChange);
      mediaQuery.removeListener?.(handleSystemThemeChange);
    };
  }, [theme]);

  const setTheme = (nextTheme) => {
    setThemeState(nextTheme);
    setThemeStorage(nextTheme);
    applyTheme(nextTheme);
  };

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  };

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme, toggleTheme }), [theme, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
