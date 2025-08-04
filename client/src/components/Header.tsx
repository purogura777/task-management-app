import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Badge,
  Tooltip,
  Switch,
  FormControlLabel,
  Divider,
  ListItemIcon,
  ListItemText,
  Fab,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications,
  AccountCircle,
  Settings,
  Logout,
  Person,
  DarkMode,
  LightMode,
  Search,
  Add,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setNotificationAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/login');
  };

  const handleProfileClick = () => {
    navigate('/profile');
    handleMenuClose();
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    handleMenuClose();
  };

  const notifications = [
    {
      id: 1,
      title: '新しいタスクが割り当てられました',
      message: 'プロジェクトAのタスク「UIデザインの改善」が割り当てられました',
      time: '5分前',
      read: false,
    },
    {
      id: 2,
      title: 'タスクの期限が近づいています',
      message: '「データベース設計」の期限が明日です',
      time: '1時間前',
      read: false,
    },
    {
      id: 3,
      title: 'チームメンバーが参加しました',
      message: '田中さんがプロジェクトBに参加しました',
      time: '2時間前',
      read: true,
    },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!user) {
    return null;
  }

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#ffffff',
        color: '#1a1a1a',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        borderBottom: '1px solid #e9ecef',
      }}
    >
      <Toolbar sx={{ minHeight: '64px !important' }}>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={onMenuClick}
          sx={{ 
            mr: 2,
            color: '#6c757d',
            '&:hover': {
              backgroundColor: '#f8f9fa',
            },
          }}
        >
          <MenuIcon />
        </IconButton>

        <Typography
          variant="h5"
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: 700,
            color: '#6366f1',
            cursor: 'pointer',
            fontSize: '1.5rem',
          }}
          onClick={() => navigate('/')}
        >
          TaskFlow
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* 検索ボタン */}
          <Tooltip title="検索">
            <IconButton 
              color="inherit"
              sx={{
                color: '#6c757d',
                '&:hover': {
                  backgroundColor: '#f8f9fa',
                },
              }}
            >
              <Search />
            </IconButton>
          </Tooltip>

          {/* 新しいタスクボタン */}
          <Tooltip title="新しいタスク">
            <Fab
              size="small"
              onClick={() => navigate('/task/new')}
              sx={{
                backgroundColor: '#6366f1',
                color: 'white',
                width: 36,
                height: 36,
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                '&:hover': {
                  backgroundColor: '#4f46e5',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                },
              }}
            >
              <Add sx={{ fontSize: 18 }} />
            </Fab>
          </Tooltip>

          {/* 通知 */}
          <Tooltip title="通知">
            <IconButton
              color="inherit"
              onClick={handleNotificationMenuOpen}
              sx={{
                color: '#6c757d',
                '&:hover': {
                  backgroundColor: '#f8f9fa',
                },
              }}
            >
              <Badge 
                badgeContent={unreadCount} 
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: '#dc3545',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  },
                }}
              >
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* テーマ切り替え */}
          <Tooltip title={isDarkMode ? 'ライトモード' : 'ダークモード'}>
            <IconButton
              color="inherit"
              onClick={toggleTheme}
              sx={{
                color: '#6c757d',
                '&:hover': {
                  backgroundColor: '#f8f9fa',
                },
              }}
            >
              {isDarkMode ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>

          {/* ユーザーメニュー */}
          <Tooltip title="アカウント">
            <IconButton
              color="inherit"
              onClick={handleProfileMenuOpen}
              sx={{
                color: '#6c757d',
                '&:hover': {
                  backgroundColor: '#f8f9fa',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#6366f1',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {user.name.charAt(0)}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* 通知メニュー */}
        <Menu
          anchorEl={notificationAnchorEl}
          open={Boolean(notificationAnchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              width: 360,
              maxHeight: 400,
              borderRadius: 2,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              border: '1px solid #e9ecef',
            },
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
              通知
            </Typography>
          </Box>
          {notifications.map((notification) => (
            <MenuItem
              key={notification.id}
              sx={{
                py: 1.5,
                px: 2,
                backgroundColor: notification.read ? 'transparent' : '#f8f9fa',
                '&:hover': {
                  backgroundColor: '#f8f9fa',
                },
              }}
            >
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, color: '#1a1a1a' }}>
                  {notification.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                  {notification.message}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {notification.time}
                </Typography>
              </Box>
            </MenuItem>
          ))}
          {notifications.length === 0 && (
            <MenuItem>
              <Typography variant="body2" color="text.secondary">
                通知はありません
              </Typography>
            </MenuItem>
          )}
        </Menu>

        {/* ユーザーメニュー */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              width: 240,
              borderRadius: 2,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              border: '1px solid #e9ecef',
            },
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: '#6366f1',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                }}
              >
                {user.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                  {user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
            </Box>
          </Box>

          <MenuItem onClick={handleProfileClick} sx={{ py: 1.5 }}>
            <ListItemIcon>
              <Person fontSize="small" sx={{ color: '#6c757d' }} />
            </ListItemIcon>
            <ListItemText 
              primary="プロフィール" 
              primaryTypographyProps={{ 
                sx: { fontWeight: 500, color: '#1a1a1a' } 
              }} 
            />
          </MenuItem>

          <MenuItem onClick={handleSettingsClick} sx={{ py: 1.5 }}>
            <ListItemIcon>
              <Settings fontSize="small" sx={{ color: '#6c757d' }} />
            </ListItemIcon>
            <ListItemText 
              primary="設定" 
              primaryTypographyProps={{ 
                sx: { fontWeight: 500, color: '#1a1a1a' } 
              }} 
            />
          </MenuItem>

          <Divider />

          <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
            <ListItemIcon>
              <Logout fontSize="small" sx={{ color: '#dc3545' }} />
            </ListItemIcon>
            <ListItemText 
              primary="ログアウト" 
              primaryTypographyProps={{ 
                sx: { fontWeight: 500, color: '#dc3545' } 
              }} 
            />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 