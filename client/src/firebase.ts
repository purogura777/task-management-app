import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, onSnapshot, collection, doc, setDoc, updateDoc, deleteDoc, query, orderBy, getDoc, getDocs, where, serverTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { secureLocalStorage, SecurityLogger } from './utils/security';
import { notify } from './utils/notifications';

// Firebase設定 - 実際のプロジェクトの設定に置き換えてください
// Firebase Console (https://console.firebase.google.com/) でプロジェクトを作成し、
// プロジェクト設定 > 全般 > マイアプリ > Webアプリを追加して取得した設定を以下に貼り付けてください
const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyBO97MjlMFzvcDOJiCzx5fuWtrDttxqX1I",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "satsuki-task.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "satsuki-task",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "satsuki-task.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "993443920962",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:993443920962:web:332a2b097d69bbe5b5c1db"
};

export const firebasePublicConfig = firebaseConfig;

// Firestore用にundefinedを許容しないためのサニタイズ
const sanitizeForFirestore = (input: any): any => {
  if (input === undefined) return null;
  if (input === null) return null;
  if (Array.isArray(input)) return input.map(sanitizeForFirestore);
  if (typeof input === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = v === undefined ? null : sanitizeForFirestore(v);
    }
    return out;
  }
  return input;
};

// Firebase初期化（本番は必ず初期化される設定）
const app = initializeApp(firebaseConfig);

// 認証
export const auth = getAuth(app);

// Firestore
export const db = getFirestore(app);

// Storage
export const storage = getStorage(app);

// ===================== マイルストーン =====================
// 型
export interface Milestone {
  id: string;                 // ms_<timestamp>
  title: string;              // マイルストーン名
  description?: string;       // 概要
  targetPercent?: number;     // 目標(通常100)
  progressPercent: number;    // 現在進捗 0-100
  createdAt: string;
  updatedAt: string;
  workspace?: string;
  project?: string;
}

const MS_LOCAL_KEY = (userId: string) => `milestones_${userId}`;

export const listMilestones = async (userId: string): Promise<Milestone[]> => {
  if (!firebaseConfig.apiKey) {
    const raw = localStorage.getItem(MS_LOCAL_KEY(userId));
    if (!raw) return [];
    try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; }
  }
  const snap = await getDocs(collection(db, 'users', userId, 'milestones'));
  const list: Milestone[] = [];
  snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
  return list;
};

export const createMilestone = async (userId: string, ms: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Milestone> => {
  const id = ms.id || `ms_${Date.now()}`;
  const payload: Milestone = {
    id,
    title: ms.title,
    description: ms.description || '',
    targetPercent: ms.targetPercent ?? 100,
    progressPercent: Math.max(0, Math.min(100, ms.progressPercent ?? 0)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workspace: ms.workspace,
    project: ms.project,
  };

  if (!firebaseConfig.apiKey) {
    const list = (() => { try { return JSON.parse(localStorage.getItem(MS_LOCAL_KEY(userId)) || '[]'); } catch { return []; } })();
    const idx = list.findIndex((x: any) => x.id === id);
    if (idx >= 0) list[idx] = payload; else list.push(payload);
    localStorage.setItem(MS_LOCAL_KEY(userId), JSON.stringify(list));
    return payload;
  }

  const ref = doc(db, 'users', userId, 'milestones', id);
  await setDoc(ref, sanitizeForFirestore(payload));
  return payload;
};

export const updateMilestone = async (userId: string, id: string, updates: Partial<Milestone>): Promise<void> => {
  // 進捗境界を保証
  if (typeof updates.progressPercent === 'number') {
    updates.progressPercent = Math.max(0, Math.min(100, updates.progressPercent));
  }

  if (!firebaseConfig.apiKey) {
    const list = (() => { try { return JSON.parse(localStorage.getItem(MS_LOCAL_KEY(userId)) || '[]'); } catch { return []; } })();
    const idx = list.findIndex((x: any) => x.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(MS_LOCAL_KEY(userId), JSON.stringify(list));
    }
    return;
  }

  const ref = doc(db, 'users', userId, 'milestones', id);
  await updateDoc(ref, sanitizeForFirestore({ ...updates, updatedAt: new Date().toISOString() }));
};

// タスク側からの進捗加算用ユーティリティ
export const addProgressToMilestone = async (userId: string, milestoneId: string, deltaPercent: number): Promise<number | null> => {
  if (!milestoneId || !isFinite(deltaPercent)) return null;

  if (!firebaseConfig.apiKey) {
    const list = (() => { try { return JSON.parse(localStorage.getItem(MS_LOCAL_KEY(userId)) || '[]'); } catch { return []; } })();
    const idx = list.findIndex((x: any) => x.id === milestoneId);
    if (idx < 0) return null;
    const current = Number(list[idx].progressPercent || 0);
    const next = Math.max(0, Math.min(100, current + deltaPercent));
    list[idx] = { ...list[idx], progressPercent: next, updatedAt: new Date().toISOString() };
    localStorage.setItem(MS_LOCAL_KEY(userId), JSON.stringify(list));
    return next;
  }

  const ref = doc(db, 'users', userId, 'milestones', milestoneId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  const current = Number(data.progressPercent || 0);
  const next = Math.max(0, Math.min(100, current + deltaPercent));
  await updateDoc(ref, { progressPercent: next, updatedAt: new Date().toISOString() } as any);
  return next;
};

// 通知レコードをFirestoreに追加（ログイン時のみ）
const addCloudNotification = async (title: string, body?: string, extra?: any) => {
  // 1) まずローカルDesktopへ即時送信（サインイン状態に依存させない）
  try {
    const { localDesktopNotify, connectLocalDesktopBridge } = await import('./utils/desktopBridge');
    connectLocalDesktopBridge();
    setTimeout(() => {
      try { localDesktopNotify(title, body, extra); } catch {}
    }, 300);
  } catch (e) {
    console.warn('Local desktop notification failed (pre-firestore)', e);
  }

  // 2) サインイン済みならFirestoreにも保存（失敗しても無視）
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const ref = doc(collection(db, 'users', uid, 'notifications'));
    await setDoc(ref, { title, body: body || '', createdAt: serverTimestamp(), ...(extra || {}) });
  } catch (e) {
    console.warn('addCloudNotification Firestore write failed', e);
  }
};

// ローカルストレージの重複データをクリアする関数
const clearDuplicateTasks = (userId: string) => {
  const savedTasks = localStorage.getItem(`tasks_${userId}`);
  if (savedTasks) {
    const tasks = JSON.parse(savedTasks);
    const uniqueTasks = tasks.filter((task: any, index: number, self: any[]) => 
      index === self.findIndex((t: any) => t.id === task.id)
    );
    if (uniqueTasks.length !== tasks.length) {
      console.log('重複データをクリアしました');
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(uniqueTasks));
      return uniqueTasks;
    }
  }
  return null;
};

// リアルタイムリスナーを設定する関数
export const setupRealtimeListener = (userId: string, callback: (tasks: any[]) => void) => {
  try {
    console.log('Firebaseリスナーを設定中...', userId);
    
    // Firebaseが設定されていない場合はローカルストレージを使用
    // 環境設定が空（未セット）の場合はローカル動作
    if (!firebaseConfig.apiKey) {
      console.log('Firebase設定がダミーのため、ローカルストレージを使用します');
      
      // 重複データをクリア
      const cleanedTasks = clearDuplicateTasks(userId);
      
      const savedTasks = localStorage.getItem(`tasks_${userId}`);
      if (savedTasks) {
        try {
          const tasks = JSON.parse(savedTasks);
          console.log('ローカルストレージから取得したタスク:', tasks);
          // 配列であることを確認
          const tasksArray = Array.isArray(tasks) ? tasks : [];
          callback(tasksArray);
        } catch (error) {
          console.error('ローカルストレージのタスクデータの解析に失敗:', error);
          callback([]);
        }
      } else {
        console.log('ローカルストレージにタスクがありません');
        callback([]);
      }
      
      // ローカルストレージの変更を監視する関数
      const checkForUpdates = () => {
        const currentTasks = localStorage.getItem(`tasks_${userId}`);
        if (currentTasks) {
          try {
            const tasks = JSON.parse(currentTasks);
            console.log('ローカルストレージの更新を検知:', tasks.length);
            // 配列であることを確認
            const tasksArray = Array.isArray(tasks) ? tasks : [];
            callback(tasksArray);
          } catch (error) {
            console.error('ローカルストレージの更新データの解析に失敗:', error);
            callback([]);
          }
        } else {
          callback([]);
        }
      };
      
      // 定期的にローカルストレージをチェック（簡易的なリアルタイム更新）
      const interval = setInterval(checkForUpdates, 1000); // 間隔を1秒に変更
      
      // セキュリティログ
      const securityLogger = SecurityLogger.getInstance();
      securityLogger.log('info', 'Firebaseリスナーを設定しました', { userId });
      
      return () => {
        clearInterval(interval);
      };
    }
    
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const q = query(tasksRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const tasks: any[] = [];
      snapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      console.log('Firebaseからタスクを取得:', tasks.length);
      callback(tasks);
    }, (error) => {
      console.error('Firebaseリスナーのエラー:', error);
      // エラー時はローカルストレージから読み込み
      const savedTasks = localStorage.getItem(`tasks_${userId}`);
      if (savedTasks) {
        try {
          const tasks = JSON.parse(savedTasks);
          const tasksArray = Array.isArray(tasks) ? tasks : [];
          callback(tasksArray);
        } catch (error) {
          console.error('エラー時のローカルストレージデータの解析に失敗:', error);
          callback([]);
        }
      } else {
        callback([]);
      }
    });
  } catch (error) {
    console.error('Firebaseリスナーの設定に失敗しました:', error);
    // エラー時はローカルストレージから読み込み
    const savedTasks = localStorage.getItem(`tasks_${userId}`);
    if (savedTasks) {
      try {
        const tasks = JSON.parse(savedTasks);
        const tasksArray = Array.isArray(tasks) ? tasks : [];
        callback(tasksArray);
      } catch (error) {
        console.error('エラー時のローカルストレージデータの解析に失敗:', error);
        callback([]);
      }
    } else {
      callback([]);
    }
    return () => {};
  }
};

const getSharedProjectId = (): string | null => {
  try { return localStorage.getItem('currentProjectSharedId'); } catch { return null; }
};

// タスクを保存する関数
export const saveTask = async (userId: string, task: any) => {
  try {
    console.log('タスクを保存中...', task);

    // 共有プロジェクト選択中なら共有側に保存
    const sharedId = getSharedProjectId();
    if (sharedId) {
      await saveProjectTask(sharedId, task);
      // ローカルバックアップ
      try { const list = JSON.parse(localStorage.getItem(`tasks_${userId}`) || '[]'); list.push(task); localStorage.setItem(`tasks_${userId}`, JSON.stringify(list)); } catch {}
      SecurityLogger.getInstance().log('info', '共有プロジェクトにタスク保存', { sharedId, taskId: task.id, userId });
      return;
    }

    // Firebaseが設定されていない場合はローカルストレージのみ使用
    if (!firebaseConfig.apiKey) {
      console.log('Firebase設定がダミーのため、ローカルストレージに保存します');
      
      // ローカルストレージから既存のタスクを取得
      const savedTasks = localStorage.getItem(`tasks_${userId}`);
      let tasks = [];
      
      if (savedTasks) {
        try {
          tasks = JSON.parse(savedTasks);
          // 配列であることを確認
          if (!Array.isArray(tasks)) {
            console.warn('ローカルストレージのタスクデータが配列ではありません。初期化します。');
            tasks = [];
          }
        } catch (error) {
          console.error('ローカルストレージのタスクデータの解析に失敗:', error);
          tasks = [];
        }
      }
      
      // 既存のタスクを更新するか、新しいタスクを追加する
      const existingTaskIndex = tasks.findIndex((t: any) => t.id === task.id);
      if (existingTaskIndex !== -1) {
        // 既存のタスクを更新
        tasks[existingTaskIndex] = { ...tasks[existingTaskIndex], ...task };
        console.log('既存のタスクを更新しました');
      } else {
        // 新しいタスクを追加
        tasks.push(task);
        console.log('新しいタスクを追加しました');
      }
      
      // ローカルストレージに保存
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(tasks));
      notify('task_created', { Title: 'タスクを作成', Body: task.title, TaskId: task.id });
      addCloudNotification('タスクを作成', task.title, { 
        id: task.id, 
        status: task.status, 
        dueDate: task.dueDate, 
        title: task.title,
        description: task.description,
        workspace: task.workspace
      });
      
      // セキュリティログ
      const securityLogger = SecurityLogger.getInstance();
      securityLogger.log('info', 'タスクを保存しました', { taskId: task.id, userId });
      
      return;
    }
    
    const taskRef = doc(db, 'users', userId, 'tasks', task.id);
    await setDoc(taskRef, sanitizeForFirestore(task));
    console.log('タスク保存成功');
    
    // ローカルストレージにも保存（バックアップ）
    const savedTasks = localStorage.getItem(`tasks_${userId}`);
    let tasks = [];
    
    if (savedTasks) {
      try {
        tasks = JSON.parse(savedTasks);
        if (!Array.isArray(tasks)) {
          tasks = [];
        }
      } catch (error) {
        console.error('ローカルストレージのタスクデータの解析に失敗:', error);
        tasks = [];
      }
    }
    
    const existingTaskIndex = tasks.findIndex((t: any) => t.id === task.id);
    if (existingTaskIndex !== -1) {
      tasks[existingTaskIndex] = { ...tasks[existingTaskIndex], ...task };
    } else {
      tasks.push(task);
    }
    localStorage.setItem(`tasks_${userId}`, JSON.stringify(tasks));
    notify('task_created', { Title: 'タスクを作成', Body: task.title, TaskId: task.id });
    addCloudNotification('タスクを作成', task.title, { 
      id: task.id,
      tTitle: task.title,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      dueDate: task.dueDate,
      dueAt: task.dueAt,
      allDay: task.allDay,
      startDate: task.startDate,
      startAt: task.startAt,
      recurrence: task.recurrence,
      workspace: task.workspace,
      project: task.project
    });
    notify('task_created', { Title: 'タスクを作成', Body: task.title, TaskId: task.id });
    addCloudNotification('タスクを作成', task.title, { 
      id: task.id,
      tTitle: task.title,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      dueDate: task.dueDate,
      dueAt: task.dueAt,
      allDay: task.allDay,
      startDate: task.startDate,
      startAt: task.startAt,
      recurrence: task.recurrence,
      workspace: task.workspace,
      project: task.project
    });
  } catch (error) {
    console.error('タスクの保存に失敗しました:', error);
    // Firebaseが失敗した場合はローカルストレージに保存
    const savedTasks = localStorage.getItem(`tasks_${userId}`);
    let tasks = [];
    
    if (savedTasks) {
      try {
        tasks = JSON.parse(savedTasks);
        if (!Array.isArray(tasks)) {
          tasks = [];
        }
      } catch (error) {
        console.error('エラー時のローカルストレージデータの解析に失敗:', error);
        tasks = [];
      }
    }
    
    const existingTaskIndex = tasks.findIndex((t: any) => t.id === task.id);
    if (existingTaskIndex !== -1) {
      tasks[existingTaskIndex] = { ...tasks[existingTaskIndex], ...task };
    } else {
      tasks.push(task);
    }
    localStorage.setItem(`tasks_${userId}`, JSON.stringify(tasks));
    // オフライン・権限等で失敗してもローカル保存は完了しているため、再送出しない
    return;
  }
};

// タスクを更新する関数
export const updateTask = async (userId: string, taskId: string, updates: any) => {
  try {
    console.log('タスクを更新中...', taskId, updates);

    const sharedId = getSharedProjectId();
    if (sharedId) {
      await updateProjectTask(sharedId, taskId, updates);
      try {
        const saved = localStorage.getItem(`tasks_${userId}`);
        if (saved) {
          const tasks = JSON.parse(saved);
          const updated = tasks.map((t: any) => t.id === taskId ? { ...t, ...updates } : t);
          localStorage.setItem(`tasks_${userId}`, JSON.stringify(updated));
        }
      } catch {}
      SecurityLogger.getInstance().log('info', '共有プロジェクトのタスク更新', { sharedId, taskId, userId });
      // マイルストーン進捗連動（共有プロジェクト選択中でもユーザーの個人マイルストーンへ）
      try {
        const milestoneId = updates?.milestoneId || updates?.milestone?.id;
        const delta = (updates?.milestoneProgressDelta ?? updates?.progressContributionPercent) as number | undefined;
        if (milestoneId && typeof delta === 'number' && isFinite(delta) && delta !== 0) {
          const next = await addProgressToMilestone(userId, milestoneId, delta);
          if (next !== null && next >= (updates?.milestoneTargetPercent ?? 100)) {
            addCloudNotification('マイルストーン達成', `ID: ${milestoneId}`, { milestoneId, progressPercent: next });
          }
        }
      } catch (e) {
        console.warn('milestone progress update failed (shared)', e);
      }
      return;
    }

    // Firebaseが設定されていない場合はローカルストレージのみ使用
    if (firebaseConfig.apiKey === "AIzaSyBO97MjlMFzvcDOJiCzx5fuWtrDttxqX1I") {
      console.log('Firebase設定がダミーのため、ローカルストレージを更新します');
      const savedTasks = localStorage.getItem(`tasks_${userId}`);
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        const updatedTasks = tasks.map((task: any) => 
          task.id === taskId ? { ...task, ...updates } : task
        );
        localStorage.setItem(`tasks_${userId}`, JSON.stringify(updatedTasks));
        if (updates?.status !== 'done') {
          notify('task_updated', { Title: 'タスクを更新', Body: updates?.title || '', TaskId: taskId });
        }
        // マイルストーン進捗連動（ローカル）
        try {
          const milestoneId = updates?.milestoneId || updates?.milestone?.id;
          const delta = (updates?.milestoneProgressDelta ?? updates?.progressContributionPercent) as number | undefined;
          if (milestoneId && typeof delta === 'number' && isFinite(delta) && delta !== 0) {
            const next = await addProgressToMilestone(userId, milestoneId, delta);
            if (next !== null && next >= (updates?.milestoneTargetPercent ?? 100)) {
              addCloudNotification('マイルストーン達成', `ID: ${milestoneId}`, { milestoneId, progressPercent: next });
            }
          }
        } catch (e) {
          console.warn('milestone progress update failed (local)', e);
        }
      }
      return;
    }
    
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    await updateDoc(taskRef, sanitizeForFirestore(updates));
    console.log('タスク更新成功');
    
    // ローカルストレージも更新
    const savedTasks = localStorage.getItem(`tasks_${userId}`);
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks);
      const updatedTasks = tasks.map((task: any) => 
        task.id === taskId ? { ...task, ...updates } : task
      );
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(updatedTasks));
      if (updates?.status !== 'done') {
        notify('task_updated', { Title: 'タスクを更新', Body: updates?.title || '', TaskId: taskId });
        addCloudNotification('タスクを更新', updates?.title || '', {
          id: taskId,
          tTitle: updates?.title,
          status: updates?.status,
          priority: updates?.priority,
          assignee: updates?.assignee,
          dueDate: updates?.dueDate,
          dueAt: updates?.dueAt,
          allDay: updates?.allDay,
          startDate: updates?.startDate,
          startAt: updates?.startAt,
          recurrence: updates?.recurrence,
          workspace: updates?.workspace,
          project: updates?.project
        });
      }
      // マイルストーン進捗連動（オンライン）
      try {
        const milestoneId = updates?.milestoneId || updates?.milestone?.id;
        const delta = (updates?.milestoneProgressDelta ?? updates?.progressContributionPercent) as number | undefined;
        if (milestoneId && typeof delta === 'number' && isFinite(delta) && delta !== 0) {
          const next = await addProgressToMilestone(userId, milestoneId, delta);
          if (next !== null && next >= (updates?.milestoneTargetPercent ?? 100)) {
            addCloudNotification('マイルストーン達成', `ID: ${milestoneId}`, { milestoneId, progressPercent: next });
          }
        }
      } catch (e) {
        console.warn('milestone progress update failed (online)', e);
      }
    }
  } catch (error) {
    console.error('タスクの更新に失敗しました:', error);
    // Firebaseが失敗した場合はローカルストレージを更新
    const savedTasks = localStorage.getItem(`tasks_${userId}`);
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks);
      const updatedTasks = tasks.map((task: any) => 
        task.id === taskId ? { ...task, ...updates } : task
      );
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(updatedTasks));
      if (updates?.status !== 'done') {
        notify('task_updated', { Title: 'タスクを更新', Body: updates?.title || '', TaskId: taskId });
      }
      // マイルストーン進捗連動（フォールバック）
      try {
        const milestoneId = updates?.milestoneId || updates?.milestone?.id;
        const delta = (updates?.milestoneProgressDelta ?? updates?.progressContributionPercent) as number | undefined;
        if (milestoneId && typeof delta === 'number' && isFinite(delta) && delta !== 0) {
          const next = await addProgressToMilestone(userId, milestoneId, delta);
          if (next !== null && next >= (updates?.milestoneTargetPercent ?? 100)) {
            addCloudNotification('マイルストーン達成', `ID: ${milestoneId}`, { milestoneId, progressPercent: next });
          }
        }
      } catch (e) {
        console.warn('milestone progress update failed (fallback)', e);
      }
    }
    return;
  }
};

// タスクを削除する関数
export const deleteTask = async (userId: string, taskId: string) => {
  try {
    console.log('タスクを削除中...', taskId);

    const sharedId = getSharedProjectId();
    if (sharedId) {
      await deleteProjectTask(sharedId, taskId);
      try {
        const saved = localStorage.getItem(`tasks_${userId}`);
        if (saved) {
          const tasks = JSON.parse(saved);
          const filtered = tasks.filter((t: any) => t.id !== taskId);
          localStorage.setItem(`tasks_${userId}`, JSON.stringify(filtered));
        }
      } catch {}
      SecurityLogger.getInstance().log('info', '共有プロジェクトのタスク削除', { sharedId, taskId, userId });
      return;
    }

    // Firebaseが設定されていない場合はローカルストレージのみ使用
    if (firebaseConfig.apiKey === "AIzaSyBO97MjlMFzvcDOJiCzx5fuWtrDttxqX1I") {
      console.log('Firebase設定がダミーのため、ローカルストレージから削除します');
      const savedTasks = localStorage.getItem(`tasks_${userId}`);
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        const filteredTasks = tasks.filter((task: any) => task.id !== taskId);
        localStorage.setItem(`tasks_${userId}`, JSON.stringify(filteredTasks));
        console.log('ローカルストレージからタスクを削除しました');
        notify('task_deleted', { Title: 'タスクを削除', Body: taskId, TaskId: taskId });
        addCloudNotification('タスクを削除', taskId, { id: taskId });
        
        // 削除後に即座にコールバックを呼び出してリアルタイム更新を実行
        setTimeout(() => {
          const updatedTasks = localStorage.getItem(`tasks_${userId}`);
          if (updatedTasks) {
            const tasks = JSON.parse(updatedTasks);
            console.log('削除後のタスク更新:', tasks);
          }
        }, 100);
      }
      return;
    }
    
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    await deleteDoc(taskRef);
    console.log('タスク削除成功');
    
    // ローカルストレージからも削除（バックアップ）
    const savedTasks = localStorage.getItem(`tasks_${userId}`);
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks);
      const filteredTasks = tasks.filter((task: any) => task.id !== taskId);
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(filteredTasks));
      notify('task_deleted', { Title: 'タスクを削除', Body: taskId, TaskId: taskId });
      addCloudNotification('タスクを削除', taskId, { id: taskId });
    }
  } catch (error) {
    console.error('タスクの削除に失敗しました:', error);
    // Firebaseが失敗した場合はローカルストレージから削除
    const savedTasks = localStorage.getItem(`tasks_${userId}`);
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks);
      const filteredTasks = tasks.filter((task: any) => task.id !== taskId);
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(filteredTasks));
      notify('task_deleted', { Title: 'タスクを削除', Body: taskId, TaskId: taskId });
    }
    return;
  }
};

// 共有プロジェクト用 型定義
type ProjectRole = 'owner' | 'editor' | 'viewer';
interface Project {
  id: string;
  name: string;
  ownerId: string;
  members: { [userId: string]: ProjectRole };
  memberIds: string[];
  visibility: 'private' | 'team';
  createdAt: string;
}

// 繰り返しシリーズ一括削除
export const deleteSeries = async (userId: string, seriesId: string) => {
  try {
    if (firebaseConfig.apiKey === "AIzaSyBO97MjlMFzvcDOJiCzx5fuWtrDttxqX1I") {
      const saved = localStorage.getItem(`tasks_${userId}`);
      if (saved) {
        const tasks = JSON.parse(saved) || [];
        const filtered = tasks.filter((t: any) => t.seriesId !== seriesId);
        localStorage.setItem(`tasks_${userId}`, JSON.stringify(filtered));
        notify('task_deleted', { Title: 'シリーズを削除', Body: seriesId });
        addCloudNotification('シリーズ削除', seriesId);
      }
      return;
    }

    // Firestore: seriesId を持つ全タスクを取得して削除
    const q = query(collection(db, 'users', userId, 'tasks'), where('seriesId', '==', seriesId));
    const snap = await getDocs(q);
    const batchPromises: Promise<any>[] = [];
    snap.forEach(d => batchPromises.push(deleteDoc(doc(db, 'users', userId, 'tasks', d.id))));
    await Promise.all(batchPromises);
    notify('task_deleted', { Title: 'シリーズを削除', Body: seriesId });
    addCloudNotification('シリーズ削除', seriesId);
  } catch (e) {
    console.error('deleteSeries failed', e);
    throw e;
  }
};

interface ProjectInvite {
  token: string;
  projectId: string;
  role: ProjectRole;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
}

// 共有プロジェクト: ローカルストレージユーティリティ
const readLocalJson = (key: string, fallback: any) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const data = JSON.parse(raw);
    return data ?? fallback;
  } catch (e) {
    console.warn('readLocalJson failed', key, e);
    return fallback;
  }
};

const writeLocalJson = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('writeLocalJson failed', key, e);
  }
};

// 共有プロジェクトAPI
export const createProject = async (userId: string, name: string, visibility: 'private' | 'team' = 'team') => {
  const project: Project = {
    id: `proj_${Date.now()}`,
    name,
    ownerId: userId,
    members: { [userId]: 'owner' },
    memberIds: [userId],
    visibility,
    createdAt: new Date().toISOString(),
  };

  if (!firebaseConfig.apiKey) {
    const projects: Project[] = readLocalJson('projects', []);
    projects.push(project);
    writeLocalJson('projects', projects);
    SecurityLogger.getInstance().log('info', 'プロジェクトを作成(Local)', { projectId: project.id, userId });
    return project;
  }

  const ref = doc(collection(db, 'projects'));
  await setDoc(ref, project);
  SecurityLogger.getInstance().log('info', 'プロジェクトを作成', { projectId: ref.id, userId });
  return { ...project, id: ref.id } as Project;
};

export const listMyProjects = async (userId: string): Promise<Project[]> => {
  if (!firebaseConfig.apiKey) {
    const projects: Project[] = readLocalJson('projects', []);
    return projects.filter(p => p.ownerId === userId || p.memberIds.includes(userId));
  }

  const ownedQ = query(collection(db, 'projects'), where('ownerId', '==', userId));
  const memberQ = query(collection(db, 'projects'), where('memberIds', 'array-contains', userId));
  const [ownedSnap, memberSnap] = await Promise.all([getDocs(ownedQ), getDocs(memberQ)]);
  const list: Project[] = [];
  ownedSnap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
  memberSnap.forEach(d => { if (!list.find(x => x.id === d.id)) list.push({ id: d.id, ...(d.data() as any) }); });
  return list;
};

export const addProjectMember = async (projectId: string, targetUserId: string, role: ProjectRole = 'editor') => {
  if (!firebaseConfig.apiKey) {
    const projects: Project[] = readLocalJson('projects', []);
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx === -1) throw new Error('Project not found');
    projects[idx].members[targetUserId] = role;
    if (!projects[idx].memberIds.includes(targetUserId)) projects[idx].memberIds.push(targetUserId);
    writeLocalJson('projects', projects);
    SecurityLogger.getInstance().log('info', 'メンバー追加(Local)', { projectId, targetUserId, role });
    return projects[idx];
  }

  const ref = doc(db, 'projects', projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Project not found');
  const data = snap.data() as Project;
  const members = { ...(data.members || {}), [targetUserId]: role } as any;
  const memberIds = Array.from(new Set([...(data.memberIds || []), targetUserId]));
  await updateDoc(ref, { members, memberIds } as any);
  SecurityLogger.getInstance().log('info', 'メンバー追加', { projectId, targetUserId, role });
};

export const generateInvite = async (projectId: string, createdBy: string, role: ProjectRole = 'viewer', expiresInHours = 168): Promise<ProjectInvite> => {
  const token = `inv_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const invite: ProjectInvite = {
    token,
    projectId,
    role,
    createdBy,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString(),
  };

  if (!firebaseConfig.apiKey) {
    const invites: Record<string, ProjectInvite> = readLocalJson('projectInvites', {});
    invites[token] = invite;
    writeLocalJson('projectInvites', invites);
    SecurityLogger.getInstance().log('info', '招待リンク作成(Local)', { projectId, token });
    return invite;
  }

  await setDoc(doc(db, 'projectInvites', token), invite as any);
  SecurityLogger.getInstance().log('info', '招待リンク作成', { projectId, token });
  return invite;
};

export const acceptInvite = async (token: string, userId: string) => {
  if (!firebaseConfig.apiKey) {
    const invites: Record<string, ProjectInvite> = readLocalJson('projectInvites', {});
    const invite = invites[token];
    if (!invite) throw new Error('招待が見つかりません');
    if (new Date(invite.expiresAt).getTime() < Date.now()) throw new Error('招待の有効期限が切れています');
    await addProjectMember(invite.projectId, userId, invite.role);
    delete invites[token];
    writeLocalJson('projectInvites', invites);
    SecurityLogger.getInstance().log('info', '招待受諾(Local)', { token, userId });
    return invite.projectId;
  }

  const ref = doc(db, 'projectInvites', token);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('招待が見つかりません');
  const invite = snap.data() as ProjectInvite;
  if (new Date(invite.expiresAt).getTime() < Date.now()) throw new Error('招待の有効期限が切れています');
  await addProjectMember(invite.projectId, userId, invite.role);
  await deleteDoc(ref);
  SecurityLogger.getInstance().log('info', '招待受諾', { token, userId });
  return invite.projectId;
};

// 共有プロジェクトのタスク購読
export const setupProjectTasksListener = (projectId: string, callback: (tasks: any[]) => void) => {
  if (!firebaseConfig.apiKey) {
    const key = `project_tasks_${projectId}`;
    const push = () => {
      const tasks = readLocalJson(key, []);
      callback(Array.isArray(tasks) ? tasks : []);
    };
    push();
    const interval = setInterval(push, 1000);
    return () => clearInterval(interval);
  }

  const tasksRef = collection(db, 'projects', projectId, 'tasks');
  const q = query(tasksRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const tasks: any[] = [];
    snapshot.forEach((d) => tasks.push({ id: d.id, ...d.data() }));
    callback(tasks);
  }, (error) => {
    console.error('Project tasks listener error', error);
    callback([]);
  });
};

export const saveProjectTask = async (projectId: string, task: any) => {
  if (!firebaseConfig.apiKey) {
    const key = `project_tasks_${projectId}`;
    const tasks = readLocalJson(key, []);
    const idx = tasks.findIndex((t: any) => t.id === task.id);
    if (idx >= 0) tasks[idx] = { ...tasks[idx], ...task }; else tasks.push(task);
    writeLocalJson(key, tasks);
    notify('task_created', { Title: 'タスクを作成(共有)', Body: task.title, TaskId: task.id, ProjectId: projectId });
    SecurityLogger.getInstance().log('info', '共有タスク保存(Local)', { projectId, taskId: task.id });
    return;
  }

  const ref = doc(collection(db, 'projects', projectId, 'tasks'));
  await setDoc(doc(db, 'projects', projectId, 'tasks', task.id || ref.id), sanitizeForFirestore({ ...task, id: task.id || ref.id }));
};

export const updateProjectTask = async (projectId: string, taskId: string, updates: any) => {
  if (firebaseConfig.apiKey === "AIzaSyBO97MjlMFzvcDOJiCzx5fuWtrDttxqX1I") {
    const key = `project_tasks_${projectId}`;
    const tasks = readLocalJson(key, []);
    const idx = tasks.findIndex((t: any) => t.id === taskId);
    if (idx >= 0) {
      tasks[idx] = { ...tasks[idx], ...updates };
      writeLocalJson(key, tasks);
      notify('task_updated', { Title: 'タスクを更新(共有)', Body: updates?.title || '', TaskId: taskId, ProjectId: projectId });
    }
    SecurityLogger.getInstance().log('info', '共有タスク更新(Local)', { projectId, taskId });
    return;
  }

  const ref = doc(db, 'projects', projectId, 'tasks', taskId);
  await updateDoc(ref, sanitizeForFirestore(updates));
};

export const deleteProjectTask = async (projectId: string, taskId: string) => {
  if (firebaseConfig.apiKey === "AIzaSyBO97MjlMFzvcDOJiCzx5fuWtrDttxqX1I") {
    const key = `project_tasks_${projectId}`;
    const tasks = readLocalJson(key, []);
    const filtered = tasks.filter((t: any) => t.id !== taskId);
    writeLocalJson(key, filtered);
    notify('task_deleted', { Title: 'タスクを削除(共有)', Body: taskId, TaskId: taskId, ProjectId: projectId });
    addCloudNotification('タスクを削除(共有)', taskId);
    SecurityLogger.getInstance().log('info', '共有タスク削除(Local)', { projectId, taskId });
    return;
  }

  const ref = doc(db, 'projects', projectId, 'tasks', taskId);
  await deleteDoc(ref);
  notify('task_deleted', { Title: 'タスクを削除(共有)', Body: taskId, TaskId: taskId, ProjectId: projectId });
  addCloudNotification('タスクを削除(共有)', taskId);
};

export const setupUnifiedTasksListener = (userId: string, callback: (tasks: any[]) => void) => {
  const sharedId = localStorage.getItem('currentProjectSharedId');
  if (sharedId) {
    return setupProjectTasksListener(sharedId, (tasks) => {
      try { localStorage.setItem(`tasks_${userId}`, JSON.stringify(tasks)); } catch {}
      callback(tasks);
    });
  }
  return setupRealtimeListener(userId, (tasks) => {
    try { localStorage.setItem(`tasks_${userId}`, JSON.stringify(tasks)); } catch {}
    callback(tasks);
  });
};

// 期限チェック機能
export const checkDeadlineReminders = async (userId: string): Promise<void> => {
  try {
    // ユーザー設定で期限アラートが無効化されている場合はスキップ
    const userSettings = localStorage.getItem('userSettings');
    if (userSettings) {
      const settings = JSON.parse(userSettings);
      if (!settings.notifications?.deadlineAlerts) {
        return;
      }
    }
    
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    // ローカルストレージからタスクを取得
    const savedTasks = localStorage.getItem(`tasks_${userId}`);
    if (!savedTasks) return;
    
    const tasks = JSON.parse(savedTasks);
    const reminders: any[] = [];
    
    tasks.forEach((task: any) => {
      if (task.status === 'done') return;
      
      // タスクのリマインダー設定をチェック
      if (task.reminderEnabled === false) return;
      
      let dueDate: Date | null = null;
      
      // 期限日時の解析
      if (task.dueAt) {
        dueDate = new Date(task.dueAt);
      } else if (task.dueDate) {
        dueDate = new Date(task.dueDate);
      }
      
      if (!dueDate || isNaN(dueDate.getTime())) return;
      
      // タスクのリマインダータイミング設定に基づく通知判定
      const reminderTiming = task.reminderTiming || '1day';
      let reminderDate: Date;
      
      switch (reminderTiming) {
        case '1week':
          reminderDate = new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '3days':
          reminderDate = new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000);
          break;
        case '1day':
        default:
          reminderDate = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
          break;
      }
      
      // 既に過ぎた期限
      if (dueDate < now) {
        reminders.push({
          task,
          type: 'overdue',
          message: `期限切れ: ${task.title}`,
          urgency: 'high'
        });
      }
      // リマインダー時期に到達
      else if (now >= reminderDate) {
        const timeLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        let message: string;
        
        if (timeLeft <= 1) {
          message = `明日期限: ${task.title}`;
        } else if (timeLeft <= 3) {
          message = `${timeLeft}日後期限: ${task.title}`;
        } else {
          message = `${timeLeft}日後期限: ${task.title}`;
        }
        
        reminders.push({
          task,
          type: 'due_reminder',
          message,
          urgency: timeLeft <= 1 ? 'high' : 'medium'
        });
      }
    });
    
    // 重複通知を避けるため、最後の通知時刻をチェック
    const lastNotifyKey = `lastDeadlineNotify_${userId}`;
    const lastNotifyTime = localStorage.getItem(lastNotifyKey);
    const lastNotify = lastNotifyTime ? new Date(lastNotifyTime) : new Date(0);
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    
    // 6時間以内に通知済みなら高優先度のみ
    const shouldNotifyAll = lastNotify < sixHoursAgo;
    
    for (const reminder of reminders) {
      if (!shouldNotifyAll && reminder.urgency !== 'high') continue;
      
      // 通知を送信
      addCloudNotification(
        reminder.message,
        `期限: ${reminder.task.dueDate || reminder.task.dueAt}`,
        {
          id: reminder.task.id,
          type: 'deadline_reminder',
          urgency: reminder.urgency,
          dueDate: reminder.task.dueDate,
          dueAt: reminder.task.dueAt,
          title: reminder.task.title
        }
      );
    }
    
    if (reminders.length > 0) {
      localStorage.setItem(lastNotifyKey, now.toISOString());
    }
    
  } catch (error) {
    console.error('期限チェックに失敗しました:', error);
  }
};

// 定期的な期限チェックを開始
let deadlineCheckInterval: NodeJS.Timeout | null = null;

export const startDeadlineChecker = (userId: string): void => {
  // 既存のインターバルをクリア
  if (deadlineCheckInterval) {
    clearInterval(deadlineCheckInterval);
  }
  
  // 15分ごとにチェック
  deadlineCheckInterval = setInterval(() => {
    checkDeadlineReminders(userId);
  }, 15 * 60 * 1000);
  
  // 初回チェックを即座に実行
  setTimeout(() => checkDeadlineReminders(userId), 5000);
};

export const stopDeadlineChecker = (): void => {
  if (deadlineCheckInterval) {
    clearInterval(deadlineCheckInterval);
    deadlineCheckInterval = null;
  }
};

export default app; 