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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Event,
  Schedule,
  PriorityHigh,
} from '@mui/icons-material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { setupUnifiedTasksListener, saveTask, updateTask, deleteTask } from '../firebase';
import { decryptData } from '../utils/security';
import TaskForm from './TaskForm';
import MilestoneQuickActions from './MilestoneQuickActions';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inProgress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  dueAt?: string;
  allDay?: boolean;
  assignee: string;
  createdAt: string;
  startDate?: string;
  startAt?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    task: Task;
  };
}

const CalendarView: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    // Firebaseのリアルタイムリスナーを設定
    const unsubscribe = setupUnifiedTasksListener(user.id, (firebaseTasks) => {
      const workspace = localStorage.getItem('currentWorkspace');
      const project = localStorage.getItem('currentProject');
      let next = firebaseTasks;
      if (workspace) {
        next = next.filter((t: any) => t.workspace === workspace || (!t.workspace && workspace === '個人プロジェクト'));
      } else if (project) {
        next = next.filter((t: any) => t.project === project || (!t.project && project === '個人プロジェクト'));
      }
      try { setTasks(next.map((t: any) => ({ ...t, description: t.description ? decryptData(t.description) : '' }))); } catch { setTasks(next); }
    });

    return () => unsubscribe();
  }, [user?.id]);

  // フィルタリングイベントの監視
  useEffect(() => {
    const handleFilterChange = (event: CustomEvent) => {
      const { type, value } = event.detail;
      console.log('CalendarView: フィルタ変更を検知:', type, value);
      if (type === 'workspace') {
        localStorage.setItem('currentWorkspace', value);
        localStorage.removeItem('currentProject');
      } else if (type === 'project') {
        localStorage.setItem('currentProject', value);
        localStorage.removeItem('currentWorkspace');
      }
      const raw = localStorage.getItem(`tasks_${user?.id}`);
      if (raw) {
        const all = JSON.parse(raw);
        const filtered = type === 'workspace'
          ? all.filter((t: any) => t.workspace === value || (!t.workspace && value === '個人プロジェクト'))
          : all.filter((t: any) => t.project === value || (!t.project && value === '個人プロジェクト'));
        try { setTasks(filtered.map((t: any) => ({ ...t, description: t.description ? decryptData(t.description) : '' }))); } catch { setTasks(filtered); }
      }
    };

    window.addEventListener('filterChanged', handleFilterChange as EventListener);
    
    // 初期表示時にグローバル選択を適用
    const workspace = localStorage.getItem('currentWorkspace');
    const project = localStorage.getItem('currentProject');
    const raw = localStorage.getItem(`tasks_${user?.id}`);
    if (raw) {
      const all = JSON.parse(raw);
      if (workspace) {
        const filtered = all.filter((t: any) => t.workspace === workspace || (!t.workspace && workspace === '個人プロジェクト'));
        try { setTasks(filtered.map((t: any) => ({ ...t, description: t.description ? decryptData(t.description) : '' }))); } catch { setTasks(filtered); }
      } else if (project) {
        const filtered = all.filter((t: any) => t.project === project || (!t.project && project === '個人プロジェクト'));
        try { setTasks(filtered.map((t: any) => ({ ...t, description: t.description ? decryptData(t.description) : '' }))); } catch { setTasks(filtered); }
      }
    }
    
    return () => {
      window.removeEventListener('filterChanged', handleFilterChange as EventListener);
    };
  }, []);

  useEffect(() => {
    convertTasksToEvents();
  }, [tasks]);

  const convertTasksToEvents = () => {
    const calendarEvents: CalendarEvent[] = tasks.map(task => {
      const priorityColors = {
        high: { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },
        medium: { bg: '#f59e0b', border: '#d97706', text: '#ffffff' },
        low: { bg: '#10b981', border: '#059669', text: '#ffffff' },
      };

      const statusColors = {
        todo: { bg: '#6b7280', border: '#4b5563', text: '#ffffff' },
        inProgress: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' },
        done: { bg: '#10b981', border: '#059669', text: '#ffffff' },
      };

      const statusColor = statusColors[task.status];

      return {
        id: task.id,
        title: task.title,
        start: task.startAt || task.startDate || task.dueAt || task.dueDate,
        end: task.dueAt || task.dueDate,
        backgroundColor: statusColor.bg,
        borderColor: statusColor.border,
        textColor: statusColor.text,
        extendedProps: {
          task,
        },
        // ドラッグ時の視覚的フィードバックを改善
        classNames: ['draggable-event'],
        // ドラッグ可能なイベントのスタイル
        display: 'block',
        allDay: task.allDay !== false ? true : false,
      };
    });

    setEvents(calendarEvents);
  };

  const handleDateClick = (arg: any) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: arg.dateStr,
      assignee: '',
      createdAt: new Date().toISOString(),
    };

    setEditingTask(newTask);
    setDialogOpen(true);
  };

  const handleEventClick = (arg: any) => {
    setSelectedEvent(arg.event);
    setEditingTask(arg.event.extendedProps.task);
    setTaskFormOpen(true);
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

  const handleEventDrop = async (dropInfo: any) => {
    const { event } = dropInfo;
    const task = event.extendedProps.task;
    
    if (!task || !user?.id) return;

    try {
      // 新しい日付を取得
      const newDate = format(event.start, 'yyyy-MM-dd');
      
      // タスクを更新
      const updatedTask = {
        ...task,
        dueDate: newDate,
        updatedAt: new Date().toISOString(),
      };

      console.log('カレンダーでタスクをドラッグ:', task.title, '新しい日付:', newDate);
      
      // Firebaseに保存
      await updateTask(user.id, task.id, updatedTask);
      
      // 成功通知
      console.log('タスクの日付を更新しました:', task.title);
    } catch (error) {
      console.error('タスクの日付更新に失敗しました:', error);
      // エラー時は元の位置に戻す
      event.setProp('start', task.dueDate);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            カレンダー
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MilestoneQuickActions compact />
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
              };
              setEditingTask(newTask);
              setTaskFormOpen(true);
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
                タスクカレンダー
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  icon={<Event />}
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
                  icon={<Event />}
                  label="完了"
                  size="small"
                  sx={{ bgcolor: '#10b981', color: 'white' }}
                />
              </Box>
            </Box>
            <Box sx={{ 
              height: 600,
              '& .draggable-event': {
                cursor: 'grab',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                },
                '&:active': {
                  cursor: 'grabbing',
                  transform: 'scale(1.05)',
                  boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
                },
              },
              '& .fc-event-dragging': {
                opacity: 0.8,
                transform: 'rotate(5deg)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
              },
            }}>
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}
                locale="ja"
                editable={true}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                events={events}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                eventDrop={handleEventDrop}
                height="100%"
                eventDisplay="block"
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  meridiem: false,
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* タスク編集ダイアログ */}
        <Dialog open={dialogOpen} onClose={() => {
          setDialogOpen(false);
          setSelectedEvent(null);
          setEditingTask(null);
        }} maxWidth="sm" fullWidth>
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
              <TextField
                fullWidth
                label="期限"
                type="date"
                value={editingTask?.dueDate || ''}
                onChange={(e) => setEditingTask(prev => prev ? { ...prev, dueDate: e.target.value } : null)}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="担当者"
                value={editingTask?.assignee || ''}
                onChange={(e) => setEditingTask(prev => prev ? { ...prev, assignee: e.target.value } : null)}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setDialogOpen(false);
              setSelectedEvent(null);
              setEditingTask(null);
            }}>
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

        {/* TaskForm */}
        <TaskForm
          open={taskFormOpen}
          onClose={() => {
            setTaskFormOpen(false);
            setEditingTask(null);
          }}
          editingTask={editingTask}
        />
      </motion.div>
    </Box>
  );
};

export default CalendarView; 