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
  CloudUpload,
  Image,
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
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

  const handleIconFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      toast.error('ファイルサイズは10MB以下にしてください');
      return;
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('対応していないファイル形式です');
      return;
    }

    setSelectedFile(file);
    
    // プレビュー用URLを生成
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleIconUpload = async () => {
    if (!selectedFile || !user) return;

    try {
      // ファイルをbase64に変換
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        
        // ローカルストレージに保存
        localStorage.setItem('customDesktopIcon', dataUrl);
        localStorage.setItem('customDesktopIconType', selectedFile.type);
        localStorage.setItem('customDesktopIconName', selectedFile.name);

        // デスクトップアプリに送信
        try {
          const iconData = {
            type: 'icon_update',
            dataUrl: dataUrl,
            fileType: selectedFile.type,
            fileName: selectedFile.name,
          };

          // Deep linkで送信
          const params = new URLSearchParams({
            action: 'update_icon',
            data: JSON.stringify(iconData)
          });
          const url = `taskapp://icon?${params.toString()}`;
          window.location.href = url;

          // WebSocket経由でも送信（フォールバック）
          if ((window as any).localDesktopBridge) {
            (window as any).localDesktopBridge.send(JSON.stringify(iconData));
          }

          toast.success('アイコンを更新しました');
          
          // ファイル選択をリセット
          setSelectedFile(null);
          setPreviewUrl('');
          
        } catch (error) {
          console.error('アイコン送信エラー:', error);
          toast.error('デスクトップアプリへの送信に失敗しました');
        }
      };
      
      reader.readAsDataURL(selectedFile);
      
    } catch (error) {
      console.error('アイコンアップロードエラー:', error);
      toast.error('アイコンアップロードに失敗しました');
    }
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
                  secondary="期限切れ・期限間近タスクの自動通知（15分間隔でチェック）"
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
            {/* 自動セットアップに統一。WS URL／トークンは不要のため非表示化 */}
            <TextField
              fullWidth
              label="デスクトップアプリ ダウンロードURL"
              placeholder="https://github.com/OWNER/REPO/releases/latest"
              value={downloadUrl}
              onChange={(e) => { setDownloadUrl(e.target.value); localStorage.setItem('desktop_download_url', e.target.value); }}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              {/* 今すぐ設定（WS/トークン）は廃止 */}
              <Button
                variant="outlined"
                onClick={() => {
                  try { localStorage.setItem('enableWebFloating', 'false'); } catch {}
                  toast.success('Webフローティングは無効です。OS常駐をご利用ください');
                }}
              >Webフローティング無効化</Button>
              <Button
                variant="outlined"
                onClick={async () => {
                  try {
                    let url = downloadUrl || localStorage.getItem('desktop_download_url') || '';
                    const headers: any = { 'Accept': 'application/vnd.github+json' };
                    const toName = (a: any) => (a?.name || '').toLowerCase();

                    // releases/latest を直接叩いてアセットを解決
                    if (!url || /releases\/(latest|tag\//.test(url)) || /github\.com\//.test(url)) {
                      const api = 'https://api.github.com/repos/purogura777/task-management-app/releases?per_page=10';
                      const res = await fetch(api, { headers });
                      if (!res.ok) throw new Error('GitHub API エラー');
                      const all: any[] = await res.json();
                      const stable = all.filter(r => !r.draft && !r.prerelease).sort((a, b) => new Date(b.published_at||b.created_at).getTime() - new Date(a.published_at||a.created_at).getTime());
                      const latest = stable[0] || all[0];
                      const assets: any[] = latest?.assets || [];
                      const ua = navigator.userAgent.toLowerCase();
                      const isMac = /mac|iphone|ipad/.test(ua);
                      if (isMac) {
                        const dmgs = assets.filter(a => toName(a).endsWith('.dmg'));
                        const arm = dmgs.find(a => /arm64/.test(toName(a)));
                        const bySize = dmgs.slice().sort((a,b) => (b.size||0)-(a.size||0))[0];
                        url = (arm || bySize || dmgs[0])?.browser_download_url || latest?.html_url;
                      } else {
                        const exes = assets.filter(a => toName(a).endsWith('.exe') && !/(elevate|blockmap)/.test(toName(a)));
                        const prefer = exes.find(a => /(setup|installer)/.test(toName(a)));
                        const bySize = exes.slice().sort((a,b) => (b.size||0)-(a.size||0))[0];
                        url = (prefer || bySize || exes[0])?.browser_download_url || latest?.html_url;
                      }
                    }

                    if (!url) {
                      url = 'https://github.com/purogura777/task-management-app/releases/latest';
                    }

                    // URLを保存して次回から直接ダウンロードを使用
                    localStorage.setItem('desktop_download_url', url);
                    setDownloadUrl(url);

                    // 直接ダウンロードを開く
                    window.open(url, '_blank');
                  } catch (e) {
                    toast.error('ダウンロードURLの解決に失敗しました');
                  }
                }}
              >ダウンロード</Button>
              <Button
                variant="outlined"
                onClick={async () => {
                  const cfg = firebasePublicConfig as any;
                  const uid = user?.id || '';
                  // /app-icon.png が存在すれば優先し、なければ /favicon.ico を送る
                  let icon = window.location.origin + '/app-icon.png';
                  try {
                    const head = await fetch(icon, { method: 'HEAD' });
                    if (!head.ok) icon = window.location.origin + '/favicon.ico';
                  } catch {
                    icon = window.location.origin + '/favicon.ico';
                  }
                  const parts = new URLSearchParams({ apiKey: cfg.apiKey, authDomain: cfg.authDomain, projectId: cfg.projectId, uid, icon });
                  const url = `taskapp://bootstrap?${parts.toString()}`;
                  try { window.location.href = url; toast.success('デスクトップへ設定を送信しました'); } catch { toast.error('起動に失敗しました'); }
                  // ローカルブリッジ接続を促進
                  try { setTimeout(() => { (window as any).dispatchEvent(new Event('connectLocalDesktopBridge')); }, 500); } catch {}
                }}
              >デスクトップを自動セットアップ</Button>
              <Button
                variant="outlined"
                onClick={async () => {
                  try {
                    const headers: any = { 'Accept': 'application/vnd.github+json' };
                    // 直近の安定版を公開日でソートして取得
                    const res = await fetch('https://api.github.com/repos/purogura777/task-management-app/releases?per_page=20', { headers });
                    if (!res.ok) throw new Error('GitHub API エラー');
                    const all: any[] = await res.json();
                    if (!Array.isArray(all) || all.length === 0) { toast.error('リリースが見つかりません'); return; }
                    const stable = all.filter(r => !r.draft && !r.prerelease).sort((a, b) => new Date(b.published_at||b.created_at).getTime() - new Date(a.published_at||a.created_at).getTime());
                    const latest = stable[0] || all.sort((a, b) => new Date(b.published_at||b.created_at).getTime() - new Date(a.published_at||a.created_at).getTime())[0];
                    const assets: any[] = (latest?.assets || []);
                    const ua = navigator.userAgent.toLowerCase();
                    const isMac = /mac|iphone|ipad/.test(ua);
                    const isArm64 = /arm|aarch64|applewebkit.*(arm)/.test(ua) || /apple silicon|arm64/.test(ua);
                    const toName = (a: any) => (a?.name || '').toLowerCase();
                    let url: string | undefined;
                    if (isMac) {
                      const dmgs = assets.filter(a => toName(a).endsWith('.dmg'));
                      const arm = dmgs.find(a => /arm64/.test(toName(a)));
                      const bySize = dmgs.slice().sort((a,b) => (b.size||0)-(a.size||0))[0];
                      url = (arm || bySize || dmgs[0])?.browser_download_url;
                    } else {
                      const exes = assets.filter(a => toName(a).endsWith('.exe') && !/(elevate|blockmap)/.test(toName(a)));
                      const prefer = exes.find(a => /(setup|installer)/.test(toName(a)));
                      const bySize = exes.slice().sort((a,b) => (b.size||0)-(a.size||0))[0];
                      url = (prefer || bySize || exes[0])?.browser_download_url;
                    }
                    // 最後の手段としてリリースページURL
                    if (!url) url = latest?.html_url;
                    if (!url) { toast.error('取得できるダウンロードURLがありません'); return; }
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

        {/* デスクトップアイコンカスタマイズ */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                デスクトップアイコンカスタマイズ
              </Typography>
              <Image color="primary" />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              デスクトップアプリのフローティングアイコンを自由にカスタマイズできます。
              画像、動画、GIFファイルに対応しています。
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                accept="image/*,video/*,.gif"
                style={{ display: 'none' }}
                id="icon-upload-button"
                type="file"
                onChange={handleIconFileSelect}
              />
              <label htmlFor="icon-upload-button">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUpload />}
                  disabled={!isEditing}
                >
                  ファイルを選択
                </Button>
              </label>

              {selectedFile && (
                <Chip
                  label={`${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`}
                  onDelete={() => {
                    setSelectedFile(null);
                    setPreviewUrl('');
                  }}
                  disabled={!isEditing}
                />
              )}

              <Button
                variant="contained"
                onClick={handleIconUpload}
                disabled={!selectedFile || !isEditing}
                startIcon={<Save />}
              >
                アイコンを更新
              </Button>
            </Box>

            {previewUrl && (
              <Box sx={{ mt: 2, maxWidth: 200 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>プレビュー:</Typography>
                {selectedFile?.type.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt="アイコンプレビュー"
                    style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '8px' }}
                  />
                ) : selectedFile?.type.startsWith('video/') ? (
                  <video
                    src={previewUrl}
                    controls
                    style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '8px' }}
                  />
                ) : null}
              </Box>
            )}
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