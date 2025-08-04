import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Typography, Button } from '@mui/material';

// テーマ
import { lightTheme } from './theme';

function App() {
  console.log('App component rendered');
  
  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
          <Box sx={{ flexGrow: 1, p: 3 }}>
            <Typography variant="h3" component="h1" sx={{ mb: 2, color: '#6366f1' }}>
              TaskFlow
            </Typography>
            <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
              タスク管理アプリ - デプロイテスト版
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              このページが表示されていれば、デプロイは成功しています。
            </Typography>
            <Button 
              variant="contained" 
              sx={{ 
                backgroundColor: '#6366f1',
                '&:hover': { backgroundColor: '#4f46e5' }
              }}
            >
              テストボタン
            </Button>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App; 