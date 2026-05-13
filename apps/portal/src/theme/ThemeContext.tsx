import React, { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ mode: 'dark', toggleTheme: () => {} });

export const useThemeMode = () => useContext(ThemeContext);

const darkPalette = {
  mode: 'dark' as const,
  primary: { main: '#6C63FF', light: '#8B83FF', dark: '#4B44B2' },
  secondary: { main: '#03DAC6' },
  background: { default: '#0d1117', paper: '#161b22' },
  text: { primary: '#c9d1d9', secondary: '#8b949e' },
  success: { main: '#3fb950' },
  warning: { main: '#d29922' },
  error: { main: '#f85149' },
  divider: 'rgba(255,255,255,0.06)',
};

const lightPalette = {
  mode: 'light' as const,
  primary: { main: '#6C63FF', light: '#8B83FF', dark: '#4B44B2' },
  secondary: { main: '#03DAC6' },
  background: { default: '#f6f8fa', paper: '#ffffff' },
  text: { primary: '#24292f', secondary: '#57606a' },
  success: { main: '#1a7f37' },
  warning: { main: '#9a6700' },
  error: { main: '#cf222e' },
  divider: 'rgba(0,0,0,0.08)',
};

export const ThemeContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('idp-theme');
    return (saved as ThemeMode) || 'dark';
  });

  const toggleTheme = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
    localStorage.setItem('idp-theme', newMode);
  };

  const theme = useMemo(() => createTheme({
    palette: mode === 'dark' ? darkPalette : lightPalette,
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      h4: { fontWeight: 700 },
      h6: { fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCard: { styleOverrides: { root: { backgroundImage: 'none', border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}` } } },
      MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    },
  }), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
