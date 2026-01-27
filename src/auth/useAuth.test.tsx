import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from './useAuth';
import { AuthContext, type AuthContextType } from './AuthContext';
import type { ReactNode } from 'react';

describe('useAuth', () => {
  const mockAuthContext: AuthContextType = {
    user: { id: '1', email: 'test@example.com', displayName: 'Test User', role: 'creator' },
    isLoading: false,
    isAuthenticated: true,
    login: async () => {},
    signup: async () => {},
    logout: async () => {},
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={mockAuthContext}>
      {children}
    </AuthContext.Provider>
  );

  it('should return auth context when used within provider', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual(mockAuthContext.user);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('should throw error when used outside provider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('should provide login function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.login).toBe('function');
  });

  it('should provide signup function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.signup).toBe('function');
  });

  it('should provide logout function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.logout).toBe('function');
  });
});
