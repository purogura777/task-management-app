import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Login: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, register, sendVerification } = useAuth();

  // ログインフォーム
  const [loginForm, setLoginForm] = useState({
    email: 'demo@example.com',
    password: 'password',
  });

  // 登録フォーム
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(loginForm.email, loginForm.password);
      toast.success('ログインしました');
      navigate('/');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'ログインに失敗しました');
      toast.error('ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('パスワードが一致しません');
      setIsLoading(false);
      return;
    }

    try {
      await register(registerForm.name, registerForm.email, registerForm.password);
      toast.success('アカウントを作成しました');
      navigate('/');
    } catch (error) {
      setError(error instanceof Error ? error.message : '登録に失敗しました');
      toast.error('登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="認証タブ">
            <Tab label="ログイン" />
            <Tab label="新規登録" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h5" component="h1" gutterBottom align="center">
            ログイン
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="メールアドレス"
              type="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              margin="normal"
              required
              disabled={isLoading}
            />
            <TextField
              fullWidth
              label="パスワード"
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              margin="normal"
              required
              disabled={isLoading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'ログイン'}
            </Button>
          </Box>

          <Box sx={{ mt: 1 }}>
            <Button size="small" onClick={async () => {
              try {
                setIsLoading(true);
                await sendVerification(loginForm.email, loginForm.password);
                toast.success('確認メールを再送しました');
              } catch (e) {
                toast.error('確認メールの再送に失敗しました');
              } finally { setIsLoading(false); }
            }}>確認メールを再送</Button>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              デモアカウント: demo@example.com / password
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h5" component="h1" gutterBottom align="center">
            新規登録
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleRegister} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="お名前"
              value={registerForm.name}
              onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
              margin="normal"
              required
              disabled={isLoading}
            />
            <TextField
              fullWidth
              label="メールアドレス"
              type="email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              margin="normal"
              required
              disabled={isLoading}
            />
            <TextField
              fullWidth
              label="パスワード"
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              margin="normal"
              required
              disabled={isLoading}
            />
            <TextField
              fullWidth
              label="パスワード（確認）"
              type="password"
              value={registerForm.confirmPassword}
              onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
              margin="normal"
              required
              disabled={isLoading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : '登録'}
            </Button>
            <Typography variant="caption" color="text.secondary">
              登録後、確認メールを送信します。メール内のリンクで認証を完了してください。
            </Typography>
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default Login; 