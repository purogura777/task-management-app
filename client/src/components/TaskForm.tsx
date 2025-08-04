import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inProgress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

const TaskForm: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(new Date());

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as Task['status'],
    priority: 'medium' as Task['priority'],
  });

  const isEditing = Boolean(id);

  useEffect(() => {
    if (isEditing && user) {
      // 既存のタスクを読み込み
      const savedTasks = localStorage.getItem(`tasks_${user.id}`);
      if (savedTasks) {
        const tasks: Task[] = JSON.parse(savedTasks);
        const task = tasks.find(t => t.id === id);
        if (task) {
          setFormData({
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
          });
          setDueDate(new Date(task.dueDate));
        }
      }
    }
  }, [id, user, isEditing]);

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
      const savedTasks = localStorage.getItem(`tasks_${user.id}`);
      const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];

      const taskData: Task = {
        id: isEditing ? id! : Date.now().toString(),
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        dueDate: dueDate.toISOString().split('T')[0],
        createdAt: isEditing ? tasks.find(t => t.id === id)?.createdAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let newTasks: Task[];
      if (isEditing) {
        newTasks = tasks.map(task => task.id === id ? taskData : task);
      } else {
        newTasks = [...tasks, taskData];
      }

      localStorage.setItem(`tasks_${user.id}`, JSON.stringify(newTasks));
      
      toast.success(isEditing ? 'タスクを更新しました' : 'タスクを作成しました');
      navigate('/');
    } catch (error) {
      setError('タスクの保存に失敗しました');
      toast.error('タスクの保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 2 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h5" component="h1" gutterBottom align="center">
          {isEditing ? 'タスクを編集' : '新しいタスクを作成'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="タスク名"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            margin="normal"
            required
            disabled={isLoading}
          />

          <TextField
            fullWidth
            label="説明"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={4}
            disabled={isLoading}
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>ステータス</InputLabel>
              <Select
                value={formData.status}
                label="ステータス"
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                disabled={isLoading}
              >
                <MenuItem value="todo">未着手</MenuItem>
                <MenuItem value="inProgress">進行中</MenuItem>
                <MenuItem value="done">完了</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>優先度</InputLabel>
              <Select
                value={formData.priority}
                label="優先度"
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                disabled={isLoading}
              >
                <MenuItem value="low">低</MenuItem>
                <MenuItem value="medium">中</MenuItem>
                <MenuItem value="high">高</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <DatePicker
              label="期限日"
              value={dueDate}
              onChange={(newValue) => setDueDate(newValue)}
              sx={{ mt: 2, width: '100%' }}
              disabled={isLoading}
            />
          </LocalizationProvider>

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : (isEditing ? '更新' : '作成')}
            </Button>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => navigate('/')}
              disabled={isLoading}
            >
              キャンセル
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default TaskForm; 