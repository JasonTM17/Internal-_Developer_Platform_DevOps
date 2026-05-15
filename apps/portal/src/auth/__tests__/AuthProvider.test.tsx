import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { AuthProvider, useAuth } from '../AuthProvider';

function TestConsumer() {
  const { isAuthenticated, user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{String(isAuthenticated)}</span>
      <span data-testid="user-email">{user?.email ?? 'none'}</span>
      <button onClick={login}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthProvider', () => {
  it('provides initial authenticated state', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId('auth-status')).toHaveTextContent('true');
    expect(screen.getByTestId('user-email')).toHaveTextContent('dev@idp.local');
  });

  it('logout sets isAuthenticated to false', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    act(() => {
      screen.getByText('Logout').click();
    });
    expect(screen.getByTestId('auth-status')).toHaveTextContent('false');
  });

  it('login sets isAuthenticated to true', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    act(() => {
      screen.getByText('Logout').click();
    });
    act(() => {
      screen.getByText('Login').click();
    });
    expect(screen.getByTestId('auth-status')).toHaveTextContent('true');
  });
});
