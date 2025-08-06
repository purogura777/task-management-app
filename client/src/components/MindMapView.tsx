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
  const canvasRef = useRef<HTMLDivElement>(null);

  // Firebaseリスナーの設定
  useEffect(() => {
    if (!user?.id) return;

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
    });

    return () => unsubscribe();
  }, [user?.id]);

  // マインドマップノードの保存
  useEffect(() => {
    if (user?.id && nodes.length > 0) {
      localStorage.setItem(`mindmap_${user.id}`, JSON.stringify(nodes));
    }
  }, [nodes, user?.id]);

  // デフォルトのマインドマップを作成
  const createDefaultMindMap = () => {
    const defaultNodes: MindMapNode[] = [
      {
        id: 'root',
        title: 'プロジェクト管理',
        description: 'メインのプロジェクト管理ノード',
        type: 'project',
        priority: 'high',
        status: 'inProgress',
        position: { x: 0, y: 0 },
        children: ['task1', 'task2', 'idea1'],
        color: '#6366f1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task1',
        title: 'タスク管理システムの構築',
        description: '効率的なタスク管理システムを構築する',
        type: 'task',
        priority: 'high',
        status: 'todo',
        position: { x: -200, y: -100 },
        parentId: 'root',
        children: [],
        color: '#ef4444',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task2',
        title: 'ユーザーインターフェースの改善',
        description: 'ユーザビリティを向上させるUIの改善',
        type: 'task',
        priority: 'medium',
        status: 'inProgress',
        position: { x: 200, y: -100 },
        parentId: 'root',
        children: [],
        color: '#f59e0b',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'idea1',
        title: 'AI機能の統合',
        description: 'AIを活用した自動化機能のアイデア',
        type: 'idea',
        priority: 'low',
        status: 'todo',
        position: { x: 0, y: 100 },
        parentId: 'root',
        children: [],
        color: '#10b981',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    setNodes(defaultNodes);
  };

  // ノードを追加
  const addNode = (parentId?: string) => {
    const newNode: MindMapNode = {
      id: `node_${Date.now()}`,
      title: '新しいノード',
      description: '',
      type: 'idea',
      priority: 'medium',
      status: 'todo',
      position: { x: Math.random() * 400 - 200, y: Math.random() * 400 - 200 },
      parentId,
      children: [],
      color: '#6366f1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNodes(prev => [...prev, newNode]);
    
    // 親ノードのchildrenを更新
    if (parentId) {
      setNodes(prev => prev.map(node => 
        node.id === parentId 
          ? { ...node, children: [...node.children, newNode.id] }
          : node
      ));
    }

    setEditingNode(newNode);
    setDialogOpen(true);
  };

  // ノードを編集
  const editNode = (node: MindMapNode) => {
    setEditingNode(node);
    setDialogOpen(true);
  };

  // ノードを削除
  const deleteNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // 子ノードも削除
    const deleteChildren = (id: string) => {
      const children = nodes.filter(n => n.parentId === id);
      children.forEach(child => deleteChildren(child.id));
      setNodes(prev => prev.filter(n => n.id !== id));
    };

    deleteChildren(nodeId);

    // 親ノードのchildrenから削除
    if (node.parentId) {
      setNodes(prev => prev.map(n => 
        n.id === node.parentId 
          ? { ...n, children: n.children.filter(id => id !== nodeId) }
          : n
      ));
    }

    toast.success('ノードを削除しました');
  };

  // ノードをタスクに変換
  const convertToTask = (node: MindMapNode) => {
    const task: Task = {
      id: node.id,
      title: node.title,
      description: node.description,
      status: node.status,
      priority: node.priority,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      assignee: user?.name || 'デモユーザー',
      createdAt: node.createdAt,
    };

    saveTask(user!.id, task);
    toast.success('タスクに変換しました');
  };

  // ノードを保存
  const saveNode = () => {
    if (!editingNode) return;

    setNodes(prev => prev.map(node => 
      node.id === editingNode.id 
        ? { ...editingNode, updatedAt: new Date().toISOString() }
        : node
    ));

    setDialogOpen(false);
    setEditingNode(null);
    toast.success('ノードを保存しました');
  };

  // ノードの色を取得
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'idea': return '#10b981';
      case 'task': return '#ef4444';
      case 'project': return '#6366f1';
      case 'goal': return '#f59e0b';
      default: return '#6366f1';
    }
  };

  // ノードのアイコンを取得
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'idea': return <Lightbulb />;
      case 'task': return <Assignment />;
      case 'project': return <AccountTree />;
      case 'goal': return <CheckCircle />;
      default: return <Lightbulb />;
    }
  };

  // ズーム機能
  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      const newZoom = direction === 'in' ? prev * 1.2 : prev / 1.2;
      return Math.max(0.5, Math.min(2, newZoom));
    });
  };

  // リセット機能
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <Box sx={{ p: 3, height: '100vh', overflow: 'hidden' }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          マインドマップ
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
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
          >
            ノードを追加
          </Button>
        </Box>
      </Box>

      {/* マインドマップキャンバス */}
      <Paper
        ref={canvasRef}
        sx={{
          height: 'calc(100vh - 200px)',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#f8fafc',
          borderRadius: 3,
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
          {/* ノードを描画 */}
          <AnimatePresence>
            {nodes.map((node) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'absolute',
                  left: node.position.x + 50,
                  top: node.position.y + 50,
                  zIndex: node.parentId ? 1 : 2,
                }}
              >
                <Card
                  sx={{
                    minWidth: 200,
                    maxWidth: 250,
                    backgroundColor: getNodeColor(node.type),
                    color: 'white',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                  onClick={() => setSelectedNode(node)}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getNodeIcon(node.type)}
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {node.title}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
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
                      <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>
                        {node.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip
                        label={node.status === 'todo' ? '未着手' : node.status === 'inProgress' ? '進行中' : '完了'}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                        }}
                      />
                      <Chip
                        label={node.priority === 'high' ? '高' : node.priority === 'medium' ? '中' : '低'}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                        }}
                      />
                    </Box>

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
            {nodes.map((node) => {
              if (!node.parentId) return null;
              const parent = nodes.find(n => n.id === node.parentId);
              if (!parent) return null;

              const startX = parent.position.x + 125;
              const startY = parent.position.y + 50;
              const endX = node.position.x + 125;
              const endY = node.position.y + 50;

              return (
                <line
                  key={`${parent.id}-${node.id}`}
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={getNodeColor(node.type)}
                  strokeWidth={2}
                  opacity={0.6}
                />
              );
            })}
          </svg>
        </Box>
      </Paper>

      {/* ノード編集ダイアログ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingNode?.id ? 'ノードを編集' : '新しいノード'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="タイトル"
              value={editingNode?.title || ''}
              onChange={(e) => setEditingNode(prev => prev ? { ...prev, title: e.target.value } : null)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="説明"
              multiline
              rows={3}
              value={editingNode?.description || ''}
              onChange={(e) => setEditingNode(prev => prev ? { ...prev, description: e.target.value } : null)}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>タイプ</InputLabel>
                <Select
                  value={editingNode?.type || 'idea'}
                  onChange={(e) => setEditingNode(prev => prev ? { ...prev, type: e.target.value as any } : null)}
                  label="タイプ"
                >
                  <MenuItem value="idea">アイデア</MenuItem>
                  <MenuItem value="task">タスク</MenuItem>
                  <MenuItem value="project">プロジェクト</MenuItem>
                  <MenuItem value="goal">目標</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>優先度</InputLabel>
                <Select
                  value={editingNode?.priority || 'medium'}
                  onChange={(e) => setEditingNode(prev => prev ? { ...prev, priority: e.target.value as any } : null)}
                  label="優先度"
                >
                  <MenuItem value="low">低</MenuItem>
                  <MenuItem value="medium">中</MenuItem>
                  <MenuItem value="high">高</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <FormControl fullWidth>
              <InputLabel>ステータス</InputLabel>
              <Select
                value={editingNode?.status || 'todo'}
                onChange={(e) => setEditingNode(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                label="ステータス"
              >
                <MenuItem value="todo">未着手</MenuItem>
                <MenuItem value="inProgress">進行中</MenuItem>
                <MenuItem value="done">完了</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={saveNode} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MindMapView; 