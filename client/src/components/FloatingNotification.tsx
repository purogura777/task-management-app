import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, IconButton, Badge, Popover, List, ListItem, ListItemText, Typography, Divider, Button } from '@mui/material';
import { Notifications, Close } from '@mui/icons-material';
import { motion } from 'framer-motion';

interface Position { x: number; y: number; }
interface MiniNotice { id: string; title: string; body?: string; ts: number; }

const STORAGE_KEY = 'floating_notify_pos';
const STORAGE_LIST_KEY = 'floating_notify_list';

const isPcEnvironment = () => {
	if (typeof window === 'undefined') return false;
	const finePointer = window.matchMedia && window.matchMedia('(pointer:fine)').matches;
	const ua = navigator.userAgent || '';
	const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
	return finePointer && !isMobileUA;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const FloatingNotification: React.FC = () => {
	const [visible, setVisible] = useState(false);
	const [unreadCount, setUnreadCount] = useState(0);
	const [title, setTitle] = useState<string>('');
	const [body, setBody] = useState<string>('');
	const [openList, setOpenList] = useState(false);
	const [notices, setNotices] = useState<MiniNotice[]>(() => {
		try {
			const raw = localStorage.getItem(STORAGE_LIST_KEY);
			if (raw) return JSON.parse(raw);
		} catch {}
		return [];
	});
	const [pos, setPos] = useState<Position>(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) return JSON.parse(raw);
		} catch {}
		return { x: 24, y: 24 };
	});
	const draggingRef = useRef(false);
	const dragStartRef = useRef<Position>({ x: 0, y: 0 });
	const startPosRef = useRef<Position>(pos);
	const anchorRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		startPosRef.current = pos;
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
	}, [pos]);

	useEffect(() => {
		try { localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(notices.slice(-100))); } catch {}
	}, [notices]);

	useEffect(() => {
		if (!isPcEnvironment()) return;
		const handler = (e: Event) => {
			const ce = e as CustomEvent;
			const detail = ce.detail || {};
			setTitle(detail.title || '通知');
			setBody(detail.body || '');
			setUnreadCount(prev => prev + 1);
			setVisible(true);
			setNotices(prev => {
				const next: MiniNotice = { id: String(Date.now()), title: detail.title || '通知', body: detail.body, ts: Date.now() };
				const merged = [...prev, next];
				return merged.slice(-50);
			});
		};
		window.addEventListener('appNotify', handler as EventListener);
		return () => window.removeEventListener('appNotify', handler as EventListener);
	}, []);

	const onMouseDown = useCallback((e: React.MouseEvent) => {
		if (e.button !== 0) return;
		draggingRef.current = true;
		dragStartRef.current = { x: e.clientX, y: e.clientY };
		startPosRef.current = pos;
		document.body.style.userSelect = 'none';
		document.body.style.cursor = 'grabbing';
	}, [pos]);

	useEffect(() => {
		const onMouseMove = (e: MouseEvent) => {
			if (!draggingRef.current) return;
			const dx = e.clientX - dragStartRef.current.x;
			const dy = e.clientY - dragStartRef.current.y;
			const nextX = startPosRef.current.x + dx;
			const nextY = startPosRef.current.y + dy;
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			const size = 56; // 直径
			setPos({
				x: clamp(nextX, 8, vw - size - 8),
				y: clamp(nextY, 8, vh - size - 8),
			});
		};
		const onMouseUp = () => {
			draggingRef.current = false;
			document.body.style.userSelect = '';
			document.body.style.cursor = '';
		};
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
		return () => {
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
		};
	}, []);

	if (!isPcEnvironment()) return null;

	return (
		<Box
			sx={{ position: 'fixed', left: pos.x, bottom: pos.y, zIndex: 2000, pointerEvents: 'auto' }}
		>
			{visible && (
				<motion.div
					initial={{ scale: 0.8, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ type: 'spring', stiffness: 260, damping: 18 }}
				>
					<Box
						ref={anchorRef}
						onMouseDown={onMouseDown}
						onClick={() => { setOpenList(prev => !prev); setUnreadCount(0); }}
						sx={{
							width: 56,
							height: 56,
							borderRadius: '50%',
							background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
							boxShadow: '0 10px 24px rgba(79,70,229,0.35)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: 'grab',
							position: 'relative',
							animation: 'pulseAnim 2s infinite',
							'@keyframes pulseAnim': {
								'0%': { boxShadow: '0 0 0 0 rgba(79,70,229,0.45)' },
								'70%': { boxShadow: '0 0 0 12px rgba(79,70,229,0)' },
								'100%': { boxShadow: '0 0 0 0 rgba(79,70,229,0)' },
							},
						}}
					>
						<Badge badgeContent={unreadCount} color="error" overlap="circular">
							<Notifications sx={{ color: 'white' }} />
						</Badge>
						<IconButton
							size="small"
							onClick={(e) => { e.stopPropagation(); setVisible(false); setUnreadCount(0); setOpenList(false); }}
							sx={{
								position: 'absolute',
								top: -8,
								right: -8,
								width: 24,
								height: 24,
								backgroundColor: 'rgba(0,0,0,0.35)',
								'&:hover': { backgroundColor: 'rgba(0,0,0,0.5)' },
							}}
						>
							<Close sx={{ color: 'white', fontSize: 16 }} />
						</IconButton>
					</Box>
				</motion.div>
			)}
			<Popover
				open={openList}
				anchorEl={anchorRef.current}
				onClose={() => setOpenList(false)}
				anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
				transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
				PaperProps={{ sx: { width: 280, maxHeight: 360, borderRadius: 2, p: 1 } }}
			>
				<Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
					<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>通知</Typography>
					<Button size="small" onClick={() => { setNotices([]); setUnreadCount(0); }}>クリア</Button>
				</Box>
				<Divider />
				<List dense sx={{ py: 0 }}>
					{notices.length === 0 && (
						<ListItem>
							<ListItemText primary="通知はありません" />
						</ListItem>
					)}
					{notices.slice().reverse().map(n => (
						<ListItem key={n.id} sx={{ alignItems: 'flex-start' }}>
							<ListItemText
								primary={
									<Typography variant="body2" sx={{ fontWeight: 600 }}>
										{n.title}
									</Typography>
								}
								secondary={
									<>
										{n.body && <Typography variant="caption" color="text.secondary">{n.body}</Typography>}
										<Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
											{new Date(n.ts).toLocaleTimeString()}
										</Typography>
									</>
								}
							/>
						</ListItem>
					))}
				</List>
			</Popover>
		</Box>
	);
};

export default FloatingNotification;

