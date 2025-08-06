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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Checkbox,
  TablePagination,
  TableSortLabel,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  Sort,
  Assignment,
  Person,
  CalendarToday,
  PriorityHigh,
  CheckCircle,
  Schedule,
  Warning,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { setupRealtimeListener, saveTask, updateTask, deleteTask } from '../firebase';

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

type Order = 'asc' | 'desc';
type OrderBy = 'title' | 'status' | 'priority' | 'dueDate' | 'assignee' | 'createdAt';

const ListView: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<OrderBy>('createdAt');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
      console.log('ListView: フィルタ変更を検知:', type, value, filteredTasks);
      
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
    filterAndSortTasks();
  }, [tasks, searchTerm, statusFilter, priorityFilter, order, orderBy]);

  const filterAndSortTasks = () => {
    let filtered = tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.assignee.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });

    // ソート
    filtered.sort((a, b) => {
      let aValue: any = a[orderBy];
      let bValue: any = b[orderBy];

      if (orderBy === 'dueDate' || orderBy === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (order === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    setFilteredTasks(filtered);
  };

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = filteredTasks.map(n => n.id);
      setSelectedTasks(newSelected);
      return;
    }
    setSelectedTasks([]);
  };

  const handleClick = (id: string) => {
    const selectedIndex = selectedTasks.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedTasks, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedTasks.slice(1));
    } else if (selectedIndex === selectedTasks.length - 1) {
      newSelected = newSelected.concat(selectedTasks.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedTasks.slice(0, selectedIndex),
        selectedTasks.slice(selectedIndex + 1),
      );
    }

    setSelectedTasks(newSelected);
  };

  const isSelected = (id: string) => selectedTasks.indexOf(id) !== -1;

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

  const handleDeleteSelected = async () => {
    if (!user?.id) return;

    try {
      for (const taskId of selectedTasks) {
        await deleteTask(user.id, taskId);
      }
      setSelectedTasks([]);
    } catch (error) {
      console.error('選択されたタスクの削除に失敗しました:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return '#6b7280';
      case 'inProgress': return '#3b82f6';
      case 'done': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo': return <Assignment />;
      case 'inProgress': return <Schedule />;
      case 'done': return <CheckCircle />;
      default: return <Assignment />;
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

  return (
    <Box sx={{ p: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            リストビュー
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {selectedTasks.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleDeleteSelected}
              >
                選択削除 ({selectedTasks.length})
              </Button>
            )}
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
        </Box>

        {/* フィルター */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                placeholder="タスクを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 250 }}
              />
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="ステータス"
                >
                  <MenuItem value="all">すべて</MenuItem>
                  <MenuItem value="todo">未着手</MenuItem>
                  <MenuItem value="inProgress">進行中</MenuItem>
                  <MenuItem value="done">完了</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>優先度</InputLabel>
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  label="優先度"
                >
                  <MenuItem value="all">すべて</MenuItem>
                  <MenuItem value="low">低</MenuItem>
                  <MenuItem value="medium">中</MenuItem>
                  <MenuItem value="high">高</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>

        {/* タスクテーブル */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedTasks.length > 0 && selectedTasks.length < filteredTasks.length}
                        checked={filteredTasks.length > 0 && selectedTasks.length === filteredTasks.length}
                        onChange={handleSelectAllClick}
                      />
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'title'}
                        direction={orderBy === 'title' ? order : 'asc'}
                        onClick={() => handleRequestSort('title')}
                      >
                        タイトル
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'status'}
                        direction={orderBy === 'status' ? order : 'asc'}
                        onClick={() => handleRequestSort('status')}
                      >
                        ステータス
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'priority'}
                        direction={orderBy === 'priority' ? order : 'asc'}
                        onClick={() => handleRequestSort('priority')}
                      >
                        優先度
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'dueDate'}
                        direction={orderBy === 'dueDate' ? order : 'asc'}
                        onClick={() => handleRequestSort('dueDate')}
                      >
                        期限
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'assignee'}
                        direction={orderBy === 'assignee' ? order : 'asc'}
                        onClick={() => handleRequestSort('assignee')}
                      >
                        担当者
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'createdAt'}
                        direction={orderBy === 'createdAt' ? order : 'asc'}
                        onClick={() => handleRequestSort('createdAt')}
                      >
                        作成日
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">アクション</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTasks
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((task) => {
                      const isItemSelected = isSelected(task.id);
                      return (
                        <TableRow
                          hover
                          key={task.id}
                          selected={isItemSelected}
                          onClick={() => handleClick(task.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox checked={isItemSelected} />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ bgcolor: getStatusColor(task.status), width: 32, height: 32 }}>
                                {getStatusIcon(task.status)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {task.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {task.description}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={task.status === 'todo' ? '未着手' : task.status === 'inProgress' ? '進行中' : '完了'}
                              size="small"
                              sx={{
                                backgroundColor: getStatusColor(task.status),
                                color: 'white',
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar
                                sx={{
                                  width: 24,
                                  height: 24,
                                  bgcolor: getPriorityColor(task.priority),
                                }}
                              >
                                {getPriorityIcon(task.priority)}
                              </Avatar>
                              <Typography variant="body2">
                                {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2">
                                {format(new Date(task.dueDate), 'M/d', { locale: ja })}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {task.assignee ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2">{task.assignee}</Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                未割り当て
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {format(new Date(task.createdAt), 'M/d', { locale: ja })}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="編集">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTask(task);
                                    setDialogOpen(true);
                                  }}
                                >
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="削除">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const updatedTasks = tasks.filter(t => t.id !== task.id);
                                    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
                                    setTasks(updatedTasks);
                                  }}
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredTasks.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="行数:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
            />
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

export default ListView; 