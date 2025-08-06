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
import { setupRealtimeListener, saveTask } from '../firebase';

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
  gradient: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState<string>('');

  useEffect(() => {
    if (!user?.id) return;

    // Firebaseのリアルタイムリスナーを設定
    const unsubscribe = setupRealtimeListener(user.id, (firebaseTasks) => {
      setTasks(firebaseTasks);
      setLoading(false);
    });

    // ローカルストレージからフィルター情報を読み込み
    const filteredTasks = localStorage.getItem('filteredTasks');
    const currentProject = localStorage.getItem('currentProject');
    const currentWorkspace = localStorage.getItem('currentWorkspace');
    
    if (filteredTasks && (currentProject || currentWorkspace)) {
      setCurrentFilter(currentProject || currentWorkspace || '');
    }

    // テスト用：初回アクセス時にサンプルデータを追加
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      console.log('サンプルデータを追加中...');
      const sampleTasks = [
        {
          id: '1',
          title: 'プロジェクト計画の作成',
          description: '新しいプロジェクトの計画書を作成する',
          status: 'todo' as const,
          priority: 'high' as const,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          assignee: user.name || '未設定',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'チームミーティング',
          description: '週次チームミーティングの準備',
          status: 'inProgress' as const,
          priority: 'medium' as const,
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          assignee: user.name || '未設定',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '3',
          title: 'ドキュメントの更新',
          description: '技術文書の最新版に更新',
          status: 'done' as const,
          priority: 'low' as const,
          dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          assignee: user.name || '未設定',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      
      // サンプルデータをローカルストレージに直接保存
      localStorage.setItem(`tasks_${user.id}`, JSON.stringify(sampleTasks));
      console.log('サンプルデータをローカルストレージに保存しました');
      
      // saveTask関数も呼び出し（フォールバック用）
      sampleTasks.forEach(task => {
        saveTask(user.id, task);
      });
      
      localStorage.setItem('hasVisited', 'true');
    }



    return () => unsubscribe();
  }, [user?.id]);

  const clearFilter = () => {
    localStorage.removeItem('filteredTasks');
    localStorage.removeItem('currentProject');
    localStorage.removeItem('currentWorkspace');
    setCurrentFilter('');
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
        {currentFilter && (
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
                    {currentFilter} のタスクを表示中
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
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 40px ${alpha(card.color, 0.4)}`,
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  position: 'relative',
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
                            '&:hover': {
                              backgroundColor: 'rgba(99, 102, 241, 0.05)',
                              transform: 'translateX(4px)',
                            },
                            transition: 'all 0.2s ease',
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
          onClick={() => navigate('/task/new')}
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
      </motion.div>
    </Box>
  );
};

export default Dashboard; 