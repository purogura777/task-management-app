import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Close,
  Assignment,
  Schedule,
  PriorityHigh,
  Person,
  CalendarToday,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { saveTask, updateTask, deleteSeries } from '../firebase';
import { encryptData, sanitizeInput, decryptData } from '../utils/security';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inProgress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  dueAt?: string; // ISO文字列（終日でない場合）
  allDay?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  seriesId?: string; // 繰り返しグループ識別子
  occurrenceIndex?: number; // 何回目か
  startDate?: string;
  startAt?: string;
  startAllDay?: boolean;
  reminderEnabled?: boolean;
  reminderTiming?: '1day' | '3days' | '1week';
  assignee: string;
  createdAt: string;
  updatedAt: string;
  project?: string;
  workspace?: string;
}

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  editingTask?: Task | null;
}

const TaskForm: React.FC<TaskFormProps> = ({ open, onClose, editingTask }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(new Date());
  const [dueDateTime, setDueDateTime] = useState<Date | null>(new Date());
  const [allDay, setAllDay] = useState<boolean>(true);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  // 開始日は常に使用するため、useStartは削除
  const [startAllDay, setStartAllDay] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [startDateTime, setStartDateTime] = useState<Date | null>(new Date());
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [reminderTiming, setReminderTiming] = useState<'1day' | '3days' | '1week'>('1day');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as Task['status'],
    priority: 'medium' as Task['priority'],
  });

  const isEditing = Boolean(editingTask);

  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title,
        description: decryptData(editingTask.description || ''),
        status: editingTask.status,
        priority: editingTask.priority,
      });
      setAllDay(Boolean(editingTask.allDay ?? true));
      setDueDate(new Date(editingTask.dueDate));
      setDueDateTime(editingTask.dueAt ? new Date(editingTask.dueAt) : new Date(editingTask.dueDate + 'T09:00:00'));
      setRecurrence((editingTask.recurrence as any) || 'none');
      // 開始
      const hasStart = Boolean(editingTask.startDate || editingTask.startAt);
      setUseStart(hasStart);
      setStartAllDay(Boolean(editingTask.startAllDay ?? true));
      setStartDate(new Date(editingTask.startDate || editingTask.dueDate));
      setStartDateTime(editingTask.startAt ? new Date(editingTask.startAt) : new Date((editingTask.startDate || editingTask.dueDate) + 'T09:00:00'));
      // リマインダー
      setReminderEnabled(Boolean(editingTask.reminderEnabled ?? true));
      setReminderTiming(editingTask.reminderTiming || '1day');
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
      });
      setDueDate(new Date());
      setDueDateTime(new Date());
      setAllDay(true);
      setRecurrence('none');
      setUseStart(false);
      setStartAllDay(true);
      setStartDate(new Date());
      setStartDateTime(new Date());
      setReminderEnabled(true);
      setReminderTiming('1day');
    }
  }, [editingTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!user) {
      setError('ユーザー情報が見つかりません');
      setIsLoading(false);
      return;
    }

    if (!dueDate) {
      setError('期限日を設定してください');
      setIsLoading(false);
      return;
    }

    try {
      // 現在のワークスペース/プロジェクト情報を取得
      const currentWorkspace = localStorage.getItem('currentWorkspace');
      const currentProject = localStorage.getItem('currentProject');
      const safeTitle = sanitizeInput(formData.title);
      const safeDescription = sanitizeInput(formData.description);
      const encDescription = encryptData(safeDescription);
      
      const baseId = isEditing ? editingTask!.id : Date.now().toString();
      const seriesId = (isEditing && editingTask!.seriesId) ? editingTask!.seriesId : (recurrence !== 'none' ? `series_${Date.now()}` : undefined);
      const baseDueDateISO = dueDate.toISOString().split('T')[0];
      const baseDueAtISO = !allDay && dueDateTime ? dueDateTime.toISOString() : undefined;
      const baseStartDateISO = startDate ? startDate.toISOString().split('T')[0] : undefined;
      const baseStartAtISO = !startAllDay && startDateTime ? startDateTime.toISOString() : undefined;

      const createPayload = (idx: number, d: Date): Task => ({
        id: idx === 0 ? baseId : `${baseId}_${idx}`,
        title: safeTitle,
        description: encDescription,
        status: formData.status,
        priority: formData.priority,
        dueDate: d.toISOString().split('T')[0],
        dueAt: !allDay && dueDateTime ? new Date(d.setHours(dueDateTime.getHours(), dueDateTime.getMinutes(), 0, 0)).toISOString() : undefined,
        allDay,
        recurrence,
        seriesId,
        occurrenceIndex: seriesId ? idx : undefined,
        startDate: baseStartDateISO,
        startAt: baseStartAtISO,
        startAllDay,
        reminderEnabled,
        reminderTiming,
        assignee: user.name || '未設定',
        createdAt: isEditing ? editingTask!.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        workspace: currentWorkspace || '個人プロジェクト',
        project: currentProject || '個人プロジェクト',
      });

      if (!seriesId) {
        const taskData: Task = {
          id: baseId,
          title: safeTitle,
          description: encDescription,
          status: formData.status,
          priority: formData.priority,
          dueDate: baseDueDateISO,
          dueAt: baseDueAtISO,
          allDay,
          startDate: baseStartDateISO,
          startAt: baseStartAtISO,
          startAllDay,
          recurrence: 'none',
          reminderEnabled,
          reminderTiming,
          assignee: user.name || '未設定',
          createdAt: isEditing ? editingTask!.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          workspace: currentWorkspace || '個人プロジェクト',
          project: currentProject || '個人プロジェクト',
        };
        if (isEditing) {
          await updateTask(user.id, taskData.id, taskData);
        } else {
          await saveTask(user.id, taskData);
        }
      } else {
        // 繰り返し: 直近の一定範囲を生成
        const base = new Date(baseDueDateISO + 'T00:00:00');
        const occurrences: Date[] = [new Date(base)];
        const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
        if (recurrence === 'daily') {
          for (let i = 1; i < 30; i++) occurrences.push(addDays(base, i));
        } else if (recurrence === 'weekly') {
          for (let i = 1; i < 12; i++) occurrences.push(addDays(base, i * 7));
        } else if (recurrence === 'monthly') {
          for (let i = 1; i < 12; i++) occurrences.push(new Date(base.getFullYear(), base.getMonth() + i, base.getDate()));
        }
        if (isEditing) {
          // 既存1件は更新、それ以外は追加
          await updateTask(user.id, baseId, createPayload(0, occurrences[0]));
          for (let i = 1; i < occurrences.length; i++) {
            await saveTask(user.id, `${baseId}_${i}`, createPayload(i, occurrences[i]));
          }
        } else {
          for (let i = 0; i < occurrences.length; i++) {
            const t = createPayload(i, occurrences[i]);
            await saveTask(user.id, t);
          }
        }
      }
      
      toast.success(isEditing ? 'タスクを更新しました' : 'タスクを作成しました');
      onClose();
    } catch (error) {
      console.error('タスク保存エラー:', error);
      setError('タスクの保存に失敗しました');
      toast.error('タスクの保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return '#64748b';
      case 'inProgress': return '#6366f1';
      case 'done': return '#10b981';
      default: return '#64748b';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#64748b';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        },
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ 
            bgcolor: 'rgba(255, 255, 255, 0.2)', 
            width: 40, 
            height: 40 
          }}>
            <Assignment />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {isEditing ? 'タスクを編集' : '新しいタスクを作成'}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ color: 'white' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="タスク名"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            margin="normal"
            required
            disabled={isLoading}
            placeholder="タスクのタイトルを入力..."
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="説明"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
            disabled={isLoading}
            placeholder="タスクの詳細を入力..."
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>ステータス</InputLabel>
              <Select
                value={formData.status}
                label="ステータス"
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                disabled={isLoading}
                startAdornment={
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                    <Schedule sx={{ fontSize: 18, color: getStatusColor(formData.status) }} />
                  </Box>
                }
              >
                <MenuItem value="todo">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#64748b' }} />
                    未着手
                  </Box>
                </MenuItem>
                <MenuItem value="inProgress">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#6366f1' }} />
                    進行中
                  </Box>
                </MenuItem>
                <MenuItem value="done">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                    完了
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>優先度</InputLabel>
              <Select
                value={formData.priority}
                label="優先度"
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                disabled={isLoading}
                startAdornment={
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                    <PriorityHigh sx={{ fontSize: 18, color: getPriorityColor(formData.priority) }} />
                  </Box>
                }
              >
                <MenuItem value="low">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                    低
                  </Box>
                </MenuItem>
                <MenuItem value="medium">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                    中
                  </Box>
                </MenuItem>
                <MenuItem value="high">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} />
                    高
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* 開始日時 */}
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                開始日時
              </Typography>
              <FormControlLabel
                control={<Switch checked={startAllDay} onChange={(e)=> setStartAllDay(e.target.checked)} />}
                label="開始を終日に設定"
                sx={{ mb: 1 }}
              />
              
              {startAllDay ? (
                <DatePicker
                  label="開始日"
                  value={startDate}
                  onChange={(v)=> setStartDate(v)}
                  sx={{ width:'100%' }}
                  disabled={isLoading}
                  slots={{ openPickerIcon: CalendarToday }}
                />
              ) : (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <DatePicker
                    label="開始日"
                    value={startDate}
                    onChange={(v)=> { 
                      setStartDate(v); 
                      if (v && startDateTime) {
                        const newDateTime = new Date(v);
                        newDateTime.setHours(startDateTime.getHours(), startDateTime.getMinutes());
                        setStartDateTime(newDateTime);
                      }
                    }}
                    sx={{ flex: 1 }}
                    disabled={isLoading}
                    slots={{ openPickerIcon: CalendarToday }}
                  />
                  <TimePicker
                    label="開始時刻"
                    value={startDateTime}
                    onChange={(v)=> { 
                      setStartDateTime(v);
                      if (v && startDate) {
                        const newDateTime = new Date(startDate);
                        newDateTime.setHours(v.getHours(), v.getMinutes());
                        setStartDateTime(newDateTime);
                      }
                    }}
                    sx={{ flex: 1 }}
                    disabled={isLoading}
                    ampm={false}
                    format="HH:mm"
                  />
                </Box>
              )}
            </Box>
          </LocalizationProvider>

          {/* 終了日時（期限） */}
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                期限日時
              </Typography>
              <FormControlLabel
                control={<Switch checked={allDay} onChange={(e)=> setAllDay(e.target.checked)} />}
                label="期限を終日に設定"
                sx={{ mb: 1 }}
              />
              
              {allDay ? (
                <DatePicker
                  label="期限日"
                  value={dueDate}
                  onChange={(newValue) => setDueDate(newValue)}
                  sx={{ width: '100%' }}
                  disabled={isLoading}
                  slots={{ openPickerIcon: CalendarToday }}
                />
              ) : (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <DatePicker
                    label="期限日"
                    value={dueDate}
                    onChange={(v) => { 
                      setDueDate(v); 
                      if (v && dueDateTime) {
                        const newDateTime = new Date(v);
                        newDateTime.setHours(dueDateTime.getHours(), dueDateTime.getMinutes());
                        setDueDateTime(newDateTime);
                      }
                    }}
                    sx={{ flex: 1 }}
                    disabled={isLoading}
                    slots={{ openPickerIcon: CalendarToday }}
                  />
                  <TimePicker
                    label="期限時刻"
                    value={dueDateTime}
                    onChange={(v) => { 
                      setDueDateTime(v);
                      if (v && dueDate) {
                        const newDateTime = new Date(dueDate);
                        newDateTime.setHours(v.getHours(), v.getMinutes());
                        setDueDateTime(newDateTime);
                      }
                    }}
                    sx={{ flex: 1 }}
                    disabled={isLoading}
                    ampm={false}
                    format="HH:mm"
                  />
                </Box>
              )}
            </Box>
          </LocalizationProvider>

          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>繰り返し</InputLabel>
              <Select
                value={recurrence}
                label="繰り返し"
                onChange={(e)=> setRecurrence(e.target.value as any)}
                disabled={isLoading}
              >
                <MenuItem value="none">なし</MenuItem>
                <MenuItem value="daily">毎日</MenuItem>
                <MenuItem value="weekly">毎週</MenuItem>
                <MenuItem value="monthly">毎月</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* リマインダー設定 */}
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={reminderEnabled} 
                  onChange={(e) => setReminderEnabled(e.target.checked)} 
                  disabled={isLoading}
                />
              }
              label="期限リマインダーを有効にする"
            />
            
            {reminderEnabled && (
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>リマインダーのタイミング</InputLabel>
                <Select
                  value={reminderTiming}
                  label="リマインダーのタイミング"
                  onChange={(e) => setReminderTiming(e.target.value as '1day' | '3days' | '1week')}
                  disabled={isLoading}
                >
                  <MenuItem value="1day">1日前</MenuItem>
                  <MenuItem value="3days">3日前</MenuItem>
                  <MenuItem value="1week">1週間前</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>

          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              担当者: {user?.name || '未設定'}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        {isEditing && (editingTask as any)?.seriesId && (
          <Button
            color="error"
            variant="outlined"
            disabled={isLoading}
            onClick={async ()=>{
              try {
                setIsLoading(true);
                await deleteSeries(user!.id, (editingTask as any).seriesId as any);
                toast.success('シリーズを一括削除しました');
                onClose();
              } catch (e) {
                toast.error('シリーズ削除に失敗しました');
              } finally {
                setIsLoading(false);
              }
            }}
            sx={{ mr: 'auto' }}
          >
            シリーズ一括削除
          </Button>
        )}

        <Button
          onClick={onClose}
          variant="outlined"
          disabled={isLoading}
          sx={{ minWidth: 100 }}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading || !formData.title}
          onClick={handleSubmit}
          sx={{ 
            minWidth: 100,
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
            },
          }}
        >
          {isLoading ? <CircularProgress size={20} /> : (isEditing ? '更新' : '作成')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskForm; 