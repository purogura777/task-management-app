import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    // ローカルストレージからユーザー情報を復元
    const savedUser = localStorage.getItem('taskAppUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('ユーザー情報の復元に失敗しました:', error);
        localStorage.removeItem('taskAppUser');
      }
    }
    // デフォルトでログイン状態にしない（ログイン画面を表示）
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // 簡易的な認証（実際の実装ではAPIを呼び出す）
      if (email === 'demo@example.com' && password === 'password') {
        const userData: User = {
          id: '1',
          name: 'デモユーザー',
          email: email,
        };
        setUser(userData);
        localStorage.setItem('taskAppUser', JSON.stringify(userData));
      } else {
        throw new Error('メールアドレスまたはパスワードが正しくありません');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('taskAppUser');
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      // 簡易的な登録（実際の実装ではAPIを呼び出す）
      const userData: User = {
        id: Date.now().toString(),
        name: name,
        email: email,
      };
      setUser(userData);
      localStorage.setItem('taskAppUser', JSON.stringify(userData));
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