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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Firebaseのリアルタイムリスナーを設定
    const unsubscribe = setupRealtimeListener(user.id, (firebaseTasks) => {
      setTasks(firebaseTasks);
    });

    return () => unsubscribe();
  }, [user?.id]);

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
        title: 'To Do',
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
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destColumn = columns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    const sourceTasks = Array.from(sourceColumn.tasks);
    const destTasks = source.droppableId === destination.droppableId
      ? sourceTasks
      : Array.from(destColumn.tasks);

    const [removed] = sourceTasks.splice(source.index, 1);
    destTasks.splice(destination.index, 0, removed);

    // タスクのステータスを更新
    const updatedTask = { 
      ...removed, 
      status: destination.droppableId as any,
      updatedAt: new Date().toISOString()
    };
    
    try {
      if (user?.id) {
        await updateTask(user.id, updatedTask.id, {
          status: updatedTask.status,
          updatedAt: updatedTask.updatedAt,
        });
      }
    } catch (error) {
      console.error('タスクの更新に失敗しました:', error);
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
      case 'high': return <Warning />;
      case 'medium': return <PriorityHigh />;
      case 'low': return <CheckCircle />;
      default: return <PriorityHigh />;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <Box sx={{ 
      p: 2, 
      height: 'calc(100vh - 120px)', 
      overflow: 'hidden',
      backgroundColor: '#f8fafc'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ height: '100%' }}
      >
        <Box sx={{ 
          display: 'flex', 
          height: '100%', 
          gap: 2,
          overflowX: 'auto',
          pb: 2
        }}>
          <DragDropContext onDragEnd={handleDragEnd}>
            {columns.map((column) => (
              <Box key={column.id} sx={{ 
                minWidth: 300, 
                maxWidth: 300,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Paper sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #e2e8f0'
                }}>
                  {/* カラムヘッダー */}
                  <Box sx={{ 
                    p: 2, 
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'background.paper'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: column.color,
                        }}
                      />
                      <Typography variant="h6" sx={{ 
                        fontWeight: 600, 
                        fontSize: '1rem',
                        color: 'text.primary'
                      }}>
                        {column.title}
                      </Typography>
                      <Badge
                        badgeContent={column.tasks.length}
                        sx={{
                          '& .MuiBadge-badge': {
                            backgroundColor: column.color,
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          },
                        }}
                      />
                    </Box>
                    <Tooltip title="新しいタスク">
                      <IconButton
                        size="small"
                                                 onClick={() => {
                           const newTask: Task = {
                             id: `temp_${Date.now()}`,
                             title: '',
                             description: '',
                             status: column.id as any,
                             priority: 'medium',
                             dueDate: format(new Date(), 'yyyy-MM-dd'),
                             assignee: '',
                             createdAt: new Date().toISOString(),
                           };
                           setEditingTask(newTask);
                           setDialogOpen(true);
                         }}
                        sx={{
                          backgroundColor: column.color,
                          color: 'white',
                          '&:hover': {
                            backgroundColor: column.color,
                            opacity: 0.8,
                          },
                        }}
                      >
                        <AddIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* タスクエリア */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        sx={{
                          flexGrow: 1,
                          p: 1,
                          backgroundColor: snapshot.isDraggingOver ? '#f1f5f9' : 'transparent',
                          borderRadius: 1,
                          minHeight: 200,
                          overflowY: 'auto',
                        }}
                      >
                        <AnimatePresence>
                          {column.tasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <motion.div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  transition={{ duration: 0.2 }}
                                  style={{
                                    ...provided.draggableProps.style,
                                    transform: snapshot.isDragging 
                                      ? `${provided.draggableProps.style?.transform} rotate(2deg)` 
                                      : provided.draggableProps.style?.transform,
                                  }}
                                >
                                  <Card
                                    sx={{
                                      mb: 1,
                                      cursor: 'grab',
                                      backgroundColor: 'background.paper',
                                      borderRadius: 1,
                                      border: '1px solid #e2e8f0',
                                      boxShadow: snapshot.isDragging 
                                        ? '0 8px 24px rgba(0, 0, 0, 0.15)' 
                                        : '0 1px 3px rgba(0, 0, 0, 0.05)',
                                      '&:hover': {
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                                        transform: 'translateY(-1px)',
                                      },
                                      transition: 'all 0.2s ease',
                                    }}
                                    {...provided.dragHandleProps}
                                  >
                                    <CardContent sx={{ p: 1.5 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                        <DragIndicator sx={{ 
                                          color: '#adb5bd', 
                                          mt: 0.5,
                                          fontSize: 16
                                        }} />
                                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                          <Typography
                                            variant="body2"
                                            sx={{
                                              fontWeight: 500,
                                              mb: 0.5,
                                              lineHeight: 1.3,
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              display: '-webkit-box',
                                              WebkitLineClamp: 2,
                                              WebkitBoxOrient: 'vertical',
                                              color: 'text.primary'
                                            }}
                                          >
                                            {task.title}
                                          </Typography>
                                          
                                          {task.description && (
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                              sx={{
                                                mb: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                color: 'text.secondary'
                                              }}
                                            >
                                              {task.description}
                                            </Typography>
                                          )}

                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Chip
                                              label={task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                                              size="small"
                                              sx={{
                                                backgroundColor: getPriorityColor(task.priority),
                                                color: 'white',
                                                fontSize: '0.625rem',
                                                height: 20,
                                                '& .MuiChip-label': {
                                                  px: 1,
                                                },
                                              }}
                                            />
                                            {task.assignee && (
                                              <Avatar
                                                sx={{
                                                  width: 20,
                                                  height: 20,
                                                  fontSize: '0.75rem',
                                                  bgcolor: '#007bff',
                                                }}
                                              >
                                                {task.assignee.charAt(0)}
                                              </Avatar>
                                            )}
                                          </Box>

                                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                              <CalendarToday sx={{ 
                                                fontSize: 14, 
                                                color: isOverdue(task.dueDate) ? '#dc3545' : '#6c757d' 
                                              }} />
                                              <Typography
                                                variant="caption"
                                                color={isOverdue(task.dueDate) ? 'error.main' : 'text.secondary'}
                                                sx={{ 
                                                  fontSize: '0.625rem',
                                                  color: isOverdue(task.dueDate) ? 'error.main' : 'text.secondary'
                                                }}
                                              >
                                                {format(new Date(task.dueDate), 'M/d')}
                                              </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                              <Tooltip title="編集">
                                                <IconButton
                                                  size="small"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingTask(task);
                                                    setDialogOpen(true);
                                                  }}
                                                  sx={{ 
                                                    width: 24, 
                                                    height: 24,
                                                    color: '#6c757d',
                                                    '&:hover': {
                                                      backgroundColor: '#f8f9fa',
                                                    },
                                                  }}
                                                >
                                                  <Edit sx={{ fontSize: 14 }} />
                                                </IconButton>
                                              </Tooltip>
                                              <Tooltip title="削除">
                                                <IconButton
                                                  size="small"
                                                  color="error"
                                                                                                   onClick={async (e) => {
                                                   e.stopPropagation();
                                                   try {
                                                     if (user?.id) {
                                                       await deleteTask(user.id, task.id);
                                                     }
                                                   } catch (error) {
                                                     console.error('タスクの削除に失敗しました:', error);
                                                   }
                                                 }}
                                                  sx={{ 
                                                    width: 24, 
                                                    height: 24,
                                                    '&:hover': {
                                                      backgroundColor: '#fff5f5',
                                                    },
                                                  }}
                                                >
                                                  <Delete sx={{ fontSize: 14 }} />
                                                </IconButton>
                                              </Tooltip>
                                            </Box>
                                          </Box>
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
              </Box>
            ))}
          </DragDropContext>
        </Box>

        {/* フローティングアクションボタン */}
        <Fab
          color="primary"
          aria-label="新しいタスク"
                     onClick={() => {
             const newTask: Task = {
               id: `temp_${Date.now()}`,
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
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor: '#6366f1',
            '&:hover': {
              backgroundColor: '#4f46e5',
            },
          }}
        >
          <AddIcon />
        </Fab>

        {/* タスク編集ダイアログ */}
        <Dialog 
          open={dialogOpen} 
          onClose={() => setDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            },
          }}
        >
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
                placeholder="タスクのタイトルを入力..."
              />
              <TextField
                fullWidth
                label="説明"
                multiline
                rows={3}
                value={editingTask?.description || ''}
                onChange={(e) => setEditingTask(prev => prev ? { ...prev, description: e.target.value } : null)}
                sx={{ mb: 2 }}
                placeholder="タスクの詳細を入力..."
              />
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>ステータス</InputLabel>
                  <Select
                    value={editingTask?.status || 'todo'}
                    onChange={(e) => setEditingTask(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                    label="ステータス"
                  >
                    <MenuItem value="todo">To Do</MenuItem>
                    <MenuItem value="inProgress">In Progress</MenuItem>
                    <MenuItem value="done">Done</MenuItem>
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
                placeholder="担当者の名前を入力..."
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
              sx={{
                backgroundColor: '#007bff',
                '&:hover': {
                  backgroundColor: '#0056b3',
                },
              }}
            >
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Box>
  );
};

export default KanbanBoard; 