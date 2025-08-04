import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Notifications,
  Security,
  Palette,
  Language,
  Storage,
  Delete,
  Save,
  Cancel,
  Edit,
  Warning,
  Info,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Settings {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    taskReminders: boolean;
    deadlineAlerts: boolean;
    teamUpdates: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
  };
  privacy: {
    profileVisible: boolean;
    showEmail: boolean;
    showPhone: boolean;
    allowAnalytics: boolean;
  };
  data: {
    autoBackup: boolean;
    backupFrequency: string;
    retentionPeriod: string;
  };
}

const Settings: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    notifications: {
      email: true,
      push: true,
      sms: false,
      taskReminders: true,
      deadlineAlerts: true,
      teamUpdates: true,
    },
    appearance: {
      theme: 'auto',
      language: 'ja',
      timezone: 'Asia/Tokyo',
      dateFormat: 'YYYY/MM/DD',
      timeFormat: '24h',
    },
    privacy: {
      profileVisible: true,
      showEmail: false,
      showPhone: false,
      allowAnalytics: true,
    },
    data: {
      autoBackup: true,
      backupFrequency: 'daily',
      retentionPeriod: '30days',
    },
  });

  const handleSave = () => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
    setIsEditing(false);
    toast.success('設定を保存しました');
  };

  const handleCancel = () => {
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    setIsEditing(false);
  };

  const handleDeleteData = () => {
    // データ削除処理
    localStorage.clear();
    toast.success('すべてのデータを削除しました');
    setShowDeleteDialog(false);
    window.location.reload();
  };

  const getStorageInfo = () => {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const userProfile = localStorage.getItem('userProfile');
    const userSettings = localStorage.getItem('userSettings');
    
    const tasksSize = new Blob([JSON.stringify(tasks)]).size;
    const profileSize = userProfile ? new Blob([userProfile]).size : 0;
    const settingsSize = userSettings ? new Blob([userSettings]).size : 0;
    
    return {
      tasks: tasksSize,
      profile: profileSize,
      settings: settingsSize,
      total: tasksSize + profileSize + settingsSize,
    };
  };

  const storageInfo = getStorageInfo();

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
        設定
      </Typography>

      <Grid container spacing={3}>
        {/* 通知設定 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                通知設定
              </Typography>
              <Notifications color="primary" />
            </Box>

            <List>
              <ListItem>
                <ListItemIcon>
                  <Info color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="メール通知"
                  secondary="重要な更新をメールで受け取る"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.notifications.email}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, email: e.target.checked }
                    })}
                    disabled={!isEditing}
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="プッシュ通知"
                  secondary="ブラウザでプッシュ通知を受け取る"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.notifications.push}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, push: e.target.checked }
                    })}
                    disabled={!isEditing}
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Warning color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="タスクリマインダー"
                  secondary="期限が近づいたタスクの通知"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.notifications.taskReminders}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, taskReminders: e.target.checked }
                    })}
                    disabled={!isEditing}
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Error color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="期限アラート"
                  secondary="期限切れタスクの警告"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.notifications.deadlineAlerts}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, deadlineAlerts: e.target.checked }
                    })}
                    disabled={!isEditing}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* 表示設定 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                表示設定
              </Typography>
              <Palette color="primary" />
            </Box>

            <List>
              <ListItem>
                <ListItemIcon>
                  <Palette color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="ダークモード"
                  secondary="ダークテーマを使用"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={isDarkMode}
                    onChange={toggleTheme}
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Language color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="言語"
                  secondary="日本語"
                />
                <ListItemSecondaryAction>
                  <Chip label="日本語" size="small" />
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Info color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="タイムゾーン"
                  secondary="Asia/Tokyo"
                />
                <ListItemSecondaryAction>
                  <Chip label="JST" size="small" />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* プライバシー設定 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                プライバシー設定
              </Typography>
              <Security color="primary" />
            </Box>

            <List>
              <ListItem>
                <ListItemIcon>
                  <Info color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="プロフィール公開"
                  secondary="他のユーザーにプロフィールを表示"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.privacy.profileVisible}
                    onChange={(e) => setSettings({
                      ...settings,
                      privacy: { ...settings.privacy, profileVisible: e.target.checked }
                    })}
                    disabled={!isEditing}
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Info color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="メールアドレス表示"
                  secondary="プロフィールでメールアドレスを表示"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.privacy.showEmail}
                    onChange={(e) => setSettings({
                      ...settings,
                      privacy: { ...settings.privacy, showEmail: e.target.checked }
                    })}
                    disabled={!isEditing}
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Info color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="分析データ送信"
                  secondary="使用状況の分析データを送信"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.privacy.allowAnalytics}
                    onChange={(e) => setSettings({
                      ...settings,
                      privacy: { ...settings.privacy, allowAnalytics: e.target.checked }
                    })}
                    disabled={!isEditing}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* データ管理 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                データ管理
              </Typography>
              <Storage color="primary" />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                ストレージ使用量
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">タスクデータ</Typography>
                <Typography variant="body2">{(storageInfo.tasks / 1024).toFixed(2)} KB</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">プロフィール</Typography>
                <Typography variant="body2">{(storageInfo.profile / 1024).toFixed(2)} KB</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">設定</Typography>
                <Typography variant="body2">{(storageInfo.settings / 1024).toFixed(2)} KB</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Typography variant="subtitle2">合計</Typography>
                <Typography variant="subtitle2">{(storageInfo.total / 1024).toFixed(2)} KB</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setShowDeleteDialog(true)}
                fullWidth
              >
                データを削除
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 編集ボタン */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        {isEditing ? (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={handleCancel} startIcon={<Cancel />}>
              キャンセル
            </Button>
            <Button variant="contained" onClick={handleSave} startIcon={<Save />}>
              保存
            </Button>
          </Box>
        ) : (
          <Button variant="contained" onClick={() => setIsEditing(true)} startIcon={<Edit />}>
            編集
          </Button>
        )}
      </Box>

      {/* データ削除ダイアログ */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>データ削除の確認</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            この操作は元に戻すことができません。すべてのデータが削除されます。
          </Alert>
          <Typography variant="body2" color="text.secondary">
            削除されるデータ：
          </Typography>
          <ul>
            <li>すべてのタスク</li>
            <li>プロフィール情報</li>
            <li>設定</li>
            <li>その他のアプリデータ</li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteData}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings; 