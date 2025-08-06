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
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { saveTask, updateTask } from '../firebase';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inProgress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  assignee: string;
  createdAt: string;
  updatedAt: string;
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
        description: editingTask.description,
        status: editingTask.status,
        priority: editingTask.priority,
      });
      setDueDate(new Date(editingTask.dueDate));
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
      });
      setDueDate(new Date());
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
      const taskData: Task = {
        id: isEditing ? editingTask!.id : Date.now().toString(),
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        dueDate: dueDate.toISOString().split('T')[0],
        assignee: user.name || '未設定',
        createdAt: isEditing ? editingTask!.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (isEditing) {
        await updateTask(user.id, taskData.id, taskData);
      } else {
        await saveTask(user.id, taskData);
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

          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <DatePicker
              label="期限日"
              value={dueDate}
              onChange={(newValue) => setDueDate(newValue)}
              sx={{ width: '100%' }}
              disabled={isLoading}
              slots={{
                openPickerIcon: CalendarToday,
              }}
            />
          </LocalizationProvider>

          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              担当者: {user?.name || '未設定'}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
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