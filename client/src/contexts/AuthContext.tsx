import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, startDeadlineChecker, stopDeadlineChecker } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';

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
  sendVerification: (email: string, password: string) => Promise<void>;
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
        const userData = { id: fbUser.uid, name: fbUser.displayName || 'ユーザー', email: fbUser.email || '' };
        setUser(userData);
        // ログイン時に期限チェック機能を開始
        startDeadlineChecker(fbUser.uid);
      } else {
        setUser(null);
        // ログアウト時に期限チェック機能を停止
        stopDeadlineChecker();
      }
      setIsLoading(false);
    });
    return () => {
      unsub();
      stopDeadlineChecker();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = cred.user;
      if (!fbUser.emailVerified) {
        try { await sendEmailVerification(fbUser); } catch {}
        await signOut(auth);
        throw new Error('メール認証が未完了です。受信メールのリンクを開いて認証してください。');
      }
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
      try { await sendEmailVerification(cred.user, { url: window.location.origin }); } catch {}
      await signOut(auth);
      // ユーザーにはメール認証を案内
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendVerification = async (email: string, password: string) => {
    // 一時的にサインインして送信→即サインアウト
    const cred = await signInWithEmailAndPassword(auth, email, password);
    try { await sendEmailVerification(cred.user, { url: window.location.origin }); } finally { await signOut(auth); }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    register,
    isLoading,
    sendVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 