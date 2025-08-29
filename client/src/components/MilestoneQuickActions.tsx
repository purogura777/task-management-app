import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack, TextField, Tooltip } from '@mui/material';
import { Add, Flag, TrendingUp } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { createMilestone, listMilestones, updateTask, saveTask } from '../firebase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Props {
  compact?: boolean;
}

const clampPercent = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const MilestoneQuickActions: React.FC<Props> = ({ compact }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Array<{ id: string; title: string }>>([]);
  const [progressOpen, setProgressOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedMsId, setSelectedMsId] = useState('');
  const [deltaPercent, setDeltaPercent] = useState(10);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const refresh = async () => {
    if (!user?.id) return;
    const list = await listMilestones(user.id);
    setItems(list.map(m => ({ id: m.id, title: m.title })));
  };

  useEffect(() => { refresh(); }, [user?.id]);

  const openProgress = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setTitle(`【進捗】(${today})`);
    setDesc('');
    setDeltaPercent(10);
    setProgressOpen(true);
  };

  const logProgress = async () => {
    if (!user?.id) return;
    if (!selectedMsId) { toast.error('マイルストーンを選択してください'); return; }
    const id = Date.now().toString();
    const due = new Date();
    await saveTask(user.id, {
      id,
      title: title || `進捗ログ ${format(due, 'yyyy-MM-dd')}`,
      description: desc || '',
      status: 'done',
      priority: 'medium',
      dueDate: format(due, 'yyyy-MM-dd'),
      assignee: user.name || '未設定',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workspace: localStorage.getItem('currentWorkspace') || '個人プロジェクト',
      project: localStorage.getItem('currentProject') || '個人プロジェクト',
      milestoneId: selectedMsId,
      milestonePlannedDelta: clampPercent(deltaPercent),
    });
    await updateTask(user.id, id, {
      milestoneId: selectedMsId,
      milestoneProgressDelta: clampPercent(deltaPercent),
    });
    toast.success('進捗を記録しました');
    setProgressOpen(false);
  };

  const createMs = async () => {
    if (!user?.id) return;
    if (!newTitle.trim()) { toast.error('タイトルを入力してください'); return; }
    await createMilestone(user.id, {
      title: newTitle.trim(),
      progressPercent: 0,
      targetPercent: 100,
      workspace: localStorage.getItem('currentWorkspace') || undefined,
      project: localStorage.getItem('currentProject') || undefined,
    });
    toast.success('マイルストーンを作成しました');
    setCreateOpen(false);
    setNewTitle('');
    refresh();
  };

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Tooltip title="マイルストーン進捗を記録">
        <Button size={compact ? 'small' : 'medium'} variant="outlined" startIcon={<TrendingUp />} onClick={openProgress}>
          {compact ? '進捗' : '進捗を記録'}
        </Button>
      </Tooltip>
      <Tooltip title="新しいマイルストーンを作成">
        <Button size={compact ? 'small' : 'medium'} variant="outlined" startIcon={<Flag />} onClick={() => setCreateOpen(true)}>
          {compact ? '作成' : 'MS作成'}
        </Button>
      </Tooltip>
      <Tooltip title="一覧へ">
        <Button size={compact ? 'small' : 'medium'} variant="contained" startIcon={<Add />} onClick={() => { window.location.href = '/milestones'; }}>
          {compact ? '一覧' : '一覧/管理'}
        </Button>
      </Tooltip>

      {/* 進捗記録 */}
      <Dialog open={progressOpen} onClose={() => setProgressOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>進捗を記録</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Select
              value={selectedMsId}
              onChange={(e) => setSelectedMsId(String(e.target.value))}
              displayEmpty
              size="small"
            >
              <MenuItem value=""><em>マイルストーンを選択</em></MenuItem>
              {items.map(m => (
                <MenuItem key={m.id} value={m.id}>{m.title}</MenuItem>
              ))}
            </Select>
            <TextField label="本日の進捗(%)" type="number" value={deltaPercent} onChange={(e) => setDeltaPercent(clampPercent(Number(e.target.value)))} inputProps={{ min: 1, max: 100 }} />
            <TextField label="タスクタイトル" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
            <TextField label="タスク説明(任意)" value={desc} onChange={(e) => setDesc(e.target.value)} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProgressOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={logProgress}>記録して保存</Button>
        </DialogActions>
      </Dialog>

      {/* 作成 */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>マイルストーンを作成</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="タイトル" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={createMs}>作成</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MilestoneQuickActions;


