import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, IconButton, Badge } from '@mui/material';
import { Notifications, Close } from '@mui/icons-material';
import { motion } from 'framer-motion';

interface Position { x: number; y: number; }

const STORAGE_KEY = 'floating_notify_pos';

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
	const [count, setCount] = useState(0);
	const [title, setTitle] = useState<string>('');
	const [body, setBody] = useState<string>('');
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

	useEffect(() => {
		startPosRef.current = pos;
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
	}, [pos]);

	useEffect(() => {
		if (!isPcEnvironment()) return;
		const handler = (e: Event) => {
			const ce = e as CustomEvent;
			const detail = ce.detail || {};
			setTitle(detail.title || '通知');
			setBody(detail.body || '');
			setCount(prev => prev + 1);
			setVisible(true);
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
						onMouseDown={onMouseDown}
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
						<Badge badgeContent={count} color="error" overlap="circular">
							<Notifications sx={{ color: 'white' }} />
						</Badge>
						<IconButton
							size="small"
							onClick={(e) => { e.stopPropagation(); setVisible(false); setCount(0); }}
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
		</Box>
	);
};

export default FloatingNotification;

