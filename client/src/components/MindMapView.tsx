import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  AppBar,
  Toolbar,
  LinearProgress,
  Avatar,
  Divider,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ExpandMore,
  ExpandLess,
  AccountTree,
  Lightbulb,
  Assignment,
  CheckCircle,
  Schedule,
  PriorityHigh,
  DragIndicator,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  Settings,
  CloudUpload,
  CloudDownload,
  Share,
  Favorite,
  Star,
  StarBorder,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { setupRealtimeListener, saveTask, updateTask, deleteTask } from '../firebase';
import toast from 'react-hot-toast';

interface MindMapNode {
  id: string;
  title: string;
  description: string;
  type: 'idea' | 'task' | 'project' | 'goal';
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'inProgress' | 'done';
  position: { x: number; y: number };
  parentId?: string;
  children: string[];
  color: string;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  tags?: string[];
}

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

const MindMapView: React.FC = () => {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<MindMapNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Firebaseリスナーの設定
  useEffect(() => {
    if (!user?.id) return;

    setIsLoading(true);
    const unsubscribe = setupRealtimeListener(user.id, (firebaseTasks) => {
      setTasks(firebaseTasks);
      
      // 既存のマインドマップノードを読み込み
      const savedNodes = localStorage.getItem(`mindmap_${user.id}`);
      if (savedNodes) {
        setNodes(JSON.parse(savedNodes));
      } else {
        // デフォルトのマインドマップを作成
        createDefaultMindMap();
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // ノードの保存
  useEffect(() => {
    if (nodes.length > 0 && user?.id) {
      localStorage.setItem(`mindmap_${user.id}`, JSON.stringify(nodes));
    }
  }, [nodes, user?.id]);

  const createDefaultMindMap = () => {
    const defaultNodes: MindMapNode[] = [
      {
        id: 'root',
        title: 'プロジェクト計画',
        description: '新しいプロジェクトの全体計画',
        type: 'project',
        priority: 'high',
        status: 'todo',
        position: { x: 400, y: 300 },
        children: [],
        color: '#6366f1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: true,
        tags: ['重要', '計画'],
      },
      {
        id: 'idea-1',
        title: '市場調査',
        description: '競合他社の分析と市場動向の調査',
        type: 'idea',
        priority: 'high',
        status: 'todo',
        position: { x: 200, y: 200 },
        parentId: 'root',
        children: [],
        color: '#f59e0b',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['調査', '分析'],
      },
      {
        id: 'task-1',
        title: 'チーム編成',
        description: 'プロジェクトチームのメンバー選定',
        type: 'task',
        priority: 'medium',
        status: 'inProgress',
        position: { x: 600, y: 200 },
        parentId: 'root',
        children: [],
        color: '#10b981',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['人事', 'チーム'],
      },
      {
        id: 'goal-1',
        title: '売上目標達成',
        description: '年間売上目標の達成',
        type: 'goal',
        priority: 'high',
        status: 'todo',
        position: { x: 400, y: 500 },
        parentId: 'root',
        children: [],
        color: '#ef4444',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: true,
        tags: ['目標', '売上'],
      },
    ];
    setNodes(defaultNodes);
  };

  const addNode = (parentId?: string) => {
    const newNode: MindMapNode = {
      id: `node-${Date.now()}`,
      title: '',
      description: '',
      type: 'idea',
      priority: 'medium',
      status: 'todo',
      position: { x: Math.random() * 600 + 100, y: Math.random() * 400 + 100 },
      parentId,
      children: [],
      color: '#8b5cf6',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
    };
    setEditingNode(newNode);
    setDialogOpen(true);
  };

  const editNode = (node: MindMapNode) => {
    setEditingNode({ ...node });
    setDialogOpen(true);
  };

  const deleteNode = (nodeId: string) => {
    const deleteChildren = (id: string) => {
      const children = nodes.filter(node => node.parentId === id);
      children.forEach(child => deleteChildren(child.id));
      setNodes(prev => prev.filter(node => node.id !== id));
    };
    
    deleteChildren(nodeId);
    toast.success('ノードを削除しました');
  };

  const convertToTask = (node: MindMapNode) => {
    const newTask = {
      id: `task-${Date.now()}`,
      title: node.title,
      description: node.description,
      status: node.status,
      priority: node.priority,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      assignee: user?.name || '未設定',
      createdAt: new Date().toISOString(),
    };

    saveTask(user!.id, newTask);
    toast.success('タスクに変換しました');
  };

  const saveNode = () => {
    if (!editingNode) return;

    if (editingNode.id.startsWith('node-')) {
      // 新しいノード
      setNodes(prev => [...prev, editingNode]);
    } else {
      // 既存ノードの更新
      setNodes(prev => prev.map(node => 
        node.id === editingNode.id ? editingNode : node
      ));
    }

    setDialogOpen(false);
    setEditingNode(null);
    toast.success('ノードを保存しました');
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'idea': return '#f59e0b';
      case 'task': return '#10b981';
      case 'project': return '#6366f1';
      case 'goal': return '#ef4444';
      default: return '#8b5cf6';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'idea': return <Lightbulb sx={{ fontSize: 20 }} />;
      case 'task': return <Assignment sx={{ fontSize: 20 }} />;
      case 'project': return <AccountTree sx={{ fontSize: 20 }} />;
      case 'goal': return <Star sx={{ fontSize: 20 }} />;
      default: return <Lightbulb sx={{ fontSize: 20 }} />;
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      const newZoom = direction === 'in' ? prev * 1.2 : prev / 1.2;
      return Math.min(Math.max(newZoom, 0.5), 3);
    });
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const toggleFavorite = (nodeId: string) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, isFavorite: !node.isFavorite } : node
    ));
  };

  const filteredNodes = showFavorites ? nodes.filter(node => node.isFavorite) : nodes;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <AppBar position="static" elevation={0} sx={{ backgroundColor: 'white', color: 'text.primary' }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <AccountTree sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
              マインドマップ
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="お気に入りのみ表示">
              <IconButton 
                onClick={() => setShowFavorites(!showFavorites)}
                color={showFavorites ? 'primary' : 'default'}
              >
                <Favorite />
              </IconButton>
            </Tooltip>
            <Tooltip title="ズームイン">
              <IconButton onClick={() => handleZoom('in')}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
            <Tooltip title="ズームアウト">
              <IconButton onClick={() => handleZoom('out')}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
            <Tooltip title="ビューをリセット">
              <IconButton onClick={resetView}>
                <CenterFocusStrong />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => addNode()}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              ノードを追加
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {isLoading && <LinearProgress />}

      {/* マインドマップキャンバス */}
      <Paper
        ref={canvasRef}
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 0,
        }}
      >
        <Box
          sx={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center',
            transition: 'transform 0.3s ease',
            position: 'relative',
            width: '100%',
            height: '100%',
          }}
        >
          {/* 接続線を描画 */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            {filteredNodes.map((node) => {
              if (!node.parentId) return null;
              const parent = filteredNodes.find(n => n.id === node.parentId);
              if (!parent) return null;

              const startX = parent.position.x + 150;
              const startY = parent.position.y + 75;
              const endX = node.position.x + 150;
              const endY = node.position.y + 75;

              return (
                <line
                  key={`${parent.id}-${node.id}`}
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={getNodeColor(node.type)}
                  strokeWidth={3}
                  opacity={0.8}
                  strokeDasharray="5,5"
                />
              );
            })}
          </svg>

          {/* ノードを描画 */}
          <AnimatePresence>
            {filteredNodes.map((node) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  left: node.position.x,
                  top: node.position.y,
                  zIndex: node.parentId ? 1 : 2,
                }}
              >
                <Card
                  sx={{
                    minWidth: 300,
                    maxWidth: 350,
                    background: `linear-gradient(135deg, ${getNodeColor(node.type)} 0%, ${getNodeColor(node.type)}dd 100%)`,
                    color: 'white',
                    cursor: 'pointer',
                    borderRadius: 3,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    border: node.isFavorite ? '2px solid #fbbf24' : 'none',
                    '&:hover': {
                      transform: 'scale(1.05) translateY(-5px)',
                      boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
                    },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onClick={() => setSelectedNode(node)}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                        <Avatar 
                          sx={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            width: 40,
                            height: 40,
                          }}
                        >
                          {getNodeIcon(node.type)}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                            {node.title}
                          </Typography>
                          {node.tags && node.tags.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {node.tags.slice(0, 2).map((tag, index) => (
                                <Chip
                                  key={index}
                                  label={tag}
                                  size="small"
                                  sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    height: 20,
                                  }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="お気に入り">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(node.id);
                            }}
                            sx={{ color: node.isFavorite ? '#fbbf24' : 'rgba(255, 255, 255, 0.7)' }}
                          >
                            {node.isFavorite ? <Star /> : <StarBorder />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="編集">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              editNode(node);
                            }}
                            sx={{ color: 'white' }}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="削除">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNode(node.id);
                            }}
                            sx={{ color: 'white' }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    {node.description && (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          mb: 2, 
                          opacity: 0.9,
                          lineHeight: 1.5,
                          fontStyle: 'italic',
                        }}
                      >
                        {node.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip
                        label={node.status === 'todo' ? '未着手' : node.status === 'inProgress' ? '進行中' : '完了'}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                      <Chip
                        label={node.priority === 'high' ? '高優先' : node.priority === 'medium' ? '中優先' : '低優先'}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    </Box>

                    <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          addNode(node.id);
                        }}
                        sx={{
                          borderColor: 'white',
                          color: 'white',
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          '&:hover': {
                            borderColor: 'white',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          },
                        }}
                      >
                        子ノード追加
                      </Button>
                      {node.type === 'idea' && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            convertToTask(node);
                          }}
                          sx={{
                            borderColor: 'white',
                            color: 'white',
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            '&:hover': {
                              borderColor: 'white',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            },
                          }}
                        >
                          タスク化
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      </Paper>

      {/* ノード編集ダイアログ */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          borderRadius: '12px 12px 0 0',
          pb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {editingNode && getNodeIcon(editingNode.type)}
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {editingNode?.id ? 'ノードを編集' : '新しいノード'}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="タイトル"
                value={editingNode?.title || ''}
                onChange={(e) => setEditingNode(prev => prev ? { ...prev, title: e.target.value } : null)}
                variant="outlined"
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
                value={editingNode?.description || ''}
                onChange={(e) => setEditingNode(prev => prev ? { ...prev, description: e.target.value } : null)}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>タイプ</InputLabel>
                <Select
                  value={editingNode?.type || 'idea'}
                  onChange={(e) => setEditingNode(prev => prev ? { ...prev, type: e.target.value as any } : null)}
                  label="タイプ"
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  <MenuItem value="idea">アイデア 💡</MenuItem>
                  <MenuItem value="task">タスク ✅</MenuItem>
                  <MenuItem value="project">プロジェクト 📋</MenuItem>
                  <MenuItem value="goal">目標 🎯</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>優先度</InputLabel>
                <Select
                  value={editingNode?.priority || 'medium'}
                  onChange={(e) => setEditingNode(prev => prev ? { ...prev, priority: e.target.value as any } : null)}
                  label="優先度"
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  <MenuItem value="low">低優先度</MenuItem>
                  <MenuItem value="medium">中優先度</MenuItem>
                  <MenuItem value="high">高優先度</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={editingNode?.status || 'todo'}
                  onChange={(e) => setEditingNode(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                  label="ステータス"
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  <MenuItem value="todo">未着手</MenuItem>
                  <MenuItem value="inProgress">進行中</MenuItem>
                  <MenuItem value="done">完了</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="タグ（カンマ区切り）"
                value={editingNode?.tags?.join(', ') || ''}
                onChange={(e) => {
                  const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                  setEditingNode(prev => prev ? { ...prev, tags } : null);
                }}
                variant="outlined"
                placeholder="重要, 計画, 分析"
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
            onClick={() => setDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            キャンセル
          </Button>
          <Button 
            onClick={saveNode} 
            variant="contained"
            sx={{ 
              borderRadius: 2, 
              textTransform: 'none', 
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5b5feb 0%, #7c3aed 100%)',
              }
            }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MindMapView; 