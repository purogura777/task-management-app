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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';

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

interface StatCard {
  title: string;
  value: number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState<string>('');

  useEffect(() => {
    // ローカルストレージからタスクを読み込み
    const savedTasks = localStorage.getItem('tasks');
    const filteredTasks = localStorage.getItem('filteredTasks');
    const currentProject = localStorage.getItem('currentProject');
    const currentWorkspace = localStorage.getItem('currentWorkspace');
    
    if (filteredTasks && (currentProject || currentWorkspace)) {
      setTasks(JSON.parse(filteredTasks));
      setCurrentFilter(currentProject || currentWorkspace || '');
    } else if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
      setCurrentFilter('');
    }
    setLoading(false);
  }, []);

  const clearFilter = () => {
    localStorage.removeItem('filteredTasks');
    localStorage.removeItem('currentProject');
    localStorage.removeItem('currentWorkspace');
    setCurrentFilter('');
    
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  };

  const todoTasks = tasks.filter(task => task.status === 'todo');
  const inProgressTasks = tasks.filter(task => task.status === 'inProgress');
  const doneTasks = tasks.filter(task => task.status === 'done');
  const overdueTasks = tasks.filter(task => 
    new Date(task.dueDate) < new Date() && task.status !== 'done'
  );

  const completionRate = tasks.length > 0 ? (doneTasks.length / tasks.length) * 100 : 0;

  const statCards: StatCard[] = [
    {
      title: '総タスク数',
      value: tasks.length,
      change: 12,
      icon: <Assignment />,
      color: '#6366f1',
    },
    {
      title: '進行中',
      value: inProgressTasks.length,
      change: 8,
      icon: <Schedule />,
      color: '#f59e0b',
    },
    {
      title: '完了済み',
      value: doneTasks.length,
      change: 15,
      icon: <CheckCircle />,
      color: '#10b981',
    },
    {
      title: '期限超過',
      value: overdueTasks.length,
      change: -3,
      icon: <Warning />,
      color: '#ef4444',
    },
  ];

  const recentTasks = tasks
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
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 2, 
      backgroundColor: 'background.default',
      minHeight: 'calc(100vh - 120px)',
      maxWidth: '100%', // 最大幅を制限
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a' }}>
            おかえりなさい、{user?.name || 'ユーザー'}さん
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {format(new Date(), 'yyyy年M月d日 EEEE', { locale: ja })}
          </Typography>
        </Box>

        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'text.primary', mb: 3 }}>
          ダッシュボード
        </Typography>

        {currentFilter && (
          <Box sx={{ mb: 3, p: 2, backgroundColor: 'primary.light', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body1" sx={{ color: 'primary.contrastText', fontWeight: 500 }}>
              📁 {currentFilter} のタスクを表示中
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={clearFilter}
              sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText', '&:hover': { borderColor: 'primary.contrastText' } }}
            >
              フィルターをクリア
            </Button>
          </Box>
        )}

        {/* 統計カード */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {statCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={card.title}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Paper sx={{ 
                  height: '100%',
                  borderRadius: 2,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #e2e8f0',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.2s ease',
                }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ 
                        bgcolor: card.color, 
                        mr: 2,
                        width: 48,
                        height: 48,
                      }}>
                        {card.icon}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h3" sx={{ fontWeight: 700, color: card.color }}>
                          {card.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          {card.title}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {card.change > 0 ? (
                        <TrendingUp sx={{ color: '#28a745', fontSize: 16, mr: 0.5 }} />
                      ) : (
                        <TrendingDown sx={{ color: '#dc3545', fontSize: 16, mr: 0.5 }} />
                      )}
                      <Typography
                        variant="body2"
                        color={card.change > 0 ? '#28a745' : '#dc3545'}
                        sx={{ fontWeight: 500 }}
                      >
                        {Math.abs(card.change)}%
                      </Typography>
                    </Box>
                  </CardContent>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          {/* 進捗状況 */}
          <Grid item xs={12} md={8}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <Paper sx={{ 
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e2e8f0',
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                      進捗状況
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={() => navigate('/task/new')}
                      sx={{
                        borderColor: '#007bff',
                        color: '#007bff',
                        '&:hover': {
                          borderColor: '#0056b3',
                          backgroundColor: '#f8f9fa',
                        },
                      }}
                    >
                      新しいタスク
                    </Button>
                  </Box>
                  
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        完了率
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {completionRate.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={completionRate}
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        backgroundColor: '#e9ecef',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          backgroundColor: '#007bff',
                        },
                      }}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h3" sx={{ fontWeight: 700, color: '#6c757d', mb: 0.5 }}>
                          {todoTasks.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          To Do
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h3" sx={{ fontWeight: 700, color: '#007bff', mb: 0.5 }}>
                          {inProgressTasks.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          In Progress
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h3" sx={{ fontWeight: 700, color: '#28a745', mb: 0.5 }}>
                          {doneTasks.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Done
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Paper>
            </motion.div>
          </Grid>

          {/* 最近のタスク */}
          <Grid item xs={12} md={4}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <Paper sx={{ 
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e2e8f0',
                height: '100%',
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: '#1a1a1a' }}>
                    最近のタスク
                  </Typography>
                  <List sx={{ p: 0 }}>
                    <AnimatePresence>
                      {recentTasks.map((task, index) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2, delay: index * 0.1 }}
                        >
                          <ListItem sx={{ 
                            px: 0, 
                            py: 1,
                            borderRadius: 1,
                            '&:hover': {
                              backgroundColor: '#f8f9fa',
                            },
                          }}>
                            <ListItemAvatar>
                              <Avatar sx={{ 
                                bgcolor: getStatusColor(task.status), 
                                width: 32, 
                                height: 32,
                                fontSize: '0.875rem',
                              }}>
                                <Assignment sx={{ fontSize: 16 }} />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                                  {task.title}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                  <Chip
                                    label={task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                                    size="small"
                                    sx={{
                                      backgroundColor: getPriorityColor(task.priority),
                                      color: 'white',
                                      fontSize: '0.625rem',
                                      height: 20,
                                      mr: 1,
                                      '& .MuiChip-label': {
                                        px: 1,
                                      },
                                    }}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {format(new Date(task.createdAt), 'M/d')}
                                  </Typography>
                                </Box>
                              }
                            />
                            <IconButton size="small" sx={{ color: '#6c757d' }}>
                              <MoreVert sx={{ fontSize: 16 }} />
                            </IconButton>
                          </ListItem>
                          {index < recentTasks.length - 1 && (
                            <Divider sx={{ my: 0.5 }} />
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </List>
                </CardContent>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>

        {/* フローティングアクションボタン */}
        <Fab
          color="primary"
          aria-label="新しいタスク"
          onClick={() => navigate('/task/new')}
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
      </motion.div>
    </Box>
  );
};

export default Dashboard; 