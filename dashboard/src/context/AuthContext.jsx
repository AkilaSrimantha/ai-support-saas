import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('saas_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        setBot(res.data.bot);
      })
      .catch(() => {
        localStorage.removeItem('saas_token');
        setUser(null);
        setBot(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('saas_token', res.data.token);
    setUser(res.data.user);
    setBot(res.data.bot);
    return res.data;
  };

  const register = async (name, email, password, botName) => {
    const res = await api.post('/auth/register', { name, email, password, botName });
    localStorage.setItem('saas_token', res.data.token);
    setUser(res.data.user);
    setBot(res.data.bot);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('saas_token');
    setUser(null);
    setBot(null);
  };

  const toggleOnline = async (nextOnline) => {
    const res = await api.patch('/auth/status', { is_online: nextOnline });
    setUser((prev) => (prev ? { ...prev, is_online: res.data.is_online ? 1 : 0 } : prev));
    return res.data.is_online;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        bot,
        setBot,
        loading,
        login,
        register,
        logout,
        toggleOnline,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
