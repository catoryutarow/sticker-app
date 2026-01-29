import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, type User } from '@/api/authApi';
import { AuthContext } from './AuthContext';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初期認証状態チェック
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user } = await authApi.getMe();
        setUser(user);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await authApi.login({ email, password });
    setUser(user);
  }, []);

  const signup = useCallback(async (email: string, password: string, displayName?: string) => {
    const { user } = await authApi.signup({ email, password, displayName });
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { user } = await authApi.getMe();
      setUser(user);
    } catch {
      setUser(null);
    }
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
