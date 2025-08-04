import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Typography, Button } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

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
import { AuthProvider } from './contexts/AuthContext';
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
  const theme = isDarkMode ? darkTheme : lightTheme;

  // デバッグ用のログ
  console.log('AppContent rendered', { sidebarOpen, isDarkMode });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
              <Box
                sx={{
                  flexGrow: 1,
                  pt: '80px',
                  backgroundColor: 'background.default',
                  transition: 'margin-left 0.3s ease-in-out',
                  marginLeft: sidebarOpen ? '240px' : '64px',
                  minHeight: 'calc(100vh - 80px)',
                  overflow: 'auto',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                }}
              >
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/kanban" element={<KanbanBoard />} />
                  <Route path="/calendar" element={<CalendarView />} />
                  <Route path="/timeline" element={<TimelineView />} />
                  <Route path="/list" element={<ListView />} />
                  <Route path="/task/new" element={<TaskForm />} />
                  <Route path="/task/edit/:id" element={<TaskForm />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/login" element={<Login />} />
                </Routes>
              </Box>
            </Box>
          </Box>
        </Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '8px',
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}

function App() {
  console.log('App component rendered');
  
  return (
    <QueryClientProvider client={queryClient}>
      <CustomThemeProvider>
        <AppContent />
      </CustomThemeProvider>
    </QueryClientProvider>
  );
}

export default App; 