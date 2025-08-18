// 通知ユーティリティ（メール/SMSはプレースホルダー、プッシュ/サウンド/トーストを実装）
import toast from 'react-hot-toast';

type NotificationChannel = 'push' | 'sound' | 'toast';
type NotificationEvent = 'task_created' | 'task_updated' | 'task_deleted' | 'task_due_soon';

interface NotifyPayload {
	Title: string;
	Body?: string;
	TaskId?: string;
	ProjectId?: string;
}

const getProfile = () => {
	try {
		const raw = localStorage.getItem('userProfile');
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
};

export const requestPushPermission = async (): Promise<NotificationPermission> => {
	if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
	try {
		if (Notification.permission === 'granted') return 'granted';
		const res = await Notification.requestPermission();
		return res;
	} catch {
		return 'denied';
	}
};

const sendPush = (title: string, body?: string) => {
	if (typeof window === 'undefined' || !('Notification' in window)) return;
	if (Notification.permission !== 'granted') return;
	new Notification(title, { body, icon: '/favicon.ico' });
};

const playSound = () => {
	try {
		const audio = new Audio('/notification.mp3');
		audio.volume = 0.6;
		audio.play().catch(() => {});
	} catch {}
};

// メール/SMSはサポート対象外

const eventTitleMap: Record<NotificationEvent, string> = {
	'task_created': 'タスクを作成しました',
	'task_updated': 'タスクを更新しました',
	'task_deleted': 'タスクを削除しました',
	'task_due_soon': '期限が近いタスクがあります',
};

export const notify = (event: NotificationEvent, payload?: Partial<NotifyPayload>) => {
	const profile = getProfile();
	const title = payload?.Title || eventTitleMap[event] || '通知';
	const body = payload?.Body;

	// デフォルト: トースト
	toast.success(title + (body ? `: ${body}` : ''));

	// サウンド（push有効時に鳴らす）
	if (profile?.notifications?.push) playSound();

	// プッシュ通知
	if (profile?.notifications?.push) sendPush(title, body);

	// メール/SMSは送信しない
};

// 期限リマインダー（重複通知を避ける）
export const checkDueSoonAndNotify = () => {
	try {
		const raw = localStorage.getItem('tasks_' + (JSON.parse(localStorage.getItem('user') || '{}').id || 'local'));
		const tasks = raw ? JSON.parse(raw) : [];
		if (!Array.isArray(tasks)) return;
		const now = new Date();
		const todayStr = now.toISOString().split('T')[0];
		const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
		const tomorrowStr = tomorrow.toISOString().split('T')[0];
		const notifiedRaw = localStorage.getItem('notified_due_ids') || '[]';
		const notified: string[] = JSON.parse(notifiedRaw);

		const candidates = tasks.filter((t: any) => t.dueDate && (t.dueDate <= tomorrowStr));
		for (const t of candidates) {
			if (notified.includes(t.id)) continue;
			notify('task_due_soon', { Title: '期限間近', Body: `${t.title} (${t.dueDate})` });
			notified.push(t.id);
		}
		localStorage.setItem('notified_due_ids', JSON.stringify(notified.slice(-500)));
	} catch (e) {
		console.warn('checkDueSoonAndNotify failed', e);
	}
};

