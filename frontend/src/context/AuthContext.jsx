import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        const parsed = JSON.parse(storedUserInfo);
        if (parsed?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`;
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error parsing stored userInfo:', e);
      localStorage.removeItem('userInfo');
    }
    return null;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const verifyUser = async () => {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        try {
          const parsed = JSON.parse(storedUserInfo);
          if (parsed?.token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`;
            const { data } = await api.get('/auth/me');
            setUser({ ...data.data, token: parsed.token });
          }
        } catch (error) {
          if (error.response?.status === 401) {
            console.error("Session expired or token invalid");
            logout();
          } else {
            console.warn("Could not verify auth with server, keeping cached session:", error.message);
          }
        }
      }
    };

    verifyUser();
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
      {loading ? (
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-semibold text-gray-600">Loading Hamdan Traders...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
