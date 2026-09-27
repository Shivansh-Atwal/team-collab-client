import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY, getToken } from '../api/client.js';

const AuthContext = createContext(null);

const storeToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getToken);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        storeToken(null);
        setToken(null);
      })
      .finally(() => setLoading(false));
    // Only validate the token we started with
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuth = useCallback(({ user: u, token: t }) => {
    storeToken(t);
    setToken(t);
    setUser(u);
  }, []);

  const login = useCallback(async (email, password) => handleAuth((await api.post('/auth/login', { email, password })).data), [handleAuth]);
  const signup = useCallback(
    async (name, email, password) => handleAuth((await api.post('/auth/signup', { name, email, password })).data),
    [handleAuth]
  );
  const logout = useCallback(() => {
    storeToken(null);
    setToken(null);
    setUser(null);
  }, []);
  const updateProfile = useCallback(async (patch) => setUser((await api.patch('/auth/me', patch)).data.user), []);

  const value = useMemo(
    () => ({ user, token, loading, login, signup, logout, updateProfile }),
    [user, token, loading, login, signup, logout, updateProfile]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
