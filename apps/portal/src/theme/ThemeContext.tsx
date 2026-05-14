import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

type ThemeMode = 'dark' | 'light' | 'system';
type ResolvedMode = 'dark' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  resolvedMode: ResolvedMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  resolvedMode: 'dark',
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

const darkPalette = {
  mode: 'dark' as const,
  primary: { main: '#3B82F6', light: '#60A5FA', dark: '#2563EB' },
  secondary: { main: '#06B6D4', light: '#22D3EE', dark: '#0891B2' },
  background: { default: '#0F172A', paper: '#1E293B' },
  text: { primary: '#F8FAFC', secondary: '#94A3B8' },
  success: { main: '#10B981', light: '#34D399', dark: '#059669' },
  warning: { main: '#F59E0B', light: '#FBBF24', dark: '#D97706' },
  error: { main: '#EF4444', light: '#F87171', dark: '#DC2626' },
  info: { main: '#06B6D4', light: '#22D3EE', dark: '#0891B2' },
  divider: 'rgba(148, 163, 184, 0.12)',
};

const lightPalette = {
  mode: 'light' as const,
  primary: { main: '#3B82F6', light: '#60A5FA', dark: '#2563EB' },
  secondary: { main: '#06B6D4', light: '#22D3EE', dark: '#0891B2' },
  background: { default: '#FAFBFC', paper: '#FFFFFF' },
  text: { primary: '#0F172A', secondary: '#475569' },
  success: { main: '#10B981', light: '#34D399', dark: '#059669' },
  warning: { main: '#F59E0B', light: '#FBBF24', dark: '#D97706' },
  error: { main: '#EF4444', light: '#F87171', dark: '#DC2626' },
  info: { main: '#06B6D4', light: '#22D3EE', dark: '#0891B2' },
  divider: 'rgba(15, 23, 42, 0.08)',
};

function getSystemMode(): ResolvedMode {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const ThemeContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('idp-theme');
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    return 'dark';
  });

  const [systemMode, setSystemMode] = useState<ResolvedMode>(getSystemMode);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemMode(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedMode: ResolvedMode = mode === 'system' ? systemMode : mode;

  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem('idp-theme', newMode);
  };

  const toggleTheme = () => {
    const next: ThemeMode = mode === 'dark' ? 'light' : mode === 'light' ? 'system' : 'dark';
    setThemeMode(next);
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: resolvedMode === 'dark' ? darkPalette : lightPalette,
        typography: {
          fontFamily: '"IBM Plex Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
          h1: { fontFamily: '"Inter", sans-serif', fontWeight: 700 },
          h2: { fontFamily: '"Inter", sans-serif', fontWeight: 700 },
          h3: { fontFamily: '"Inter", sans-serif', fontWeight: 700 },
          h4: { fontFamily: '"Inter", sans-serif', fontWeight: 700 },
          h5: { fontFamily: '"Inter", sans-serif', fontWeight: 600 },
          h6: { fontFamily: '"Inter", sans-serif', fontWeight: 600 },
          subtitle1: { fontWeight: 600 },
          subtitle2: { fontWeight: 600 },
          body1: { fontSize: '0.875rem' },
          body2: { fontSize: '0.8125rem' },
          caption: { fontSize: '0.75rem' },
        },
        shape: { borderRadius: 8 },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                fontFamily:
                  '"IBM Plex Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
              },
              code: { fontFamily: '"JetBrains Mono", "Fira Code", monospace' },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                border: `1px solid ${resolvedMode === 'dark' ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.08)'}`,
              },
            },
          },
          MuiButton: {
            styleOverrides: { root: { textTransform: 'none', fontWeight: 600, borderRadius: 6 } },
          },
          MuiChip: { styleOverrides: { root: { borderRadius: 4, fontWeight: 500 } } },
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderColor:
                  resolvedMode === 'dark' ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.06)',
                padding: '10px 16px',
              },
            },
          },
        },
      }),
    [resolvedMode],
  );

  return (
    <ThemeContext.Provider value={{ mode, resolvedMode, setThemeMode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
