import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { id: string; email: string; name: string } | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Mock Authentication Provider for Development Mode.
 *
 * This provider returns hardcoded user data and allows bypassing real authentication
 * for local development and testing purposes. In a production environment, this
 * should be replaced with a real authentication provider (e.g., Auth0, Cognito, custom JWT).
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [user] = useState({ id: '1', email: 'dev@idp.local', name: 'Developer' });

  // Display a warning in the console when this mock provider is used
  useEffect(() => {
    console.warn('⚠️ IDP AuthProvider: Running with mock authentication. User is hardcoded to "Developer".');
  }, []);

  const login = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
