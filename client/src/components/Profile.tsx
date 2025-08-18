import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Avatar,
  Grid,
  Divider,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  Person,
  Email,
  Phone,
  LocationOn,
  Language,
  GitHub,
  LinkedIn,
  Twitter,
  Notifications,
  Security,
  Palette,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { requestPushPermission } from '../utils/notifications';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  website: string;
  github: string;
  linkedin: string;
  twitter: string;
  notifications: {
    push: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
  };
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    location: '',
    bio: '',
    website: '',
    github: '',
    linkedin: '',
    twitter: '',
    notifications: {
      push: true,
    },
    preferences: {
      language: 'ja',
      timezone: 'Asia/Tokyo',
      dateFormat: 'YYYY/MM/DD',
    },
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSave = () => {
    // プロフィール保存処理
    localStorage.setItem('userProfile', JSON.stringify(profile));
    if (profile.notifications.push) {
      requestPushPermission();
    }
    setIsEditing(false);
    toast.success('プロフィールを更新しました');
  };

  const handleCancel = () => {
    // 元のデータに戻す
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
    setIsEditing(false);
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('新しいパスワードが一致しません');
      return;
    }
    
    // パスワード変更処理（実際の実装ではAPI呼び出し）
    toast.success('パスワードを変更しました');
    setShowPasswordDialog(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
        プロフィール設定
      </Typography>

      <Grid container spacing={3}>
        {/* 基本情報 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                基本情報
              </Typography>
              <Button
                variant={isEditing ? 'outlined' : 'contained'}
                startIcon={isEditing ? <Cancel /> : <Edit />}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'キャンセル' : '編集'}
              </Button>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="名前"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  disabled={!isEditing}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="メールアドレス"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  disabled={!isEditing}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="電話番号"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  disabled={!isEditing}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="所在地"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  disabled={!isEditing}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="自己紹介"
                  multiline
                  rows={4}
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  disabled={!isEditing}
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>

            {isEditing && (
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button variant="contained" onClick={handleSave} startIcon={<Save />}>
                  保存
                </Button>
                <Button variant="outlined" onClick={handleCancel}>
                  キャンセル
                </Button>
              </Box>
            )}
          </Paper>

          {/* ソーシャルリンク */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              ソーシャルリンク
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ウェブサイト"
                  value={profile.website}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  disabled={!isEditing}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="GitHub"
                  value={profile.github}
                  onChange={(e) => setProfile({ ...profile, github: e.target.value })}
                  disabled={!isEditing}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="LinkedIn"
                  value={profile.linkedin}
                  onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                  disabled={!isEditing}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Twitter"
                  value={profile.twitter}
                  onChange={(e) => setProfile({ ...profile, twitter: e.target.value })}
                  disabled={!isEditing}
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* サイドバー */}
        <Grid item xs={12} md={4}>
          {/* アバター */}
          <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 100,
                height: 100,
                mx: 'auto',
                mb: 2,
                bgcolor: 'primary.main',
                fontSize: '2rem',
              }}
            >
              {profile.name.charAt(0)}
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {profile.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {profile.email}
            </Typography>
            {profile.location && (
              <Chip
                icon={<LocationOn />}
                label={profile.location}
                size="small"
                sx={{ mb: 1 }}
              />
            )}
          </Paper>

          {/* 設定 */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              設定
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                通知設定
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={profile.notifications.push}
                    onChange={(e) => setProfile({
                      ...profile,
                      notifications: { ...profile.notifications, push: e.target.checked }
                    })}
                  />
                }
                label="プッシュ通知"
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                表示設定
              </Typography>
              <FormControlLabel
                control={<Switch checked={isDarkMode} onChange={toggleTheme} />}
                label="ダークモード"
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Button
              fullWidth
              variant="outlined"
              startIcon={<Security />}
              onClick={() => setShowPasswordDialog(true)}
              sx={{ mb: 2 }}
            >
              パスワード変更
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<LanguageIcon />}
              sx={{ mb: 2 }}
            >
              言語設定
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* パスワード変更ダイアログ */}
      <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>パスワード変更</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="password"
            label="現在のパスワード"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            type="password"
            label="新しいパスワード"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="password"
            label="新しいパスワード（確認）"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            sx={{ mb: 2 }}
          />
          {passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword && (
            <Alert severity="error" sx={{ mb: 2 }}>
              パスワードが一致しません
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handlePasswordChange}
            disabled={!passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
          >
            変更
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile; 