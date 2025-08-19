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
import { Button, TextField } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { firebasePublicConfig } from '../firebase';

interface Settings {
  notifications: {
    push: boolean;
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
      push: true,
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
  // デスクトップDL URLはローカルstateで管理して即時反映
  const [downloadUrl, setDownloadUrl] = useState<string>(localStorage.getItem('desktop_download_url') || '');
  const { user } = useAuth();

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

        {/* デスクトップ連携 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                デスクトップ連携
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              トレイ常駐のフローティング通知をOS上に表示します。初回はデスクトップアプリをインストールし、以下の「今すぐ設定」でWebとペアリングしてください。
            </Typography>
            <TextField
              fullWidth
              label="WebSocketサーバーURL"
              placeholder="wss://your-realtime.example/ws"
              value={localStorage.getItem('desktop_ws_url') || ''}
              onChange={(e) => localStorage.setItem('desktop_ws_url', e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="ペアリングトークン"
              placeholder="任意のユーザー固有トークン"
              value={localStorage.getItem('desktop_pair_token') || ''}
              onChange={(e) => localStorage.setItem('desktop_pair_token', e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="デスクトップアプリ ダウンロードURL"
              placeholder="https://github.com/OWNER/REPO/releases/latest"
              value={downloadUrl}
              onChange={(e) => { setDownloadUrl(e.target.value); localStorage.setItem('desktop_download_url', e.target.value); }}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={() => {
                  const ws = localStorage.getItem('desktop_ws_url') || '';
                  const token = localStorage.getItem('desktop_pair_token') || '';
                  if (!ws || !token) { toast.error('WS URLとトークンを入力してください'); return; }
                  const url = `taskapp://set?ws=${encodeURIComponent(ws)}&token=${encodeURIComponent(token)}`;
                  try { window.location.href = url; } catch {}
                  toast.success('デスクトップに設定を送信しました');
                }}
              >今すぐ設定</Button>
              <Button
                variant="outlined"
                onClick={() => {
                  try { localStorage.setItem('enableWebFloating', 'false'); } catch {}
                  toast.success('Webフローティングは無効です。OS常駐をご利用ください');
                }}
              >Webフローティング無効化</Button>
              <Button
                variant="outlined"
                onClick={() => {
                  const url = downloadUrl || localStorage.getItem('desktop_download_url') || 'https://github.com/OWNER/REPO/releases/latest';
                  window.open(url, '_blank');
                }}
              >ダウンロード</Button>
              <Button
                variant="outlined"
                onClick={() => {
                  const cfg = firebasePublicConfig as any;
                  const uid = user?.id || '';
                  const parts = new URLSearchParams({ apiKey: cfg.apiKey, authDomain: cfg.authDomain, projectId: cfg.projectId, uid });
                  const url = `taskapp://bootstrap?${parts.toString()}`;
                  try { window.location.href = url; toast.success('デスクトップへ設定を送信しました'); } catch { toast.error('起動に失敗しました'); }
                }}
              >デスクトップを自動セットアップ</Button>
              <Button
                variant="outlined"
                onClick={async () => {
                  try {
                    // GitHub最新リリースからOSに応じたアセットURLを取得
                    const res = await fetch('https://api.github.com/repos/purogura777/task-management-app/releases/latest');
                    if (!res.ok) throw new Error('GitHub API エラー');
                    const data = await res.json();
                    const assets: any[] = data.assets || [];
                    const ua = navigator.userAgent.toLowerCase();
                    const isMac = /mac|iphone|ipad/.test(ua);
                    const isArm64 = /arm|aarch64|applewebkit.*(arm)/.test(ua) || /apple silicon|arm64/.test(ua);
                    const toName = (a: any) => (a?.name || '').toLowerCase();
                    let url: string | undefined;
                    if (isMac) {
                      // .dmgを優先、arm64があれば優先
                      const dmgs = assets.filter(a => toName(a).endsWith('.dmg'));
                      const arm = dmgs.find(a => /arm64/.test(toName(a)));
                      url = (arm || dmgs[0])?.browser_download_url;
                    } else {
                      // Windows: Setup/Installer を優先。elevate.exeなどは除外
                      const exes = assets.filter(a => toName(a).endsWith('.exe'));
                      const setup = exes.find(a => /(setup|installer)/.test(toName(a)));
                      const fallback = exes.find(a => !/(elevate|blockmap)/.test(toName(a)));
                      url = (setup || fallback)?.browser_download_url;
                    }
                    if (!url) { toast.error('最新リリースに対応アセットが見つかりません'); return; }
                    localStorage.setItem('desktop_download_url', url);
                    setDownloadUrl(url);
                    toast.success('最新リリースURLを設定しました');
                  } catch (e) {
                    toast.error('最新リリースURLの取得に失敗しました');
                  }
                }}
              >最新リリースURLを自動取得</Button>
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