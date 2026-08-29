import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserLoggedIn = async () => {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        const userInfo = JSON.parse(storedUserInfo);
        api.defaults.headers.common['Authorization'] = `Bearer ${userInfo.token}`;
        
        try {
          const { data } = await api.get('/auth/me');
          setUser({ ...data.data, token: userInfo.token });
        } catch (error) {
          console.error("Token invalid or expired");
          logout();
        }
      }
      setLoading(false);
    };

    checkUserLoggedIn();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      
      const userInfo = {
        _id: data.data._id,
        name: data.data.name,
        email: data.data.email,
        role: data.data.role,
        token: data.data.token
      };

      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      api.defaults.headers.common['Authorization'] = `Bearer ${data.data.token}`;
      setUser(userInfo);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
