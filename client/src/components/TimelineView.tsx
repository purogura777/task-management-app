import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Timeline,
  Schedule,
  CheckCircle,
  Warning,
  Person,
  CalendarToday,
  PriorityHigh,
  Assignment,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format, addDays, differenceInDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { setupRealtimeListener, saveTask, updateTask, deleteTask } from '../firebase';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inProgress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  assignee: string;
  createdAt: string;
  startDate?: string;
  endDate?: string;
}

const TimelineView: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  useEffect(() => {
    if (!user?.id) return;

    // Firebaseのリアルタイムリスナーを設定
    const unsubscribe = setupRealtimeListener(user.id, (firebaseTasks) => {
      // 開始日と終了日を設定（デモ用）
      const tasksWithDates = firebaseTasks.map((task: Task, index: number) => ({
        ...task,
        startDate: task.startDate || format(addDays(new Date(), index * 2), 'yyyy-MM-dd'),
        endDate: task.endDate || format(addDays(new Date(), index * 2 + 1), 'yyyy-MM-dd'),
      }));
      setTasks(tasksWithDates);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // フィルタリングイベントの監視
  useEffect(() => {
    const handleFilterChange = (event: CustomEvent) => {
      const { type, value, filteredTasks } = event.detail;
      console.log('TimelineView: フィルタ変更を検知:', type, value, filteredTasks);
      
      // フィルタリングされたタスクを設定
      if (filteredTasks) {
        const tasksWithDates = filteredTasks.map((task: Task, index: number) => ({
          ...task,
          startDate: task.startDate || format(addDays(new Date(), index * 2), 'yyyy-MM-dd'),
          endDate: task.endDate || format(addDays(new Date(), index * 2 + 1), 'yyyy-MM-dd'),
        }));
        setTasks(tasksWithDates);
        // フィルタリング状態を永続化
        localStorage.setItem('timeline_filtered_tasks', JSON.stringify(tasksWithDates));
        localStorage.setItem('timeline_filter_type', type);
        localStorage.setItem('timeline_filter_value', value);
      }
    };

    window.addEventListener('filterChanged', handleFilterChange as EventListener);
    
    // コンポーネントマウント時に保存されたフィルタリング状態を復元
    const savedFilteredTasks = localStorage.getItem('timeline_filtered_tasks');
    const savedFilterType = localStorage.getItem('timeline_filter_type');
    const savedFilterValue = localStorage.getItem('timeline_filter_value');
    
    if (savedFilteredTasks && savedFilterType && savedFilterValue) {
      try {
        const parsedTasks = JSON.parse(savedFilteredTasks);
        setTasks(parsedTasks);
        console.log('TimelineView: 保存されたフィルタリング状態を復元:', savedFilterType, savedFilterValue);
      } catch (error) {
        console.error('TimelineView: フィルタリング状態の復元に失敗:', error);
      }
    }
    
    return () => {
      window.removeEventListener('filterChanged', handleFilterChange as EventListener);
    };
  }, []);

  const getTimelineRange = () => {
    const today = new Date();
    const startDate = viewMode === 'week' 
      ? startOfDay(today)
      : startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    
    const endDate = viewMode === 'week'
      ? addDays(today, 7)
      : new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return { startDate, endDate };
  };

  const getTimelineDays = () => {
    const { startDate, endDate } = getTimelineRange();
    const days = [];
    let currentDate = startDate;

    while (isBefore(currentDate, endDate) || currentDate.getTime() === endDate.getTime()) {
      days.push(currentDate);
      currentDate = addDays(currentDate, 1);
    }

    return days;
  };

  const getTaskPosition = (task: Task) => {
    const { startDate } = getTimelineRange();
    const taskStart = new Date(task.startDate || task.dueDate);
    const daysFromStart = differenceInDays(taskStart, startDate);
    const taskDuration = differenceInDays(
      new Date(task.endDate || task.dueDate),
      new Date(task.startDate || task.dueDate)
    ) + 1;

    return {
      left: `${(daysFromStart / getTimelineDays().length) * 100}%`,
      width: `${(taskDuration / getTimelineDays().length) * 100}%`,
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return '#6b7280';
      case 'inProgress': return '#3b82f6';
      case 'done': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return priority;
    }
  };

  const handleSaveTask = async () => {
    if (!editingTask || !user?.id) return;

    try {
      if (editingTask.id && editingTask.title) {
        if (editingTask.id.includes('temp')) {
          // 新しいタスクの場合
          const newTask = {
            ...editingTask,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await saveTask(user.id, newTask);
        } else {
          // 既存タスクの更新
          await updateTask(user.id, editingTask.id, editingTask);
        }
      }
      setDialogOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error('タスクの保存に失敗しました:', error);
    }
  };

  const handleDeleteTask = async () => {
    if (!editingTask || !user?.id) return;

    try {
      await deleteTask(user.id, editingTask.id);
      setDialogOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error('タスクの削除に失敗しました:', error);
    }
  };

  const timelineDays = getTimelineDays();

  return (
    <Box sx={{ p: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            タイムライン
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant={viewMode === 'week' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('week')}
            >
              週表示
            </Button>
            <Button
              variant={viewMode === 'month' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('month')}
            >
              月表示
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                const newTask: Task = {
                  id: Date.now().toString(),
                  title: '',
                  description: '',
                  status: 'todo',
                  priority: 'medium',
                  dueDate: format(new Date(), 'yyyy-MM-dd'),
                  assignee: '',
                  createdAt: new Date().toISOString(),
                  startDate: format(new Date(), 'yyyy-MM-dd'),
                  endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
                };
                setEditingTask(newTask);
                setDialogOpen(true);
              }}
            >
              新しいタスク
            </Button>
          </Box>
        </Box>

        <Card>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                プロジェクトタイムライン
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  icon={<Timeline />}
                  label="未着手"
                  size="small"
                  sx={{ bgcolor: '#6b7280', color: 'white' }}
                />
                <Chip
                  icon={<Schedule />}
                  label="進行中"
                  size="small"
                  sx={{ bgcolor: '#3b82f6', color: 'white' }}
                />
                <Chip
                  icon={<CheckCircle />}
                  label="完了"
                  size="small"
                  sx={{ bgcolor: '#10b981', color: 'white' }}
                />
              </Box>
            </Box>

            {/* タイムライン */}
            <Box sx={{ p: 2 }}>
              {/* 日付ヘッダー */}
              <Box sx={{ display: 'flex', mb: 2 }}>
                <Box sx={{ width: 200, flexShrink: 0 }} />
                {timelineDays.map((day, index) => (
                  <Box
                    key={index}
                    sx={{
                      flex: 1,
                      textAlign: 'center',
                      borderRight: index < timelineDays.length - 1 ? 1 : 0,
                      borderColor: 'divider',
                      py: 1,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {format(day, 'M/d', { locale: ja })}
                    </Typography>
                    <Typography variant="caption" display="block">
                      {format(day, 'EEE', { locale: ja })}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* タスクタイムライン */}
              <Box sx={{ position: 'relative' }}>
                {tasks.map((task, index) => {
                  const position = getTaskPosition(task);
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      style={{
                        position: 'absolute',
                        left: position.left,
                        width: position.width,
                        top: `${index * 60}px`,
                        height: '40px',
                      }}
                    >
                      <Card
                        sx={{
                          height: '100%',
                          backgroundColor: getStatusColor(task.status),
                          color: 'white',
                          cursor: 'pointer',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            boxShadow: 2,
                          },
                        }}
                        onClick={() => {
                          setSelectedTask(task);
                          setEditingTask(task);
                          setDialogOpen(true);
                        }}
                      >
                        <CardContent sx={{ p: 1, height: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                            <Avatar
                              sx={{
                                width: 24,
                                height: 24,
                                bgcolor: getPriorityColor(task.priority),
                                mr: 1,
                              }}
                            >
                              <PriorityHigh sx={{ fontSize: 12 }} />
                            </Avatar>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {task.title}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </Box>

              {/* タイムラインの高さを確保 */}
              <Box sx={{ height: `${tasks.length * 60}px`, mt: 2 }} />
            </Box>
          </CardContent>
        </Card>

        {/* タスクリスト */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              タスク一覧
            </Typography>
            <List>
              {tasks.map((task, index) => (
                <React.Fragment key={task.id}>
                  <ListItem
                    sx={{ px: 0 }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="編集">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingTask(task);
                              setDialogOpen(true);
                            }}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="削除">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              const updatedTasks = tasks.filter(t => t.id !== task.id);
                              localStorage.setItem('tasks', JSON.stringify(updatedTasks));
                              setTasks(updatedTasks);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: getStatusColor(task.status) }}>
                        <Assignment />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {task.title}
                          </Typography>
                          <Chip
                            label={getPriorityLabel(task.priority)}
                            size="small"
                            sx={{
                              backgroundColor: getPriorityColor(task.priority),
                              color: 'white',
                              fontSize: '0.75rem',
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            {task.description}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarToday sx={{ fontSize: 16 }} />
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(task.startDate || task.dueDate), 'M/d')} - {format(new Date(task.endDate || task.dueDate), 'M/d')}
                              </Typography>
                            </Box>
                            {task.assignee && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Person sx={{ fontSize: 16 }} />
                                <Typography variant="caption" color="text.secondary">
                                  {task.assignee}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < tasks.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>

        {/* タスク編集ダイアログ */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {editingTask?.id ? 'タスクを編集' : '新しいタスク'}
              </Typography>
              {editingTask?.id && (
                <Tooltip title="削除">
                  <IconButton
                    color="error"
                    onClick={handleDeleteTask}
                    sx={{ color: 'error.main' }}
                  >
                    <Delete />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="タイトル"
                value={editingTask?.title || ''}
                onChange={(e) => setEditingTask(prev => prev ? { ...prev, title: e.target.value } : null)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="説明"
                multiline
                rows={3}
                value={editingTask?.description || ''}
                onChange={(e) => setEditingTask(prev => prev ? { ...prev, description: e.target.value } : null)}
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>ステータス</InputLabel>
                  <Select
                    value={editingTask?.status || 'todo'}
                    onChange={(e) => setEditingTask(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                    label="ステータス"
                  >
                    <MenuItem value="todo">未着手</MenuItem>
                    <MenuItem value="inProgress">進行中</MenuItem>
                    <MenuItem value="done">完了</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>優先度</InputLabel>
                  <Select
                    value={editingTask?.priority || 'medium'}
                    onChange={(e) => setEditingTask(prev => prev ? { ...prev, priority: e.target.value as any } : null)}
                    label="優先度"
                  >
                    <MenuItem value="low">低</MenuItem>
                    <MenuItem value="medium">中</MenuItem>
                    <MenuItem value="high">高</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  label="開始日"
                  type="date"
                  value={editingTask?.startDate || ''}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, startDate: e.target.value } : null)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="終了日"
                  type="date"
                  value={editingTask?.endDate || ''}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, endDate: e.target.value } : null)}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <TextField
                fullWidth
                label="担当者"
                value={editingTask?.assignee || ''}
                onChange={(e) => setEditingTask(prev => prev ? { ...prev, assignee: e.target.value } : null)}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveTask}
              disabled={!editingTask?.title}
            >
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Box>
  );
};

export default TimelineView; 