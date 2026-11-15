import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { storage } from '../services/storage';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loginWithPhone: (phone: string, otp: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  registerUser: (name: string, phone: string, email?: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUserRole: (role: UserRole) => void;
  updateUserProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => storage.getUser());

  const loginWithPhone = async (phone: string, otp: string) => {
    const loggedInUser = await api.verifyOtp(phone, otp);
    setUser(loggedInUser);
    storage.setUser(loggedInUser);
    return loggedInUser;
  };

  const loginWithGoogle = async () => {
    const googleUser = await api.googleSignIn();
    setUser(googleUser);
    storage.setUser(googleUser);
    return googleUser;
  };

  const registerUser = async (name: string, phone: string, email?: string) => {
    const newUser = await api.register(name, phone, email);
    setUser(newUser);
    storage.setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    localStorage.removeItem('extra_diesel_user');
  };

  const updateUserRole = (role: UserRole) => {
    if (!user) return;
    const updated = { ...user, role };
    setUser(updated);
    storage.setUser(updated);
  };

  const updateUserProfile = (data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    storage.setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loginWithPhone,
        loginWithGoogle,
        registerUser,
        logout,
        updateUserRole,
        updateUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
