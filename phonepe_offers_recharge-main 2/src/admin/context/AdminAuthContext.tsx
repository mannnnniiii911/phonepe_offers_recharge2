import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'owner' | 'manager' | 'viewer';
}

interface AdminAuthContextType {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const TOKEN_KEY = 'admin_session_token';

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check current session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (storedToken) {
          headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const res = await fetch('/api/admin/me', {
          headers,
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
          } else {
            setUser(null);
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
          }
        } else {
          setUser(null);
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
      } catch (err) {
        console.error('Failed to verify admin auth session:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      if (data.success && data.user) {
        setUser(data.user);
        if (data.token) {
          setToken(data.token);
          localStorage.setItem(TOKEN_KEY, data.token);
        }
        return { success: true };
      }

      return { success: false, error: 'Invalid response from server' };
    } catch {
      return { success: false, error: 'Network error or backend unavailable' };
    }
  };

  const logout = async () => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      await fetch('/api/admin/logout', {
        method: 'POST',
        headers,
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
