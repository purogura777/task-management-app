import React from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { MoreVert, Edit, Delete, DeleteSweep } from '@mui/icons-material';
import { deleteSeries } from '../firebase';
import toast from 'react-hot-toast';

interface TaskActionsProps {
  task: any;
  onEdit: (task: any) => void;
  onDelete: (taskId: string) => void;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  userId: string;
}

const TaskActions: React.FC<TaskActionsProps> = ({
  task,
  onEdit,
  onDelete,
  anchorEl,
  onClose,
  userId
}) => {
  const handleEdit = () => {
    onEdit(task);
    onClose();
  };

  const handleDelete = () => {
    onDelete(task.id);
    onClose();
  };

  const handleDeleteSeries = async () => {
    if (!task.seriesId) return;
    
    try {
      await deleteSeries(userId, task.seriesId);
      toast.success('シリーズを一括削除しました');
      onClose();
    } catch (error) {
      console.error('シリーズ削除エラー:', error);
      toast.error('シリーズの削除に失敗しました');
    }
  };

  const isSeriesTask = Boolean(task.seriesId);

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <MenuItem onClick={handleEdit}>
        <ListItemIcon>
          <Edit fontSize="small" />
        </ListItemIcon>
        <ListItemText>編集</ListItemText>
      </MenuItem>
      
      <MenuItem onClick={handleDelete}>
        <ListItemIcon>
          <Delete fontSize="small" />
        </ListItemIcon>
        <ListItemText>削除</ListItemText>
      </MenuItem>
      
      {isSeriesTask && (
        <MenuItem onClick={handleDeleteSeries}>
          <ListItemIcon>
            <DeleteSweep fontSize="small" />
          </ListItemIcon>
          <ListItemText>シリーズ一括削除</ListItemText>
        </MenuItem>
      )}
    </Menu>
  );
};

export default TaskActions;
