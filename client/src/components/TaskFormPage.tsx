import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { motion } from 'framer-motion';
import TaskForm from './TaskForm';
import { setupUnifiedTasksListener } from '../firebase';
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
  updatedAt: string;
}

const TaskFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    // 編集モードの場合、タスクデータを取得
    if (id && id !== 'new') {
      const unsubscribe = setupUnifiedTasksListener(user.id, (tasks) => {
        const task = tasks.find(t => t.id === id);
        setEditingTask(task || null);
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else {
      setIsLoading(false);
    }
  }, [id, user?.id]);

  const handleClose = () => {
    setOpen(false);
    navigate(-1);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">読み込み中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            sx={{ mr: 2 }}
          >
            戻る
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {editingTask ? 'タスクを編集' : '新しいタスク'}
          </Typography>
        </Box>

        {/* タスクフォーム */}
        <TaskForm
          open={open}
          onClose={handleClose}
          editingTask={editingTask}
        />
      </motion.div>
    </Box>
  );
};

export default TaskFormPage; 