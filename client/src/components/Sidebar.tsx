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
  ];

  const workspaceItems = [
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
  ];

  const projectItems = [
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
      workspaceItems.push(newWorkspace);
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
      projectItems.push(newProject);
      toast.success(`プロジェクト「${newName}」を作成しました`);
    }
  };

  // ワークスペース/プロジェクトを削除
  const deleteWorkspace = (workspaceName: string) => {
    if (confirm(`ワークスペース「${workspaceName}」を削除しますか？`)) {
      const index = workspaceItems.findIndex(item => item.text === workspaceName);
      if (index > -1) {
        workspaceItems.splice(index, 1);
        toast.success(`ワークスペース「${workspaceName}」を削除しました`);
      }
    }
  };

  const deleteProject = (projectName: string) => {
    if (confirm(`プロジェクト「${projectName}」を削除しますか？`)) {
      const index = projectItems.findIndex(item => item.text === projectName);
      if (index > -1) {
        projectItems.splice(index, 1);
        toast.success(`プロジェクト「${projectName}」を削除しました`);
      }
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
    // 個人プロジェクトのタスク数（デモユーザー、個人、またはassigneeが空のタスク）
    const personalCount = tasks.filter((task: any) => 
      !task.assignee || task.assignee === 'デモユーザー' || task.assignee === '個人'
    ).length;
    workspaceItems[0].badge = personalCount > 0 ? personalCount : null;
    
    // チームAのタスク数（進行中のタスク）
    const teamACount = tasks.filter((task: any) => 
      task.status === 'inProgress'
    ).length;
    workspaceItems[1].badge = teamACount > 0 ? teamACount : null;
    
    // プロジェクトXのタスク数（高優先度のタスク）
    const projectXCount = tasks.filter((task: any) => 
      task.priority === 'high'
    ).length;
    workspaceItems[2].badge = projectXCount > 0 ? projectXCount : null;

    // プロジェクトのバッジ数を更新
    projectItems[0].badge = personalCount > 0 ? personalCount : null;
    
    const workCount = tasks.filter((task: any) => 
      task.assignee === '仕事' || task.priority === 'high'
    ).length;
    projectItems[1].badge = workCount > 0 ? workCount : null;
    
    const studyCount = tasks.filter((task: any) => 
      task.assignee === '学習' || task.priority === 'medium'
    ).length;
    projectItems[2].badge = studyCount > 0 ? studyCount : null;
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
        filteredTasks = tasks.filter((task: any) => !task.assignee || task.assignee === '個人' || task.assignee === 'デモユーザー');
        break;
      case '仕事':
        filteredTasks = tasks.filter((task: any) => task.assignee === '仕事' || task.priority === 'high');
        break;
      case '学習':
        filteredTasks = tasks.filter((task: any) => task.assignee === '学習' || task.priority === 'medium');
        break;
      default:
        filteredTasks = tasks;
    }
    
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
        filteredTasks = tasks.filter((task: any) => !task.assignee || task.assignee === '個人' || task.assignee === 'デモユーザー');
        break;
      case 'チームA':
        filteredTasks = tasks.filter((task: any) => task.assignee === 'チームA' || task.status === 'inProgress');
        break;
      case 'プロジェクトX':
        filteredTasks = tasks.filter((task: any) => task.assignee === 'プロジェクトX' || task.priority === 'high');
        break;
      default:
        filteredTasks = tasks;
    }
    
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