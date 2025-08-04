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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    convertTasksToEvents();
  }, [tasks]);

  const loadTasks = () => {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  };

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

      const colors = priorityColors[task.priority];
      const statusColor = statusColors[task.status];

      return {
        id: task.id,
        title: task.title,
        start: task.dueDate,
        backgroundColor: statusColor.bg,
        borderColor: statusColor.border,
        textColor: statusColor.text,
        extendedProps: {
          task,
        },
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
    setDialogOpen(true);
  };

  const handleSaveTask = () => {
    if (!editingTask) return;

    const updatedTasks = editingTask.id
      ? tasks.map(task => task.id === editingTask.id ? editingTask : task)
      : [...tasks, editingTask];

    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    setTasks(updatedTasks);
    setDialogOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTask = () => {
    if (!editingTask) return;

    const updatedTasks = tasks.filter(task => task.id !== editingTask.id);
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    setTasks(updatedTasks);
    setDialogOpen(false);
    setEditingTask(null);
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
              setDialogOpen(true);
            }}
          >
            新しいタスク
          </Button>
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
            <Box sx={{ height: 600 }}>
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

export default CalendarView; 