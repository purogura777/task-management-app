import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  Grid,
  Avatar,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  Timer,
  CheckCircle,
  Warning,
  Settings,
  VolumeUp,
  VolumeOff,
  Schedule,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface PomodoroSettings {
  workDuration: number; // 分
  shortBreakDuration: number; // 分
  longBreakDuration: number; // 分
  longBreakInterval: number; // ポモドーロ数
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inProgress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  assignee: string;
  createdAt: string;
}

const PomodoroTimer: React.FC = () => {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25分を秒で
  const [mode, setMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [settings, setSettings] = useState<PomodoroSettings>({
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    soundEnabled: true,
  });

  // タイマーの実行
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // タイマー完了時の処理
  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    
    if (soundEnabled) {
      playNotificationSound();
    }

    if (mode === 'work') {
      setCompletedPomodoros(prev => prev + 1);
      toast.success('ポモドーロ完了！休憩時間です。');
      
      // 長い休憩か短い休憩かを決定
      const shouldTakeLongBreak = (completedPomodoros + 1) % settings.longBreakInterval === 0;
      const nextMode = shouldTakeLongBreak ? 'longBreak' : 'shortBreak';
      const nextDuration = shouldTakeLongBreak ? settings.longBreakDuration : settings.shortBreakDuration;
      
      setMode(nextMode);
      setTimeLeft(nextDuration * 60);
      
      if (settings.autoStartBreaks) {
        setIsRunning(true);
      }
    } else {
      toast.success('休憩終了！作業を再開しましょう。');
      setMode('work');
      setTimeLeft(settings.workDuration * 60);
      
      if (settings.autoStartPomodoros) {
        setIsRunning(true);
      }
    }
  }, [mode, completedPomodoros, settings, soundEnabled]);

  // 通知音を再生
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {
        // 音声ファイルがない場合は、ブラウザの通知音を使用
        console.log('通知音を再生できませんでした');
      });
    } catch (error) {
      console.log('通知音の再生に失敗しました:', error);
    }
  };

  // タイマー開始
  const startTimer = () => {
    setIsRunning(true);
    toast.success('ポモドーロタイマーを開始しました');
  };

  // タイマー一時停止
  const pauseTimer = () => {
    setIsRunning(false);
    toast.info('タイマーを一時停止しました');
  };

  // タイマー停止
  const stopTimer = () => {
    setIsRunning(false);
    setTimeLeft(settings.workDuration * 60);
    setMode('work');
    toast.info('タイマーを停止しました');
  };

  // タイマーリセット
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(settings.workDuration * 60);
    setMode('work');
    setCompletedPomodoros(0);
    toast.info('タイマーをリセットしました');
  };

  // 時間を分:秒形式で表示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 進捗率を計算
  const getProgress = () => {
    const totalTime = mode === 'work' 
      ? settings.workDuration * 60
      : mode === 'shortBreak' 
        ? settings.shortBreakDuration * 60
        : settings.longBreakDuration * 60;
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  // モードに応じた色を取得
  const getModeColor = () => {
    switch (mode) {
      case 'work': return '#ef4444';
      case 'shortBreak': return '#10b981';
      case 'longBreak': return '#6366f1';
      default: return '#ef4444';
    }
  };

  // モードに応じたラベルを取得
  const getModeLabel = () => {
    switch (mode) {
      case 'work': return '作業時間';
      case 'shortBreak': return '短い休憩';
      case 'longBreak': return '長い休憩';
      default: return '作業時間';
    }
  };

  // 設定を保存
  const saveSettings = () => {
    setSettings(settings);
    setTimeLeft(settings.workDuration * 60);
    setSoundEnabled(settings.soundEnabled);
    setSettingsOpen(false);
    toast.success('設定を保存しました');
  };

  return (
    <Box sx={{ p: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card sx={{ 
          maxWidth: 600, 
          mx: 'auto',
          background: `linear-gradient(135deg, ${getModeColor()} 0%, ${getModeColor()}dd 100%)`,
          color: 'white',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            {/* ヘッダー */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                ポモドーロタイマー
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="音声設定">
                  <IconButton 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    sx={{ color: 'white' }}
                  >
                    {soundEnabled ? <VolumeUp /> : <VolumeOff />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="設定">
                  <IconButton 
                    onClick={() => setSettingsOpen(true)}
                    sx={{ color: 'white' }}
                  >
                    <Settings />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* モード表示 */}
            <Chip
              label={getModeLabel()}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontWeight: 600,
                mb: 2,
              }}
            />

            {/* タイマー表示 */}
            <Typography variant="h1" sx={{ 
              fontWeight: 700, 
              fontSize: '4rem',
              mb: 2,
              fontFamily: 'monospace',
            }}>
              {formatTime(timeLeft)}
            </Typography>

            {/* 進捗バー */}
            <LinearProgress
              variant="determinate"
              value={getProgress()}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'white',
                },
                mb: 3,
              }}
            />

            {/* 完了ポモドーロ数 */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
              <CheckCircle sx={{ mr: 1 }} />
              <Typography variant="h6">
                完了: {completedPomodoros} ポモドーロ
              </Typography>
            </Box>

            {/* コントロールボタン */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
              {!isRunning ? (
                <Button
                  variant="contained"
                  size="large"
                  onClick={startTimer}
                  startIcon={<PlayArrow />}
                  sx={{
                    backgroundColor: 'white',
                    color: getModeColor(),
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    },
                  }}
                >
                  開始
                </Button>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  onClick={pauseTimer}
                  startIcon={<Pause />}
                  sx={{
                    backgroundColor: 'white',
                    color: getModeColor(),
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    },
                  }}
                >
                  一時停止
                </Button>
              )}
              
              <Button
                variant="outlined"
                size="large"
                onClick={stopTimer}
                startIcon={<Stop />}
                sx={{
                  borderColor: 'white',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                停止
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                onClick={resetTimer}
                startIcon={<Refresh />}
                sx={{
                  borderColor: 'white',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                リセット
              </Button>
            </Box>

            {/* 現在のタスク表示 */}
            {currentTask && (
              <Box sx={{ 
                mt: 3, 
                p: 2, 
                backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                borderRadius: 2 
              }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  現在のタスク
                </Typography>
                <Typography variant="body1">
                  {currentTask.title}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 設定ダイアログ */}
      <Dialog 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          borderRadius: '12px 12px 0 0',
          pb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.2)', 
              width: 40, 
              height: 40 
            }}>
              <Settings />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              ポモドーロ設定
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="作業時間（分）"
                type="number"
                value={settings.workDuration}
                onChange={(e) => setSettings({ ...settings, workDuration: parseInt(e.target.value) })}
                variant="outlined"
                InputProps={{
                  startAdornment: <Timer sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="短い休憩時間（分）"
                type="number"
                value={settings.shortBreakDuration}
                onChange={(e) => setSettings({ ...settings, shortBreakDuration: parseInt(e.target.value) })}
                variant="outlined"
                InputProps={{
                  startAdornment: <Schedule sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="長い休憩時間（分）"
                type="number"
                value={settings.longBreakDuration}
                onChange={(e) => setSettings({ ...settings, longBreakDuration: parseInt(e.target.value) })}
                variant="outlined"
                InputProps={{
                  startAdornment: <Schedule sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="長い休憩の間隔（ポモドーロ数）"
                type="number"
                value={settings.longBreakInterval}
                onChange={(e) => setSettings({ ...settings, longBreakInterval: parseInt(e.target.value) })}
                variant="outlined"
                InputProps={{
                  startAdornment: <CheckCircle sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>自動開始設定</InputLabel>
                <Select
                  value={settings.autoStartBreaks ? 'breaks' : settings.autoStartPomodoros ? 'pomodoros' : 'none'}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSettings({
                      ...settings,
                      autoStartBreaks: value === 'breaks',
                      autoStartPomodoros: value === 'pomodoros',
                    });
                  }}
                  label="自動開始設定"
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  <MenuItem value="none">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#64748b' }} />
                      自動開始なし
                    </Box>
                  </MenuItem>
                  <MenuItem value="breaks">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                      休憩を自動開始
                    </Box>
                  </MenuItem>
                  <MenuItem value="pomodoros">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                      ポモドーロを自動開始
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body2">
                  推奨設定: 作業時間25分、短い休憩5分、長い休憩15分、間隔4ポモドーロ
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setSettingsOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            キャンセル
          </Button>
          <Button 
            onClick={saveSettings} 
            variant="contained"
            sx={{ 
              borderRadius: 2, 
              textTransform: 'none', 
              fontWeight: 600,
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              }
            }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PomodoroTimer; 