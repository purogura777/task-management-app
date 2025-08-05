import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Card,
  CardContent,
  IconButton,
  Grid,
  Container,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { setupRealtimeListener, updateTask } from '../firebase';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inProgress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

const TaskBoard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    // Firebaseのリアルタイムリスナーを設定
    const unsubscribe = setupRealtimeListener(user.id, (firebaseTasks) => {
      setTasks(firebaseTasks);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !user?.id) return;

    const { source, destination } = result;
    const newTasks = Array.from(tasks);
    const [reorderedTask] = newTasks.splice(source.index, 1);
    reorderedTask.status = destination.droppableId as Task['status'];
    reorderedTask.updatedAt = new Date().toISOString();
    newTasks.splice(destination.index, 0, reorderedTask);

    // Firebaseに更新を保存
    try {
      await updateTask(user.id, reorderedTask.id, {
        status: reorderedTask.status,
        updatedAt: reorderedTask.updatedAt,
      });
    } catch (error) {
      console.error('タスクの更新に失敗しました:', error);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const newTasks = tasks.filter(task => task.id !== taskId);
    saveTasks(newTasks);
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getPriorityLabel = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '低';
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'todo': return '未着手';
      case 'inProgress': return '進行中';
      case 'done': return '完了';
      default: return '未着手';
    }
  };

  const columns = [
    { id: 'todo', title: '未着手', color: '#ff9800' },
    { id: 'inProgress', title: '進行中', color: '#2196f3' },
    { id: 'done', title: '完了', color: '#4caf50' },
  ];

  const filteredTasks = (status: Task['status']) => {
    return tasks.filter(task => task.status === status);
  };

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h5" align="center">
          ログインしてください
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={3}>
          {columns.map((column) => (
            <Grid item xs={12} md={4} key={column.id}>
              <Paper
                sx={{
                  p: 2,
                  minHeight: '70vh',
                  backgroundColor: `${column.color}10`,
                  border: `2px solid ${column.color}`,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: column.color, fontWeight: 'bold' }}>
                    {column.title}
                  </Typography>
                  <Chip
                    label={filteredTasks(column.id as Task['status']).length}
                    size="small"
                    sx={{ backgroundColor: column.color, color: 'white' }}
                  />
                </Box>

                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{ minHeight: '60vh' }}
                    >
                      {filteredTasks(column.id as Task['status']).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              sx={{
                                mb: 2,
                                cursor: 'grab',
                                '&:hover': {
                                  boxShadow: 3,
                                },
                              }}
                            >
                              <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', flex: 1 }}>
                                    {task.title}
                                  </Typography>
                                  <Box>
                                    <IconButton
                                      size="small"
                                      onClick={() => navigate(`/task/edit/${task.id}`)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDeleteTask(task.id)}
                                      color="error"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </Box>

                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  {task.description}
                                </Typography>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Chip
                                    label={getPriorityLabel(task.priority)}
                                    size="small"
                                    color={getPriorityColor(task.priority)}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {format(new Date(task.dueDate), 'M/d', { locale: ja })}
                                  </Typography>
                                </Box>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </DragDropContext>
    </Container>
  );
};

export default TaskBoard; 