import React, { useState, useEffect, useRef } from 'react';
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
  LinearProgress,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel,
  Slider,
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
  AutoFixHigh,
  Speed,
  Visibility,
  VisibilityOff,
  FilterList,
  Sort,
  GridView,
  ViewList,
  ZoomIn,
  ZoomOut,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { setupRealtimeListener, updateTask, deleteTask, saveTask } from '../firebase';
import TaskForm from './TaskForm';
import toast from 'react-hot-toast';

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
  project?: string;
  workspace?: string;
}

interface Column {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  maxTasks?: number;
  isCollapsed?: boolean;
}

const KanbanBoard: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(true);
  const [showAnimations, setShowAnimations] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showProgress, setShowProgress] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [dragPreview, setDragPreview] = useState<Task | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;

    setIsLoading(true);
    // Firebaseのリアルタイムリスナーを設定
    const unsubscribe = setupRealtimeListener(user.id, (firebaseTasks) => {
      setTasks(firebaseTasks);
      setIsLoading(false);
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

  // カラムの更新
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
        color: '#6366f1',
        tasks: todoTasks,
        maxTasks: 10,
      },
      {
        id: 'inProgress',
        title: '進行中',
        color: '#f59e0b',
        tasks: inProgressTasks,
        maxTasks: 8,
      },
      {
        id: 'done',
        title: '完了',
        color: '#10b981',
        tasks: doneTasks,
        maxTasks: 15,
      },
    ]);
  };

  // ドラッグ開始時の処理
  const handleDragStart = (result: any) => {
    const task = tasks.find(t => t.id === result.draggableId);
    if (task) {
      setDragPreview(task);
      toast.success(`${task.title}を移動中...`);
    }
  };

  // ドラッグ中の処理
  const handleDragUpdate = (result: any) => {
    if (result.destination) {
      const { destination } = result;
      const column = columns.find(col => col.id === destination.droppableId);
      if (column && column.maxTasks && column.tasks.length >= column.maxTasks) {
        toast.error(`${column.title}は最大${column.maxTasks}個までです`);
      }
    }
  };

  // ドラッグ終了時の処理
  const handleDragEnd = async (result: any) => {
    setDragPreview(null);
    
    if (!result.destination) {
      toast.error('ドロップ先が見つかりません');
      return;
    }

    const { source, destination, draggableId } = result;
    const taskId = draggableId;

    // 同じ位置にドロップした場合は何もしない
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // アニメーション付きでタスクを移動
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = destination.droppableId as Task['status'];
    
    try {
      setIsLoading(true);
      
      // ローカル状態を即座に更新（楽観的更新）
      const updatedTask = { ...task, status: newStatus };
      const newTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
      setTasks(newTasks);

      // Firebaseに更新を送信
      if (user?.id) {
        await updateTask(user.id, taskId, { status: newStatus });
      }

      // 成功メッセージ
      const statusLabels = {
        todo: '未着手',
        inProgress: '進行中',
        done: '完了'
      };
      
      setSnackbarMessage(`${task.title}を${statusLabels[newStatus]}に移動しました`);
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('タスクの更新に失敗しました:', error);
      toast.error('タスクの移動に失敗しました');
      
      // エラー時は元の状態に戻す
      updateColumns();
    } finally {
      setIsLoading(false);
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
      toast.success('タスクを削除しました');
    } catch (error) {
      console.error('タスクの削除に失敗しました:', error);
      toast.error('タスクの削除に失敗しました');
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

  const getProgressPercentage = (column: Column) => {
    if (column.maxTasks) {
      return Math.min((column.tasks.length / column.maxTasks) * 100, 100);
    }
    return 0;
  };

  const toggleColumnCollapse = (columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, isCollapsed: !col.isCollapsed } : col
    ));
  };

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            カンバンボード
          </Typography>
          {isLoading && <LinearProgress sx={{ width: 100 }} />}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={dragEnabled}
                onChange={(e) => setDragEnabled(e.target.checked)}
                size="small"
              />
            }
            label="ドラッグ"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showAnimations}
                onChange={(e) => setShowAnimations(e.target.checked)}
                size="small"
              />
            }
            label="アニメーション"
          />
          <FormControlLabel
            control={
              <Switch
                checked={compactMode}
                onChange={(e) => setCompactMode(e.target.checked)}
                size="small"
              />
            }
            label="コンパクト"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showProgress}
                onChange={(e) => setShowProgress(e.target.checked)}
                size="small"
              />
            }
            label="進捗"
          />
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
      </Box>

      {/* ドラッグプレビュー */}
      {dragPreview && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          style={{
            position: 'fixed',
            top: dragPosition.y,
            left: dragPosition.x,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <Card
            sx={{
              minWidth: 200,
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              borderRadius: 2,
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {dragPreview.title}
              </Typography>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* カンバンボード */}
      <DragDropContext 
        onDragStart={handleDragStart}
        onDragUpdate={handleDragUpdate}
        onDragEnd={handleDragEnd}
      >
        <Box 
          ref={boardRef}
          sx={{ 
            display: 'flex', 
            gap: 2, 
            height: 'calc(100% - 80px)', 
            overflow: 'auto',
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left',
            transition: 'transform 0.3s ease',
          }}
        >
          {columns.map((column) => (
            <motion.div
              key={column.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              style={{ flex: 1, minWidth: compactMode ? 250 : 300, maxWidth: compactMode ? 300 : 350 }}
            >
              <Paper
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  overflow: 'hidden',
                }}
              >
                {/* カラムヘッダー */}
                <Box
                  sx={{
                    p: 2,
                    background: `linear-gradient(135deg, ${column.color} 0%, ${column.color}dd 100%)`,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleColumnCollapse(column.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                  <IconButton size="small" sx={{ color: 'white' }}>
                    {column.isCollapsed ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </Box>

                {/* 進捗バー */}
                {showProgress && column.maxTasks && (
                  <Box sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        進捗
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {column.tasks.length}/{column.maxTasks}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={getProgressPercentage(column)}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: column.color,
                        },
                      }}
                    />
                  </Box>
                )}

                {/* カラムコンテンツ */}
                {!column.isCollapsed && (
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        sx={{
                          p: 2,
                          height: `calc(100% - ${showProgress ? 120 : 80}px)`,
                          overflow: 'auto',
                          backgroundColor: snapshot.isDraggingOver ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <AnimatePresence>
                          {column.tasks.map((task, index) => (
                            <Draggable 
                              key={task.id} 
                              draggableId={task.id} 
                              index={index}
                              isDragDisabled={!dragEnabled}
                            >
                              {(provided, snapshot) => (
                                <motion.div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                                                     initial={showAnimations ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
                                  animate={{ opacity: 1, y: 0 }}
                                                                     exit={showAnimations ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
                                  transition={{ 
                                    duration: showAnimations ? 0.3 : 0,
                                    ease: 'easeOut',
                                  }}
                                                                     whileHover={showAnimations ? { 
                                     scale: 1.02,
                                     y: -2,
                                   } : undefined}
                                  style={{
                                    ...provided.draggableProps.style,
                                    transform: snapshot.isDragging 
                                      ? `${provided.draggableProps.style?.transform} rotate(3deg)` 
                                      : provided.draggableProps.style?.transform,
                                  }}
                                >
                                  <Card
                                    {...provided.dragHandleProps}
                                    sx={{
                                      mb: compactMode ? 1 : 2,
                                      borderRadius: 2,
                                      boxShadow: snapshot.isDragging 
                                        ? '0 12px 40px rgba(0, 0, 0, 0.3)' 
                                        : '0 2px 8px rgba(0, 0, 0, 0.1)',
                                      cursor: dragEnabled ? 'grab' : 'default',
                                      '&:active': {
                                        cursor: dragEnabled ? 'grabbing' : 'default',
                                      },
                                      '&:hover': {
                                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                                      },
                                      transition: 'all 0.2s ease',
                                      border: isOverdue(task.dueDate) ? '2px solid #ef4444' : 'none',
                                    }}
                                  >
                                    <CardContent sx={{ p: compactMode ? 1.5 : 2 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: 600,
                                            lineHeight: 1.4,
                                            flex: 1,
                                            mr: 1,
                                            fontSize: compactMode ? '0.75rem' : '0.875rem',
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
                                          <Edit sx={{ fontSize: compactMode ? 14 : 16 }} />
                                        </IconButton>
                                      </Box>

                                      {!compactMode && task.description && (
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
                                          {!compactMode && (
                                            <Typography variant="caption" color="text.secondary">
                                              {task.assignee}
                                            </Typography>
                                          )}
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
                )}
              </Paper>
            </motion.div>
          ))}
        </Box>
      </DragDropContext>

      {/* スナックバー */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />

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