import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Firebase Authの状態を監視
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setUser({ id: fbUser.uid, name: fbUser.displayName || 'ユーザー', email: fbUser.email || '' });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = cred.user;
      setUser({ id: fbUser.uid, name: fbUser.displayName || 'ユーザー', email: fbUser.email || '' });
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    signOut(auth).catch(() => {});
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        try { await updateProfile(cred.user, { displayName: name }); } catch {}
      }
      const fbUser = cred.user;
      setUser({ id: fbUser.uid, name: name || fbUser.displayName || 'ユーザー', email: fbUser.email || '' });
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    register,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 