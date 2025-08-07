import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Slider,
  Switch,
  FormControlLabel,
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
  PanTool,
  Gesture,
  AutoFixHigh,
  Psychology,
  Timeline,
  TrendingUp,
  Group,
  Public,
  Lock,
} from '@mui/icons-material';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { setupRealtimeListener, saveTask, updateTask, deleteTask } from '../firebase';
import toast from 'react-hot-toast';

interface MindMapNode {
  id: string;
  title: string;
  description: string;
  type: 'idea' | 'task' | 'project' | 'goal' | 'concept' | 'strategy' | 'milestone';
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
  size?: 'small' | 'medium' | 'large';
  complexity?: 'simple' | 'moderate' | 'complex';
  impact?: 'low' | 'medium' | 'high';
  timeEstimate?: number; // 時間見積もり（分）
  dependencies?: string[]; // 依存関係
  collaborators?: string[]; // 共同作業者
  isPublic?: boolean; // 公開設定
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
  const [isPanMode, setIsPanMode] = useState(false);
  const [isCollaborationMode, setIsCollaborationMode] = useState(false);
  const [autoLayout, setAutoLayout] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [canvasRef] = useState(useRef<HTMLDivElement>(null));
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  // リアルタイムリスナーを設定
  useEffect(() => {
    if (!user?.id) return;

    setIsLoading(true);
    const unsubscribe = setupRealtimeListener(user.id, (firebaseTasks) => {
      setTasks(firebaseTasks);
      setIsLoading(false);
    });

    // マインドマップノードの初期化
    const savedNodes = localStorage.getItem(`mindmap_${user.id}`);
    if (savedNodes) {
      setNodes(JSON.parse(savedNodes));
    } else {
      createDefaultMindMap();
    }

    return () => unsubscribe();
  }, [user?.id]);

  // ノードの変更を保存
  useEffect(() => {
    if (nodes.length > 0 && user?.id) {
      localStorage.setItem(`mindmap_${user.id}`, JSON.stringify(nodes));
    }
  }, [nodes, user?.id]);

  const createDefaultMindMap = () => {
    const defaultNodes: MindMapNode[] = [
      {
        id: 'node-1',
        title: 'プロジェクト成功の鍵',
        description: 'プロジェクトを成功させるための重要な要素を整理',
        type: 'strategy',
        priority: 'high',
        status: 'todo',
        position: { x: 400, y: 300 },
        children: ['node-2', 'node-3', 'node-4'],
        color: '#6366f1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        size: 'large',
        complexity: 'complex',
        impact: 'high',
        timeEstimate: 480,
        isPublic: true,
      },
      {
        id: 'node-2',
        title: 'チーム構築',
        description: '効果的なチームメンバーの選定と役割分担',
        type: 'concept',
        priority: 'high',
        status: 'inProgress',
        position: { x: 200, y: 150 },
        parentId: 'node-1',
        children: [],
        color: '#8b5cf6',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        size: 'medium',
        complexity: 'moderate',
        impact: 'high',
        timeEstimate: 120,
        tags: ['重要', 'チーム'],
      },
      {
        id: 'node-3',
        title: '技術選定',
        description: '最新技術の調査と最適な技術スタックの決定',
        type: 'idea',
        priority: 'medium',
        status: 'todo',
        position: { x: 600, y: 150 },
        parentId: 'node-1',
        children: [],
        color: '#06b6d4',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        size: 'medium',
        complexity: 'moderate',
        impact: 'medium',
        timeEstimate: 180,
        tags: ['技術', '調査'],
      },
      {
        id: 'node-4',
        title: 'マーケティング戦略',
        description: 'ターゲット市場の分析と効果的なマーケティング手法',
        type: 'strategy',
        priority: 'high',
        status: 'todo',
        position: { x: 400, y: 450 },
        parentId: 'node-1',
        children: [],
        color: '#10b981',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        size: 'medium',
        complexity: 'complex',
        impact: 'high',
        timeEstimate: 240,
        tags: ['マーケティング', '戦略'],
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
      position: {
        x: parentId ? 400 : Math.random() * 800 + 100,
        y: parentId ? 300 : Math.random() * 600 + 100,
      },
      parentId,
      children: [],
      color: '#6366f1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      size: 'medium',
      complexity: 'simple',
      impact: 'medium',
      timeEstimate: 60,
      tags: [],
    };

    setNodes(prev => [...prev, newNode]);
    setEditingNode(newNode);
    setDialogOpen(true);
  };

  const editNode = (node: MindMapNode) => {
    setEditingNode({ ...node });
    setDialogOpen(true);
  };

  const deleteNode = (nodeId: string) => {
    const deleteChildren = (id: string) => {
      const node = nodes.find(n => n.id === id);
      if (node) {
        node.children.forEach(childId => deleteChildren(childId));
        setNodes(prev => prev.filter(n => n.id !== id));
      }
    };

    deleteChildren(nodeId);
    toast.success('ノードを削除しました');
  };

  const convertToTask = (node: MindMapNode) => {
    const task: Task = {
      id: `task-${Date.now()}`,
      title: node.title,
      description: node.description,
      status: node.status,
      priority: node.priority,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      assignee: user?.name || '未設定',
      createdAt: new Date().toISOString(),
    };

    saveTask(user?.id || '', task);
    toast.success('タスクに変換しました');
  };

  const saveNode = () => {
    if (!editingNode) return;

    if (editingNode.id.startsWith('node-')) {
      // 新しいノード
      setNodes(prev => [...prev, editingNode]);
    } else {
      // 既存のノードを更新
      setNodes(prev => prev.map(node => 
        node.id === editingNode.id ? { ...editingNode, updatedAt: new Date().toISOString() } : node
      ));
    }

    setDialogOpen(false);
    setEditingNode(null);
    toast.success('ノードを保存しました');
  };

  const getNodeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      idea: '#06b6d4',
      task: '#6366f1',
      project: '#8b5cf6',
      goal: '#10b981',
      concept: '#f59e0b',
      strategy: '#ef4444',
      milestone: '#ec4899',
    };
    return colors[type] || '#6366f1';
  };

  const getNodeIcon = (type: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      idea: <Lightbulb sx={{ fontSize: 20 }} />,
      task: <Assignment sx={{ fontSize: 20 }} />,
      project: <AccountTree sx={{ fontSize: 20 }} />,
      goal: <CheckCircle sx={{ fontSize: 20 }} />,
      concept: <Psychology sx={{ fontSize: 20 }} />,
      strategy: <TrendingUp sx={{ fontSize: 20 }} />,
      milestone: <Timeline sx={{ fontSize: 20 }} />,
    };
    return icons[type] || <Lightbulb sx={{ fontSize: 20 }} />;
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const newZoom = direction === 'in' ? zoom * 1.2 : zoom / 1.2;
    setZoom(Math.min(Math.max(newZoom, 0.3), 3));
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

  // ドラッグ機能
  const handleDragStart = (nodeId: string, event: React.MouseEvent) => {
    if (isPanMode) return;
    setIsDragging(true);
    setDraggedNode(nodeId);
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  const handleDrag = useCallback((event: MouseEvent) => {
    if (!isDragging || !draggedNode || isPanMode) return;

    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;

    setNodes(prev => prev.map(node => 
      node.id === draggedNode 
        ? { ...node, position: { x: node.position.x + deltaX, y: node.position.y + deltaY } }
        : node
    ));

    setDragStart({ x: event.clientX, y: event.clientY });
  }, [isDragging, draggedNode, dragStart, isPanMode]);

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedNode(null);
  };

  // パン機能
  const handlePanStart = (event: React.MouseEvent) => {
    if (!isPanMode) return;
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  const handlePanMove = (event: MouseEvent) => {
    if (!isPanMode) return;
    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;
    setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  // 自動レイアウト機能
  const applyAutoLayout = () => {
    if (!autoLayout) return;
    
    setNodes(prev => {
      const rootNodes = prev.filter(node => !node.parentId);
      const layoutedNodes = [...prev];
      
      rootNodes.forEach((rootNode, index) => {
        const angle = (index * 2 * Math.PI) / rootNodes.length;
        const radius = 300;
        const x = 400 + radius * Math.cos(angle);
        const y = 300 + radius * Math.sin(angle);
        
        const nodeIndex = layoutedNodes.findIndex(n => n.id === rootNode.id);
        if (nodeIndex !== -1) {
          layoutedNodes[nodeIndex] = { ...rootNode, position: { x, y } };
        }
      });
      
      return layoutedNodes;
    });
  };

  useEffect(() => {
    if (autoLayout) {
      applyAutoLayout();
    }
  }, [autoLayout]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDrag]);

  useEffect(() => {
    if (isPanMode) {
      document.addEventListener('mousemove', handlePanMove);
      return () => {
        document.removeEventListener('mousemove', handlePanMove);
      };
    }
  }, [isPanMode, handlePanMove]);

  const filteredNodes = showFavorites ? nodes.filter(node => node.isFavorite) : nodes;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <AppBar position="static" elevation={0} sx={{ backgroundColor: 'white', color: 'text.primary' }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <AccountTree sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
              画期的マインドマップ
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isPanMode}
                  onChange={(e) => setIsPanMode(e.target.checked)}
                  size="small"
                />
              }
              label="パンモード"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={autoLayout}
                  onChange={(e) => setAutoLayout(e.target.checked)}
                  size="small"
                />
              }
              label="自動レイアウト"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={isCollaborationMode}
                  onChange={(e) => setIsCollaborationMode(e.target.checked)}
                  size="small"
                />
              }
              label="コラボレーション"
            />
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
          cursor: isPanMode ? 'grab' : 'default',
        }}
        onMouseDown={isPanMode ? handlePanStart : undefined}
      >
        <Box
          sx={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center',
            transition: isDragging ? 'none' : 'transform 0.3s ease',
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
                onMouseDown={(e) => handleDragStart(node.id, e)}
              >
                <Card
                  sx={{
                    minWidth: node.size === 'large' ? 400 : node.size === 'small' ? 250 : 300,
                    maxWidth: node.size === 'large' ? 450 : node.size === 'small' ? 300 : 350,
                    background: `linear-gradient(135deg, ${getNodeColor(node.type)} 0%, ${getNodeColor(node.type)}dd 100%)`,
                    color: 'white',
                    cursor: isPanMode ? 'grab' : 'pointer',
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
                            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
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
                            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    {node.description && (
                      <Typography variant="body2" sx={{ mb: 2, opacity: 0.9, lineHeight: 1.5, fontStyle: 'italic' }}>
                        {node.description}
                      </Typography>
                    )}
                    
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip 
                        label={node.status === 'todo' ? '未着手' : node.status === 'inProgress' ? '進行中' : '完了'} 
                        size="small" 
                        sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white', fontWeight: 600 }} 
                      />
                      <Chip 
                        label={node.priority === 'high' ? '高優先' : node.priority === 'medium' ? '中優先' : '低優先'} 
                        size="small" 
                        sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white', fontWeight: 600 }} 
                      />
                      {node.timeEstimate && (
                        <Chip 
                          label={`${Math.round(node.timeEstimate / 60)}時間`} 
                          size="small" 
                          sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white', fontWeight: 600 }} 
                        />
                      )}
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
                            backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                          } 
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
                              backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                            } 
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="説明"
                value={editingNode?.description || ''}
                onChange={(e) => setEditingNode(prev => prev ? { ...prev, description: e.target.value } : null)}
                variant="outlined"
                multiline
                rows={3}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                <InputLabel>タイプ</InputLabel>
                <Select
                  value={editingNode?.type || 'idea'}
                  onChange={(e) => setEditingNode(prev => prev ? { ...prev, type: e.target.value as any } : null)}
                  label="タイプ"
                >
                  <MenuItem value="idea">アイデア 💡</MenuItem>
                  <MenuItem value="task">タスク 📋</MenuItem>
                  <MenuItem value="project">プロジェクト 🚀</MenuItem>
                  <MenuItem value="goal">目標 🎯</MenuItem>
                  <MenuItem value="concept">コンセプト 🧠</MenuItem>
                  <MenuItem value="strategy">戦略 📊</MenuItem>
                  <MenuItem value="milestone">マイルストーン 🏁</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                <InputLabel>優先度</InputLabel>
                <Select
                  value={editingNode?.priority || 'medium'}
                  onChange={(e) => setEditingNode(prev => prev ? { ...prev, priority: e.target.value as any } : null)}
                  label="優先度"
                >
                  <MenuItem value="low">低優先度</MenuItem>
                  <MenuItem value="medium">中優先度</MenuItem>
                  <MenuItem value="high">高優先度</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                <InputLabel>サイズ</InputLabel>
                <Select
                  value={editingNode?.size || 'medium'}
                  onChange={(e) => setEditingNode(prev => prev ? { ...prev, size: e.target.value as any } : null)}
                  label="サイズ"
                >
                  <MenuItem value="small">小</MenuItem>
                  <MenuItem value="medium">中</MenuItem>
                  <MenuItem value="large">大</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="時間見積もり（分）"
                type="number"
                value={editingNode?.timeEstimate || 60}
                onChange={(e) => setEditingNode(prev => prev ? { ...prev, timeEstimate: parseInt(e.target.value) } : null)}
                variant="outlined"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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