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
  Avatar,
  Badge,
  Paper,
  Fab,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  DragIndicator,
  Assignment,
  Person,
  CalendarToday,
  PriorityHigh,
  CheckCircle,
  Schedule,
  Warning,
  MoreVert,
  Add as AddIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { setupRealtimeListener, updateTask, deleteTask, saveTask } from '../firebase';
import TaskForm from './TaskForm';

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

interface Column {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}

const KanbanBoard: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Firebaseのリアルタイムリスナーを設定
    const unsubscribe = setupRealtimeListener(user.id, (firebaseTasks) => {
      setTasks(firebaseTasks);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // フィルタリングイベントの監視
  useEffect(() => {
    const handleFilterChange = (event: CustomEvent) => {
      const { type, value, filteredTasks } = event.detail;
      console.log('KanbanBoard: フィルタ変更を検知:', type, value, filteredTasks);
      
      // フィルタリングされたタスクを設定
      if (filteredTasks) {
        setTasks(filteredTasks);
      }
    };

    window.addEventListener('filterChanged', handleFilterChange as EventListener);
    
    return () => {
      window.removeEventListener('filterChanged', handleFilterChange as EventListener);
    };
  }, []);

  useEffect(() => {
    updateColumns();
  }, [tasks]);

  const updateColumns = () => {
    const todoTasks = tasks.filter(task => task.status === 'todo');
    const inProgressTasks = tasks.filter(task => task.status === 'inProgress');
    const doneTasks = tasks.filter(task => task.status === 'done');

    setColumns([
      {
        id: 'todo',
        title: '未着手',
        color: '#64748b',
        tasks: todoTasks,
      },
      {
        id: 'inProgress',
        title: '進行中',
        color: '#6366f1',
        tasks: inProgressTasks,
      },
      {
        id: 'done',
        title: '完了',
        color: '#10b981',
        tasks: doneTasks,
      },
    ]);
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    const taskId = draggableId;

    if (source.droppableId === destination.droppableId) {
      // 同じ列内での移動
      const column = columns.find(col => col.id === source.droppableId);
      if (!column) return;

      const newTasks = Array.from(column.tasks);
      const [removed] = newTasks.splice(source.index, 1);
      newTasks.splice(destination.index, 0, removed);

      const newColumns = columns.map(col =>
        col.id === source.droppableId ? { ...col, tasks: newTasks } : col
      );
      setColumns(newColumns);
    } else {
      // 異なる列間での移動
      const sourceColumn = columns.find(col => col.id === source.droppableId);
      const destColumn = columns.find(col => col.id === destination.droppableId);
      if (!sourceColumn || !destColumn) return;

      const sourceTasks = Array.from(sourceColumn.tasks);
      const destTasks = Array.from(destColumn.tasks);
      const [removed] = sourceTasks.splice(source.index, 1);
      destTasks.splice(destination.index, 0, removed);

      const newColumns = columns.map(col => {
        if (col.id === source.droppableId) {
          return { ...col, tasks: sourceTasks };
        }
        if (col.id === destination.droppableId) {
          return { ...col, tasks: destTasks };
        }
        return col;
      });
      setColumns(newColumns);

      // タスクのステータスを更新
      const newStatus = destination.droppableId as Task['status'];
      const task = tasks.find(t => t.id === taskId);
      if (task && user?.id) {
        try {
          await updateTask(user.id, taskId, { ...task, status: newStatus });
        } catch (error) {
          console.error('タスクの更新に失敗しました:', error);
        }
      }
    }
  };

  const handleSaveTask = async () => {
    setTaskFormOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTask = async () => {
    if (!editingTask || !user?.id) return;
    
    try {
      await deleteTask(user.id, editingTask.id);
      setTaskFormOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error('タスクの削除に失敗しました:', error);
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <PriorityHigh sx={{ fontSize: 16, color: '#ef4444' }} />;
      case 'medium': return <PriorityHigh sx={{ fontSize: 16, color: '#f59e0b' }} />;
      case 'low': return <PriorityHigh sx={{ fontSize: 16, color: '#10b981' }} />;
      default: return <PriorityHigh sx={{ fontSize: 16, color: '#64748b' }} />;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).getTime() !== new Date().setHours(0, 0, 0, 0);
  };

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
          カンバンボード
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setTaskFormOpen(true)}
          sx={{
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
            },
          }}
        >
          新しいタスク
        </Button>
      </Box>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ display: 'flex', gap: 2, height: 'calc(100% - 80px)', overflow: 'auto' }}>
          {columns.map((column) => (
            <Paper
              key={column.id}
              sx={{
                flex: 1,
                minWidth: 300,
                maxWidth: 350,
                height: '100%',
                borderRadius: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  p: 2,
                  background: `linear-gradient(135deg, ${column.color} 0%, ${column.color}dd 100%)`,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {column.title}
                </Typography>
                <Badge
                  badgeContent={column.tasks.length}
                  color="primary"
                  sx={{
                    '& .MuiBadge-badge': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontWeight: 600,
                    },
                  }}
                />
              </Box>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      p: 2,
                      height: 'calc(100% - 80px)',
                      overflow: 'auto',
                      backgroundColor: snapshot.isDraggingOver ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                    }}
                  >
                    <AnimatePresence>
                      {column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <motion.div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Card
                                {...provided.dragHandleProps}
                                sx={{
                                  mb: 2,
                                  borderRadius: 2,
                                  boxShadow: snapshot.isDragging ? '0 8px 32px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                                  transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                                  cursor: 'grab',
                                  '&:hover': {
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                                  },
                                }}
                              >
                                <CardContent sx={{ p: 2 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: 600,
                                        lineHeight: 1.4,
                                        flex: 1,
                                        mr: 1,
                                      }}
                                    >
                                      {task.title}
                                    </Typography>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setEditingTask(task);
                                        setTaskFormOpen(true);
                                      }}
                                      sx={{ color: 'text.secondary' }}
                                    >
                                      <Edit sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Box>

                                  {task.description && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{
                                        display: 'block',
                                        mb: 1,
                                        lineHeight: 1.4,
                                      }}
                                    >
                                      {task.description}
                                    </Typography>
                                  )}

                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    {getPriorityIcon(task.priority)}
                                    <Chip
                                      label={task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                                      size="small"
                                      sx={{
                                        backgroundColor: getPriorityColor(task.priority),
                                        color: 'white',
                                        fontSize: '0.625rem',
                                        height: 20,
                                        fontWeight: 600,
                                      }}
                                    />
                                  </Box>

                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                                      <Typography
                                        variant="caption"
                                        color={isOverdue(task.dueDate) ? 'error.main' : 'text.secondary'}
                                        sx={{ fontWeight: isOverdue(task.dueDate) ? 600 : 400 }}
                                      >
                                        {format(new Date(task.dueDate), 'M/d')}
                                      </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Avatar sx={{ width: 20, height: 20, fontSize: '0.625rem' }}>
                                        {task.assignee.charAt(0)}
                                      </Avatar>
                                      <Typography variant="caption" color="text.secondary">
                                        {task.assignee}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </CardContent>
                              </Card>
                            </motion.div>
                          )}
                        </Draggable>
                      ))}
                    </AnimatePresence>
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Paper>
          ))}
        </Box>
      </DragDropContext>

      <TaskForm
        open={taskFormOpen}
        onClose={() => {
          setTaskFormOpen(false);
          setEditingTask(null);
        }}
        editingTask={editingTask}
      />
    </Box>
  );
};

export default KanbanBoard; 