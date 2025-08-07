import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ViewKanban as KanbanIcon,
  CalendarToday as CalendarIcon,
  Timeline as TimelineIcon,
  List as ListIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Star as StarIcon,
  Search as SearchIcon,
  Folder,
  Work,
  School,
  Add as AddIcon,
  Delete,
  Timer,
  AccountTree,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { setupRealtimeListener } from '../firebase';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projectItems, setProjectItems] = useState([
    {
      text: '個人プロジェクト',
      icon: <PersonIcon />,
      path: '/project/personal',
      badge: 0,
    },
    {
      text: '仕事',
      icon: <Work />,
      path: '/project/work',
      badge: 0,
    },
    {
      text: '学習',
      icon: <School />,
      path: '/project/study',
      badge: 0,
    },
  ]);
  const [workspaceItems, setWorkspaceItems] = useState([
    {
      text: '個人プロジェクト',
      icon: <PersonIcon />,
      path: '/workspace/personal',
      badge: 0, // 動的に計算
    },
    {
      text: 'チームA',
      icon: <Folder />,
      path: '/workspace/team-a',
      badge: 0, // 動的に計算
    },
    {
      text: 'プロジェクトX',
      icon: <Folder />,
      path: '/workspace/project-x',
      badge: 0, // 動的に計算
    },
  ]);

  const menuItems = [
    {
      text: 'ダッシュボード',
      icon: <DashboardIcon />,
      path: '/',
      badge: null,
    },
    {
      text: 'カンバンボード',
      icon: <KanbanIcon />,
      path: '/kanban',
      badge: null,
    },
    {
      text: 'カレンダー',
      icon: <CalendarIcon />,
      path: '/calendar',
      badge: null,
    },
    {
      text: 'タイムライン',
      icon: <TimelineIcon />,
      path: '/timeline',
      badge: null,
    },
    {
      text: 'リスト',
      icon: <ListIcon />,
      path: '/list',
      badge: null,
    },
    {
      text: 'ポモドーロ',
      icon: <Timer />,
      path: '/pomodoro',
      badge: null,
    },
    {
      text: 'マインドマップ',
      icon: <AccountTree />,
      path: '/mindmap',
      badge: null,
    },
  ];

  // 新しいワークスペース/プロジェクトを追加
  const addNewWorkspace = () => {
    const newName = prompt('新しいワークスペース名を入力してください:');
    if (newName && newName.trim()) {
      const newWorkspace = {
        text: newName.trim(),
        icon: <Folder />,
        path: `/workspace/${newName.toLowerCase().replace(/\s+/g, '-')}`,
        badge: 0,
      };
      setWorkspaceItems(prev => [...prev, newWorkspace]);
      toast.success(`ワークスペース「${newName}」を作成しました`);
    }
  };

  const addNewProject = () => {
    const newName = prompt('新しいプロジェクト名を入力してください:');
    if (newName && newName.trim()) {
      const newProject = {
        text: newName.trim(),
        icon: <Work />,
        path: `/project/${newName.toLowerCase().replace(/\s+/g, '-')}`,
        badge: 0,
      };
      setProjectItems(prev => [...prev, newProject]);
      toast.success(`プロジェクト「${newName}」を作成しました`);
    }
  };

  // ワークスペース/プロジェクトを削除
  const deleteWorkspace = (workspaceName: string) => {
    if (confirm(`ワークスペース「${workspaceName}」を削除しますか？`)) {
      setWorkspaceItems(prev => prev.filter(item => item.text !== workspaceName));
      toast.success(`ワークスペース「${workspaceName}」を削除しました`);
    }
  };

  const deleteProject = (projectName: string) => {
    if (confirm(`プロジェクト「${projectName}」を削除しますか？`)) {
      setProjectItems(prev => prev.filter(item => item.text !== projectName));
      toast.success(`プロジェクト「${projectName}」を削除しました`);
    }
  };

  // タスク数を動的に計算
  const calculateTaskCount = (filterType: string, filterValue: string) => {
    return tasks.filter((task: any) => {
      if (filterType === 'assignee') {
        return task.assignee === filterValue;
      } else if (filterType === 'status') {
        return task.status === filterValue;
      } else if (filterType === 'priority') {
        return task.priority === filterValue;
      } else if (filterType === 'project') {
        return task.project === filterValue;
      } else if (filterType === 'workspace') {
        return task.workspace === filterValue;
      }
      return false;
    }).length;
  };

  // バッジ数を更新
  const updateBadgeCounts = () => {
    console.log('Sidebar: タスク数:', tasks.length);
    console.log('Sidebar: タスク詳細:', tasks);
    
    // 個人プロジェクトのタスク数（デモユーザー、個人、またはassigneeが空のタスク）
    const personalCount = tasks.filter((task: any) => 
      !task.assignee || task.assignee === 'デモユーザー' || task.assignee === '個人'
    ).length;
    console.log('Sidebar: 個人プロジェクトのタスク数:', personalCount);
    
    // チームAのタスク数（workspaceが'チームA'のタスク）
    const teamACount = tasks.filter((task: any) => 
      task.workspace === 'チームA'
    ).length;
    console.log('Sidebar: チームAのタスク数:', teamACount);
    
    // プロジェクトXのタスク数（workspaceが'プロジェクトX'のタスク）
    const projectXCount = tasks.filter((task: any) => 
      task.workspace === 'プロジェクトX'
    ).length;
    console.log('Sidebar: プロジェクトXのタスク数:', projectXCount);

    // 仕事プロジェクトのタスク数（projectが'仕事'のタスク）
    const workCount = tasks.filter((task: any) => 
      task.project === '仕事'
    ).length;
    
    // 学習プロジェクトのタスク数（projectが'学習'のタスク）
    const studyCount = tasks.filter((task: any) => 
      task.project === '学習'
    ).length;

    // ワークスペースのバッジ数を更新
    setWorkspaceItems(prev => prev.map(item => {
      if (item.text === '個人プロジェクト') {
        return { ...item, badge: personalCount > 0 ? personalCount : null };
      } else if (item.text === 'チームA') {
        return { ...item, badge: teamACount > 0 ? teamACount : null };
      } else if (item.text === 'プロジェクトX') {
        return { ...item, badge: projectXCount > 0 ? projectXCount : null };
      }
      return item;
    }));

    // プロジェクトのバッジ数を更新
    setProjectItems(prev => prev.map(item => {
      if (item.text === '個人プロジェクト') {
        return { ...item, badge: personalCount > 0 ? personalCount : null };
      } else if (item.text === '仕事') {
        return { ...item, badge: workCount > 0 ? workCount : null };
      } else if (item.text === '学習') {
        return { ...item, badge: studyCount > 0 ? studyCount : null };
      }
      return item;
    }));
  };

  // コンポーネントマウント時にバッジ数を計算し、現在の選択状態を復元
  useEffect(() => {
    if (!user?.id) return;

    // Firebaseのリアルタイムリスナーを設定
    const unsubscribe = setupRealtimeListener(user.id, (firebaseTasks) => {
      setTasks(firebaseTasks);
      updateBadgeCounts();
    });

    // 現在の選択状態を復元
    const savedProject = localStorage.getItem('currentProject');
    const savedWorkspace = localStorage.getItem('currentWorkspace');
    
    if (savedProject) {
      setCurrentProject(savedProject);
    }
    if (savedWorkspace) {
      setCurrentWorkspace(savedWorkspace);
    }

    return () => unsubscribe();
  }, [user?.id]);

  // 選択状態の変更を監視
  useEffect(() => {
    const savedProject = localStorage.getItem('currentProject');
    const savedWorkspace = localStorage.getItem('currentWorkspace');
    
    if (savedProject !== currentProject) {
      setCurrentProject(savedProject);
    }
    if (savedWorkspace !== currentWorkspace) {
      setCurrentWorkspace(savedWorkspace);
    }
  }, []); // 依存配列を空にして、マウント時のみ実行

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleProjectClick = (projectName: string) => {
    // プロジェクトをクリックした時の処理
    console.log(`プロジェクト "${projectName}" が選択されました`);
    
    // 現在の選択状態を更新
    setCurrentProject(projectName);
    setCurrentWorkspace(null);
    
    // プロジェクト固有のタスクをフィルタリング
    let filteredTasks = [];
    
    switch (projectName) {
      case '個人プロジェクト':
        filteredTasks = tasks.filter((task: any) => 
          !task.project || task.project === '個人プロジェクト'
        );
        break;
      case '仕事':
        filteredTasks = tasks.filter((task: any) => 
          task.project === '仕事'
        );
        break;
      case '学習':
        filteredTasks = tasks.filter((task: any) => 
          task.project === '学習'
        );
        break;
      default:
        filteredTasks = tasks;
    }
    
    console.log('フィルタリングされたタスク:', filteredTasks);
    
    // フィルタリング結果をグローバル状態として保存
    localStorage.setItem('filteredTasks', JSON.stringify(filteredTasks));
    localStorage.setItem('currentProject', projectName);
    localStorage.removeItem('currentWorkspace'); // ワークスペース選択をクリア
    
    // カスタムイベントを発火して他のコンポーネントに通知
    window.dispatchEvent(new CustomEvent('filterChanged', {
      detail: {
        type: 'project',
        value: projectName,
        filteredTasks: filteredTasks
      }
    }));
    
    // トースト通知を表示
    toast.success(`${projectName}のタスクを表示中`);
  };

  const handleWorkspaceClick = (workspaceName: string) => {
    // ワークスペースをクリックした時の処理
    console.log(`ワークスペース "${workspaceName}" が選択されました`);
    
    // 現在の選択状態を更新
    setCurrentWorkspace(workspaceName);
    setCurrentProject(null);
    
    // ワークスペース固有のタスクをフィルタリング
    let filteredTasks = [];
    
    switch (workspaceName) {
      case '個人プロジェクト':
        filteredTasks = tasks.filter((task: any) => 
          !task.workspace || task.workspace === '個人プロジェクト'
        );
        break;
      case 'チームA':
        filteredTasks = tasks.filter((task: any) => 
          task.workspace === 'チームA'
        );
        break;
      case 'プロジェクトX':
        filteredTasks = tasks.filter((task: any) => 
          task.workspace === 'プロジェクトX'
        );
        break;
      default:
        filteredTasks = tasks;
    }
    
    console.log('フィルタリングされたタスク:', filteredTasks);
    
    // フィルタリング結果をグローバル状態として保存
    localStorage.setItem('filteredTasks', JSON.stringify(filteredTasks));
    localStorage.setItem('currentWorkspace', workspaceName);
    localStorage.removeItem('currentProject'); // プロジェクト選択をクリア
    
    // カスタムイベントを発火して他のコンポーネントに通知
    window.dispatchEvent(new CustomEvent('filterChanged', {
      detail: {
        type: 'workspace',
        value: workspaceName,
        filteredTasks: filteredTasks
      }
    }));
    
    // トースト通知を表示
    toast.success(`${workspaceName}のタスクを表示中`);
  };

  if (!user) {
    return null;
  }

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width: open ? 240 : 64, // 幅を調整
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? 240 : 64, // 幅を調整
          overflowX: 'hidden',
          transition: 'width 0.3s ease-in-out',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
              TaskFlow
            </Typography>
          </motion.div>
        )}
        <Tooltip title={open ? 'サイドバーを閉じる' : 'サイドバーを開く'}>
          <IconButton onClick={onToggle} size="small">
            <SearchIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Tooltip title="新しいタスク" placement="right">
          <IconButton
            color="primary"
            sx={{
              width: '100%',
              height: 48,
              borderRadius: 2,
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
            }}
            onClick={() => navigate('/task/new')}
          >
            <AddIcon />
            {open && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                style={{ marginLeft: 8 }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  新しいタスク
                </Typography>
              </motion.div>
            )}
          </IconButton>
        </Tooltip>
      </Box>

      <Divider />

      <List sx={{ px: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                minHeight: 48,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: location.pathname === item.path ? 'white' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {open && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: location.pathname === item.path ? 600 : 500,
                    }}
                  />
                  {item.badge && (
                    <Badge
                      badgeContent={item.badge}
                      color="error"
                      sx={{
                        '& .MuiBadge-badge': {
                          backgroundColor: location.pathname === item.path ? 'white' : 'primary.main',
                          color: location.pathname === item.path ? 'primary.main' : 'white',
                        },
                      }}
                    />
                  )}
                </motion.div>
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                プロジェクト
              </Typography>
              <IconButton
                size="small"
                onClick={addNewProject}
                sx={{ color: 'primary.main', '&:hover': { backgroundColor: 'primary.50' } }}
              >
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        </motion.div>
      )}

      <List sx={{ px: 1 }}>
        {projectItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleProjectClick(item.text)}
              selected={currentProject === item.text}
              sx={{
                borderRadius: 2,
                minHeight: 48,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              {open && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Badge
                      badgeContent={item.badge}
                      color="primary"
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '0.625rem',
                          height: 18,
                          minWidth: 18,
                        },
                      }}
                    />
                    {item.text !== '個人プロジェクト' && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(item.text);
                        }}
                        sx={{ 
                          color: 'error.main', 
                          '&:hover': { backgroundColor: 'error.50' },
                          ml: 1
                        }}
                      >
                        <Delete sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              ワークスペース
            </Typography>
          </Box>
        </motion.div>
      )}

      <List sx={{ px: 1 }}>
        {workspaceItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleWorkspaceClick(item.text)}
              selected={currentWorkspace === item.text}
              sx={{
                borderRadius: 2,
                minHeight: 48,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: currentWorkspace === item.text ? 'white' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {open && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: currentWorkspace === item.text ? 600 : 500,
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {item.badge && (
                      <Badge
                        badgeContent={item.badge}
                        color="error"
                        sx={{
                          '& .MuiBadge-badge': {
                            backgroundColor: currentWorkspace === item.text ? 'white' : 'primary.main',
                            color: currentWorkspace === item.text ? 'primary.main' : 'white',
                          },
                        }}
                      />
                    )}
                    {item.text !== '個人プロジェクト' && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteWorkspace(item.text);
                        }}
                        sx={{ 
                          color: 'error.main', 
                          '&:hover': { backgroundColor: 'error.50' },
                          ml: 1
                        }}
                      >
                        <Delete sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Box>
                </motion.div>
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      <Divider />

      <List sx={{ px: 1 }}>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => navigate('/profile')}
            sx={{
              borderRadius: 2,
              minHeight: 48,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <PersonIcon />
            </ListItemIcon>
            {open && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ListItemText
                  primary="プロフィール"
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                />
              </motion.div>
            )}
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => navigate('/settings')}
            sx={{
              borderRadius: 2,
              minHeight: 48,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SettingsIcon />
            </ListItemIcon>
            {open && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ListItemText
                  primary="設定"
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                />
              </motion.div>
            )}
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar; 