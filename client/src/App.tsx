import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Typography } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// テーマ
import { lightTheme, darkTheme } from './theme';

// コンポーネント
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import KanbanBoard from './components/KanbanBoard';
import CalendarView from './components/CalendarView';
import TimelineView from './components/TimelineView';
import ListView from './components/ListView';
import TaskForm from './components/TaskForm';
import Settings from './components/Settings';
import Login from './components/Login';
import Profile from './components/Profile';
import PomodoroTimer from './components/PomodoroTimer';
import MindMapView from './components/MindMapView';
import TaskFormPage from './components/TaskFormPage';
import FloatingNotification from './components/FloatingNotification';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { checkDueSoonAndNotify } from './utils/notifications';
import { acceptInvite } from './firebase';
import { ThemeProvider as CustomThemeProvider, useTheme } from './contexts/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    },
  },
});

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isDarkMode } = useTheme();
  const { user, isLoading } = useAuth();

  // デバッグ用のログ
  console.log('AppContent rendered', { sidebarOpen, isDarkMode, user, isLoading });

  // 通知をクリアする関数
  const clearAllToasts = () => {
    toast.dismiss();
  };

  // コンポーネントがマウントされたときに通知をクリア
  useEffect(() => {
    clearAllToasts();
  }, []);

  // 期限リマインダー（60秒ごと）
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      checkDueSoonAndNotify();
    }, 60000);
    return () => clearInterval(id);
  }, [user?.id]);

  // URLクエリから招待・共有プロジェクト選択を処理
  useEffect(() => {
    if (!user) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const invite = params.get('invite');
      const projectId = params.get('projectId');
      if (invite) {
        acceptInvite(invite, user.id)
          .then((projId) => {
            localStorage.setItem('currentProjectSharedId', projId);
            toast.success('共有プロジェクトに参加しました');
          })
          .catch((e) => console.error(e))
          .finally(() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('invite');
            window.history.replaceState({}, '', url.toString());
          });
      } else if (projectId) {
        localStorage.setItem('currentProjectSharedId', projectId);
        toast.success('共有プロジェクトを選択しました');
        const url = new URL(window.location.href);
        url.searchParams.delete('projectId');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {
      console.error('URLパラメータ処理エラー', e);
    }
  }, [user?.id]);

  // ローディング中
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography variant="h6">読み込み中...</Typography>
      </Box>
    );
  }

  // ユーザーがログインしていない場合はログイン画面を表示
  if (!user) {
    return (
      <>
        <Router>
          <Routes>
            <Route path="*" element={<Login />} />
          </Routes>
        </Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '8px',
              maxWidth: '400px',
              zIndex: 9999,
            },
          }}
          containerStyle={{
            top: 20,
            right: 20,
            zIndex: 9999,
          }}
          gutter={8}
          reverseOrder={false}
        />
      </>
    );
  }

  // ログイン済みの場合はメインアプリを表示
  return (
    <>
      <Router>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
            <Box
              component={motion.main}
              sx={{
                flexGrow: 1,
                pt: '80px', // ヘッダーの高さ分のパディング
                backgroundColor: 'background.default',
                transition: 'margin-left 0.3s ease-in-out',
                marginLeft: sidebarOpen ? '240px' : '64px', // サイドバーの幅を調整
                minHeight: 'calc(100vh - 80px)', // ヘッダーの高さを引く
                overflow: 'auto',
                paddingLeft: '24px', // 左側のパディングを追加
                paddingRight: '24px', // 右側のパディングを追加
              }}
            >
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/kanban" element={<KanbanBoard />} />
                  <Route path="/calendar" element={<CalendarView />} />
                  <Route path="/timeline" element={<TimelineView />} />
                  <Route path="/list" element={<ListView />} />
                  <Route path="/pomodoro" element={<PomodoroTimer />} />
                  <Route path="/mindmap" element={<MindMapView />} />
                  <Route path="/task/new" element={<TaskFormPage />} />
                  <Route path="/task/edit/:id" element={<TaskFormPage />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/login" element={<Login />} />
                </Routes>
              </AnimatePresence>
            </Box>
          </Box>
        </Box>
      </Router>
      <FloatingNotification />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '8px',
            maxWidth: '400px',
            zIndex: 9999,
          },
        }}
        containerStyle={{
          top: 20,
          right: 20,
          zIndex: 9999,
        }}
        gutter={8}
        reverseOrder={false}
      />
    </>
  );
}

function App() {
  console.log('App component rendered');
  
  return (
    <QueryClientProvider client={queryClient}>
      <CustomThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </CustomThemeProvider>
    </QueryClientProvider>
  );
}

export default App; 