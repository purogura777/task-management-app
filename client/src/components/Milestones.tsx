import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { createMilestone, listMilestones, updateMilestone, type Milestone, saveTask, updateTask } from '../firebase';
import toast from 'react-hot-toast';

const clampPercent = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const Milestones: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTarget, setNewTarget] = useState<number>(100);
  const [progressOpen, setProgressOpen] = useState(false);
  const [selectedMsId, setSelectedMsId] = useState<string>('');
  const [deltaPercent, setDeltaPercent] = useState<number>(10);
  const [logTitle, setLogTitle] = useState<string>('');
  const [logDesc, setLogDesc] = useState<string>('');

  const selectedMs = useMemo(() => items.find(x => x.id === selectedMsId) || null, [items, selectedMsId]);

  const refresh = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const list = await listMilestones(user.id);
      setItems(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [user?.id]);

  const handleCreate = async () => {
    if (!user?.id) return;
    if (!newTitle.trim()) { toast.error('タイトルを入力してください'); return; }
    try {
      await createMilestone(user.id, {
        title: newTitle.trim(),
        description: newDesc.trim(),
        targetPercent: clampPercent(newTarget || 100),
        progressPercent: 0,
        workspace: localStorage.getItem('currentWorkspace') || undefined,
        project: localStorage.getItem('currentProject') || undefined,
      });
      toast.success('マイルストーンを作成しました');
      setCreateOpen(false);
      setNewTitle(''); setNewDesc(''); setNewTarget(100);
      refresh();
    } catch (e) {
      console.error(e);
      toast.error('作成に失敗しました');
    }
  };

  const handleQuickProgressOpen = (id?: string) => {
    setSelectedMsId(id || '');
    const base = items.find(x => x.id === (id || ''));
    const today = format(new Date(), 'yyyy-MM-dd');
    setLogTitle(base ? `【進捗】${base.title} (${today})` : `【進捗】(${today})`);
    setLogDesc('');
    setDeltaPercent(10);
    setProgressOpen(true);
  };

  const handleLogProgress = async () => {
    if (!user?.id) return;
    if (!selectedMsId) { toast.error('マイルストーンを選択してください'); return; }
    if (!isFinite(deltaPercent) || deltaPercent === 0) { toast.error('進捗%を入力してください'); return; }
    try {
      // 1) 本日のタスクとして登録
      const id = Date.now().toString();
      const due = new Date();
      const taskPayload: any = {
        id,
        title: logTitle || `進捗ログ ${format(due, 'yyyy-MM-dd')}`,
        description: logDesc || '',
        status: 'done',
        priority: 'medium',
        dueDate: format(due, 'yyyy-MM-dd'),
        assignee: user.name || '未設定',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        workspace: localStorage.getItem('currentWorkspace') || '個人プロジェクト',
        project: localStorage.getItem('currentProject') || '個人プロジェクト',
        milestoneId: selectedMsId,              // 参照用
        milestonePlannedDelta: clampPercent(deltaPercent),
      };
      await saveTask(user.id, taskPayload);

      // 2) 進捗を加算（updateTask経由でフックを発火）
      await updateTask(user.id, id, {
        milestoneId: selectedMsId,
        milestoneProgressDelta: clampPercent(deltaPercent),
      });

      toast.success('進捗を記録しました');
      setProgressOpen(false);
      refresh();
    } catch (e) {
      console.error(e);
      toast.error('進捗の記録に失敗しました');
    }
  };

  const handleInlinePercentChange = async (m: Milestone, value: number) => {
    if (!user?.id) return;
    try {
      await updateMilestone(user.id, m.id, { progressPercent: clampPercent(value) });
      refresh();
    } catch (e) {
      console.error(e);
      toast.error('更新に失敗しました');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">マイルストーン</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => handleQuickProgressOpen()}>進捗を記録</Button>
          <Button variant="contained" onClick={() => setCreateOpen(true)}>新規作成</Button>
        </Stack>
      </Stack>

      <Stack spacing={2}>
        {loading && <LinearProgress />}
        {!loading && items.length === 0 && (
          <Typography color="text.secondary">マイルストーンがありません。右上の「新規作成」から追加してください。</Typography>
        )}

        {items.map((m) => {
          const percent = clampPercent(Number(m.progressPercent || 0));
          const target = clampPercent(Number(m.targetPercent || 100));
          return (
            <Card key={m.id}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{m.title}</Typography>
                    {m.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{m.description}</Typography>
                    )}
                    <Box sx={{ mt: 1 }}>
                      <LinearProgress variant="determinate" value={Math.min(100, (percent / target) * 100)} />
                      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                        <Typography variant="caption">進捗: {percent}%</Typography>
                        <Typography variant="caption">目標: {target}%</Typography>
                      </Stack>
                    </Box>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ minWidth: 280 }}>
                    <TextField
                      type="number"
                      size="small"
                      label="進捗%を指定"
                      value={percent}
                      onChange={(e) => handleInlinePercentChange(m, clampPercent(Number(e.target.value)))}
                      inputProps={{ min: 0, max: 100 }}
                    />
                    <Button variant="outlined" onClick={() => handleQuickProgressOpen(m.id)}>進捗を記録</Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* 新規作成ダイアログ */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>マイルストーンを作成</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="タイトル" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} fullWidth />
            <TextField label="説明" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} fullWidth multiline minRows={2} />
            <TextField label="目標%" type="number" value={newTarget} onChange={(e) => setNewTarget(clampPercent(Number(e.target.value)))} inputProps={{ min: 1, max: 100 }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={handleCreate}>作成</Button>
        </DialogActions>
      </Dialog>

      {/* 進捗記録ダイアログ */}
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
            <TextField label="タスクタイトル" value={logTitle} onChange={(e) => setLogTitle(e.target.value)} fullWidth />
            <TextField label="タスク説明(任意)" value={logDesc} onChange={(e) => setLogDesc(e.target.value)} fullWidth multiline minRows={2} />
            {selectedMs && (
              <Typography variant="caption" color="text.secondary">
                現在の進捗: {clampPercent(selectedMs.progressPercent)}% / 目標: {clampPercent(selectedMs.targetPercent || 100)}%
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProgressOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={handleLogProgress}>記録して保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Milestones;


