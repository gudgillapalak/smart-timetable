import { createContext, useContext, useState } from 'react';
import { api } from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const login = async (username, password) => {
    const { token, user } = await api('/auth/login', { method: 'POST', body: { username, password } });
    localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); setUser(user);
    return user;
  };
  const logout = () => { localStorage.clear(); setUser(null); };
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
