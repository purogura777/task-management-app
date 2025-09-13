import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Button,
  Divider,
  Paper,
  Fab,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Assignment,
  CheckCircle,
  Schedule,
  Warning,
  Add,
  MoreVert,
  CalendarToday,
  Person,
  Group,
  Add as AddIcon,
  Dashboard as DashboardIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { setupUnifiedTasksListener, saveTask, updateTask, deleteTask } from '../firebase';
import { decryptData } from '../utils/security';
import toast from 'react-hot-toast';
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
  project?: string;
  workspace?: string;
  updatedAt: string;
}

interface StatCard {
  title: string;
  value: number;
  change: number;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<string>('個人プロジェクト');
  const [currentWorkspace, setCurrentWorkspace] = useState<string>('個人プロジェクト');
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // 保存されたプロジェクト/ワークスペースを復元
    const savedProject = localStorage.getItem('currentProject');
    const savedWorkspace = localStorage.getItem('currentWorkspace');
    
    if (savedProject) {
      setCurrentProject(savedProject);
      console.log('Dashboard: 保存されたプロジェクトを復元:', savedProject);
    }
    
    if (savedWorkspace) {
      setCurrentWorkspace(savedWorkspace);
      console.log('Dashboard: 保存されたワークスペースを復元:', savedWorkspace);
    }

    // 統合タスクリスナーを設定（個人/共有を自動判定）
    const unsubscribe = setupUnifiedTasksListener(user.id, (firebaseTasks) => {
      // グローバルフィルタ（currentWorkspace / currentProject）を適用
      const workspace = localStorage.getItem('currentWorkspace');
      const project = localStorage.getItem('currentProject');
      let next = firebaseTasks;
      if (workspace) {
        next = next.filter((t: any) => t.workspace === workspace || (!t.workspace && workspace === '個人プロジェクト'));
      } else if (project) {
        next = next.filter((t: any) => t.project === project || (!t.project && project === '個人プロジェクト'));
      }
      try { setTasks(next.map((t: any) => ({ ...t, description: t.description ? decryptData(t.description) : '' }))); } catch { setTasks(next); }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // フィルタリングイベントの監視
  useEffect(() => {
    const handleFilterChange = (event: CustomEvent) => {
      const { type, value } = event.detail;
      console.log('Dashboard: フィルタ変更を検知:', type, value);
      
      if (type === 'project') {
        setCurrentProject(value);
        setCurrentWorkspace(null);
      } else if (type === 'workspace') {
        setCurrentWorkspace(value);
        setCurrentProject(null);
      }
      
      // 最新タスクをローカルから取得して再フィルタ
      const raw = localStorage.getItem(`tasks_${user?.id}`);
      if (raw) {
        const all = JSON.parse(raw);
        const filtered = type === 'workspace'
          ? all.filter((t: any) => t.workspace === value || (!t.workspace && value === '個人プロジェクト'))
          : all.filter((t: any) => t.project === value || (!t.project && value === '個人プロジェクト'));
        setTasks(filtered);
      }
    };

    window.addEventListener('filterChanged', handleFilterChange as EventListener);
    
    return () => {
      window.removeEventListener('filterChanged', handleFilterChange as EventListener);
    };
  }, [user?.id]);

  // タスクの監視と通知の生成

  // フィルタリングされたタスクを取得
  const filteredTasks = tasks;

  const clearFilter = () => {
    setCurrentFilter('');
    localStorage.removeItem('currentProject');
    localStorage.removeItem('currentWorkspace');
    setCurrentProject('個人プロジェクト');
    setCurrentWorkspace('個人プロジェクト');
  };

  const handleTaskUpdate = async () => {
    if (!selectedTask || !user?.id) return;
    
    try {
      const { id, ...updates } = selectedTask;
      await updateTask(user.id, id, updates);
      toast.success('タスクを更新しました');
      setTaskDialogOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('タスクの更新に失敗しました:', error);
      toast.error('タスクの更新に失敗しました');
    }
  };

  const handleTaskDelete = async () => {
    if (!selectedTask || !user?.id) return;
    
    try {
      await deleteTask(user.id, selectedTask.id);
      toast.success('タスクを削除しました');
      setTaskDialogOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('タスクの削除に失敗しました:', error);
      toast.error('タスクの削除に失敗しました');
    }
  };

  const todoTasks = filteredTasks.filter(task => task.status === 'todo');
  const inProgressTasks = filteredTasks.filter(task => task.status === 'inProgress');
  const doneTasks = filteredTasks.filter(task => task.status === 'done');
  const overdueTasks = filteredTasks.filter(task => 
    new Date(task.dueDate) < new Date() && task.status !== 'done'
  );

  const completionRate = filteredTasks.length > 0 ? (doneTasks.length / filteredTasks.length) * 100 : 0;

  const statCards: StatCard[] = [
    {
      title: '総タスク数',
      value: filteredTasks.length,
      change: 0,
      icon: <Assignment />,
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    },
    {
      title: '進行中',
      value: inProgressTasks.length,
      change: 0,
      icon: <Schedule />,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    },
    {
      title: '完了済み',
      value: doneTasks.length,
      change: 0,
      icon: <CheckCircle />,
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
    {
      title: '期限超過',
      value: overdueTasks.length,
      change: 0,
      icon: <Warning />,
      color: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    },
  ];

  const recentTasks = filteredTasks
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#64748b';
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

  if (loading) {
    return (
      <Box sx={{ 
        p: 3, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: 'calc(100vh - 120px)'
      }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
            データを読み込み中...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: { xs: 2, md: 4 }, 
      backgroundColor: 'background.default',
      minHeight: 'calc(100vh - 120px)',
      maxWidth: '100%',
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.background.default, 1)} 100%)`,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* ヘッダーセクション */}
        <Box sx={{ mb: 4 }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ 
                bgcolor: 'primary.main', 
                mr: 2,
                width: 56,
                height: 56,
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              }}>
                <DashboardIcon />
              </Avatar>
              <Box>
                <Typography variant="h3" sx={{ 
                  fontWeight: 800, 
                  mb: 0.5, 
                  color: 'text.primary',
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #4a5568 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  おかえりなさい、{user?.name || 'ユーザー'}さん
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {format(new Date(), 'yyyy年M月d日 EEEE', { locale: ja })}
                </Typography>
              </Box>
            </Box>
          </motion.div>
        </Box>

        {/* フィルター表示 */}
        {(currentProject || currentWorkspace) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Paper sx={{ 
              mb: 4, 
              p: 3, 
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.2)', 
                    mr: 2,
                    width: 40,
                    height: 40,
                  }}>
                    📁
                  </Avatar>
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                    {currentProject || currentWorkspace} のタスクを表示中 ({filteredTasks.length}件)
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={clearFilter}
                  sx={{ 
                    color: 'white', 
                    borderColor: 'rgba(255, 255, 255, 0.3)', 
                    '&:hover': { 
                      borderColor: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    } 
                  }}
                >
                  フィルターをクリア
                </Button>
              </Box>
            </Paper>
          </motion.div>
        )}

        {/* 統計カード */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={card.title}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Paper sx={{ 
                  height: '100%',
                  borderRadius: 3,
                  background: card.gradient,
                  boxShadow: `0 8px 32px ${alpha(card.color, 0.3)}`,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 40px ${alpha(card.color, 0.4)}`,
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
                onClick={() => {
                  // 統計カードをクリックした時の処理
                  console.log('統計カードをクリックしました:', card.title);
                  // ここで各ステータスのタスク一覧に遷移する処理を追加
                  if (card.title === '総タスク数') {
                    navigate('/kanban');
                  } else if (card.title === '進行中') {
                    navigate('/kanban');
                  } else if (card.title === '完了済み') {
                    navigate('/kanban');
                  } else if (card.title === '期限超過') {
                    navigate('/kanban');
                  }
                }}>
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    right: 0, 
                    width: 100, 
                    height: 100, 
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    transform: 'translate(30px, -30px)',
                  }} />
                  <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.2)', 
                        mr: 2,
                        width: 56,
                        height: 56,
                        backdropFilter: 'blur(10px)',
                      }}>
                        {card.icon}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h2" sx={{ 
                          fontWeight: 800, 
                          color: 'white',
                          textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        }}>
                          {card.value}
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: 'rgba(255, 255, 255, 0.9)', 
                          fontWeight: 600,
                          fontSize: '0.875rem',
                        }}>
                          {card.title}
                        </Typography>
                      </Box>
                    </Box>
                    {card.change !== 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {card.change > 0 ? (
                          <TrendingUp sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 18, mr: 1 }} />
                        ) : (
                          <TrendingDown sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 18, mr: 1 }} />
                        )}
                        <Typography
                          variant="body2"
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.9)', 
                            fontWeight: 600,
                            fontSize: '0.875rem',
                          }}
                        >
                          {Math.abs(card.change)}%
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={4}>
          {/* 進捗状況 */}
          <Grid item xs={12} md={8}>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Paper sx={{ 
                borderRadius: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                overflow: 'hidden',
              }}>
                <Box sx={{ 
                  p: 4,
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: 'white',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.2)', 
                        mr: 2,
                        width: 48,
                        height: 48,
                      }}>
                        <SpeedIcon />
                      </Avatar>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        進捗状況
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => navigate('/task/new')}
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        backdropFilter: 'blur(10px)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        },
                      }}
                    >
                      新しいタスク
                    </Button>
                  </Box>
                  
                  <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                        完了率
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                        {completionRate.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={completionRate}
                      sx={{ 
                        height: 12, 
                        borderRadius: 6,
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 6,
                          background: 'linear-gradient(90deg, #ffffff 0%, #f0f0f0 100%)',
                        },
                      }}
                    />
                  </Box>

                  <Grid container spacing={3}>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h2" sx={{ 
                          fontWeight: 800, 
                          color: 'rgba(255, 255, 255, 0.9)', 
                          mb: 1,
                          textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        }}>
                          {todoTasks.length}
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: 'rgba(255, 255, 255, 0.8)', 
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          To Do
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h2" sx={{ 
                          fontWeight: 800, 
                          color: 'white', 
                          mb: 1,
                          textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        }}>
                          {inProgressTasks.length}
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: 'rgba(255, 255, 255, 0.8)', 
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          In Progress
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h2" sx={{ 
                          fontWeight: 800, 
                          color: 'rgba(255, 255, 255, 0.9)', 
                          mb: 1,
                          textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        }}>
                          {doneTasks.length}
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: 'rgba(255, 255, 255, 0.8)', 
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          Done
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            </motion.div>
          </Grid>

          {/* 最近のタスク */}
          <Grid item xs={12} md={4}>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Paper sx={{ 
                borderRadius: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                height: '100%',
                overflow: 'hidden',
              }}>
                <Box sx={{ 
                  p: 3,
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%)',
                  color: 'white',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.1)', 
                      mr: 2,
                      width: 40,
                      height: 40,
                    }}>
                      <TimelineIcon />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      最近のタスク
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ p: 3 }}>
                  <List sx={{ p: 0 }}>
                    <AnimatePresence>
                      {recentTasks.map((task, index) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <ListItem sx={{ 
                            px: 0, 
                            py: 1.5,
                            borderRadius: 2,
                            mb: 1,
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'rgba(99, 102, 241, 0.05)',
                              transform: 'translateX(4px)',
                            },
                            transition: 'all 0.2s ease',
                          }}
                                                     onClick={() => {
                             // タスクの詳細表示や編集機能を追加
                             console.log('タスクをクリックしました:', task);
                             setEditingTask(task);
                             setTaskFormOpen(true);
                           }}>
                            <ListItemAvatar>
                              <Avatar sx={{ 
                                background: `linear-gradient(135deg, ${getStatusColor(task.status)} 0%, ${alpha(getStatusColor(task.status), 0.8)} 100%)`,
                                width: 36, 
                                height: 36,
                                fontSize: '0.875rem',
                                boxShadow: `0 4px 12px ${alpha(getStatusColor(task.status), 0.3)}`,
                              }}>
                                <Assignment sx={{ fontSize: 16 }} />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 600, 
                                  lineHeight: 1.4,
                                  color: 'text.primary',
                                }}>
                                  {task.title}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                  <Chip
                                    label={task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                                    size="small"
                                    sx={{
                                      background: `linear-gradient(135deg, ${getPriorityColor(task.priority)} 0%, ${alpha(getPriorityColor(task.priority), 0.8)} 100%)`,
                                      color: 'white',
                                      fontSize: '0.625rem',
                                      height: 20,
                                      mr: 1,
                                      fontWeight: 600,
                                      '& .MuiChip-label': {
                                        px: 1,
                                      },
                                    }}
                                  />
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                    {format(new Date(task.createdAt), 'M/d')}
                                  </Typography>
                                </Box>
                              }
                            />
                            <IconButton size="small" sx={{ 
                              color: 'text.secondary',
                              '&:hover': {
                                color: 'primary.main',
                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                              },
                            }}>
                              <MoreVert sx={{ fontSize: 18 }} />
                            </IconButton>
                          </ListItem>
                          {index < recentTasks.length - 1 && (
                            <Divider sx={{ my: 1, opacity: 0.3 }} />
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </List>
                </Box>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>

        {/* フローティングアクションボタン */}
                 <Fab
           color="primary"
           aria-label="新しいタスク"
           onClick={() => setTaskFormOpen(true)}
           sx={{
             position: 'fixed',
             bottom: 32,
             right: 32,
             background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
             boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
             width: 64,
             height: 64,
             '&:hover': {
               background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
               boxShadow: '0 12px 40px rgba(99, 102, 241, 0.6)',
               transform: 'scale(1.05)',
             },
             transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
           }}
         >
           <AddIcon sx={{ fontSize: 28 }} />
         </Fab>

        {/* タスク編集ダイアログ */}
        <Dialog 
          open={taskDialogOpen} 
          onClose={() => {
            setTaskDialogOpen(false);
            setSelectedTask(null);
          }} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              opacity: 1,
            },
          }}
          sx={{
            '& .MuiBackdrop-root': {
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            },
          }}
        >
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: 'white',
            borderRadius: '12px 12px 0 0',
            pb: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.2)', 
                  width: 40, 
                  height: 40 
                }}>
                  <Assignment />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  タスクを編集
                </Typography>
              </Box>
              <Button
                color="error"
                onClick={handleTaskDelete}
                variant="outlined"
                size="small"
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                削除
              </Button>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="タイトル"
                  value={selectedTask?.title || ''}
                  onChange={(e) => setSelectedTask(prev => prev ? { ...prev, title: e.target.value } : null)}
                  variant="outlined"
                  placeholder="タスクのタイトルを入力..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="説明"
                  multiline
                  rows={4}
                  value={selectedTask?.description || ''}
                  onChange={(e) => setSelectedTask(prev => prev ? { ...prev, description: e.target.value } : null)}
                  variant="outlined"
                  placeholder="タスクの詳細を入力..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>ステータス</InputLabel>
                  <Select
                    value={selectedTask?.status || 'todo'}
                    onChange={(e) => setSelectedTask(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                    label="ステータス"
                    sx={{
                      borderRadius: 2,
                    }}
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
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>優先度</InputLabel>
                  <Select
                    value={selectedTask?.priority || 'medium'}
                    onChange={(e) => setSelectedTask(prev => prev ? { ...prev, priority: e.target.value as any } : null)}
                    label="優先度"
                    sx={{
                      borderRadius: 2,
                    }}
                  >
                    <MenuItem value="low">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                        低優先度
                      </Box>
                    </MenuItem>
                    <MenuItem value="medium">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                        中優先度
                      </Box>
                    </MenuItem>
                    <MenuItem value="high">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} />
                        高優先度
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="期限"
                  type="date"
                  value={selectedTask?.dueDate || ''}
                  onChange={(e) => setSelectedTask(prev => prev ? { ...prev, dueDate: e.target.value } : null)}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
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
                  label="担当者"
                  value={selectedTask?.assignee || ''}
                  onChange={(e) => setSelectedTask(prev => prev ? { ...prev, assignee: e.target.value } : null)}
                  placeholder="担当者の名前を入力..."
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button 
              onClick={() => {
                setTaskDialogOpen(false);
                setSelectedTask(null);
              }}
              variant="outlined"
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              キャンセル
            </Button>
            <Button
              variant="contained"
              onClick={handleTaskUpdate}
              disabled={!selectedTask?.title}
              sx={{ 
                borderRadius: 2, 
                textTransform: 'none', 
                fontWeight: 600,
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                }
              }}
            >
              保存
            </Button>
          </DialogActions>
        </Dialog>

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

export default Dashboard; 