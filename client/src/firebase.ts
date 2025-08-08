import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, onSnapshot, collection, doc, setDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { secureLocalStorage, SecurityLogger } from './utils/security';

// Firebase設定 - 実際のプロジェクトの設定に置き換えてください
// Firebase Console (https://console.firebase.google.com/) でプロジェクトを作成し、
// プロジェクト設定 > 全般 > マイアプリ > Webアプリを追加して取得した設定を以下に貼り付けてください
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "task-management-app-xxxxx.firebaseapp.com",
  projectId: "task-management-app-xxxxx",
  storageBucket: "task-management-app-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// 認証
export const auth = getAuth(app);

// Firestore
export const db = getFirestore(app);

// Storage
export const storage = getStorage(app);

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
    if (firebaseConfig.apiKey === "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX") {
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

// タスクを保存する関数
export const saveTask = async (userId: string, task: any) => {
  try {
    console.log('タスクを保存中...', task);
    
    // Firebaseが設定されていない場合はローカルストレージのみ使用
    if (firebaseConfig.apiKey === "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX") {
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
      
      // セキュリティログ
      const securityLogger = SecurityLogger.getInstance();
      securityLogger.log('info', 'タスクを保存しました', { taskId: task.id, userId });
      
      return;
    }
    
    const taskRef = doc(db, 'users', userId, 'tasks', task.id);
    await setDoc(taskRef, task);
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
    throw error;
  }
};

// タスクを更新する関数
export const updateTask = async (userId: string, taskId: string, updates: any) => {
  try {
    console.log('タスクを更新中...', taskId, updates);
    
    // Firebaseが設定されていない場合はローカルストレージのみ使用
    if (firebaseConfig.apiKey === "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX") {
      console.log('Firebase設定がダミーのため、ローカルストレージを更新します');
      const savedTasks = localStorage.getItem(`tasks_${userId}`);
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        const updatedTasks = tasks.map((task: any) => 
          task.id === taskId ? { ...task, ...updates } : task
        );
        localStorage.setItem(`tasks_${userId}`, JSON.stringify(updatedTasks));
      }
      return;
    }
    
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    await updateDoc(taskRef, updates);
    console.log('タスク更新成功');
    
    // ローカルストレージも更新
    const savedTasks = localStorage.getItem(`tasks_${userId}`);
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks);
      const updatedTasks = tasks.map((task: any) => 
        task.id === taskId ? { ...task, ...updates } : task
      );
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(updatedTasks));
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
    }
    throw error;
  }
};

// タスクを削除する関数
export const deleteTask = async (userId: string, taskId: string) => {
  try {
    console.log('タスクを削除中...', taskId);
    
    // Firebaseが設定されていない場合はローカルストレージのみ使用
    if (firebaseConfig.apiKey === "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX") {
      console.log('Firebase設定がダミーのため、ローカルストレージから削除します');
      const savedTasks = localStorage.getItem(`tasks_${userId}`);
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        const filteredTasks = tasks.filter((task: any) => task.id !== taskId);
        localStorage.setItem(`tasks_${userId}`, JSON.stringify(filteredTasks));
        console.log('ローカルストレージからタスクを削除しました');
        
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
    }
  } catch (error) {
    console.error('タスクの削除に失敗しました:', error);
    // Firebaseが失敗した場合はローカルストレージから削除
    const savedTasks = localStorage.getItem(`tasks_${userId}`);
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks);
      const filteredTasks = tasks.filter((task: any) => task.id !== taskId);
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(filteredTasks));
    }
    throw error;
  }
};

export default app; 