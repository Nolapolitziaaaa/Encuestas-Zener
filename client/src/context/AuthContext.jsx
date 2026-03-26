import { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = authService.getStoredUser();
      if (storedUser && authService.isAuthenticated()) {
        try {
          const currentUser = await authService.getMe();
          setUser(currentUser);
        } catch {
          localStorage.clear();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (rut, password) => {
    const loggedUser = await authService.login(rut, password);
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async (token, password) => {
    const registeredUser = await authService.register(token, password);
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateUser = (data) => {
    setUser((prev) => ({ ...prev, ...data }));
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.rol === 'admin',
    isProvider: user?.rol === 'usuario',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
