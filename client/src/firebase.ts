import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, onSnapshot, collection, doc, setDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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

// リアルタイムリスナーを設定する関数
export const setupRealtimeListener = (userId: string, callback: (tasks: any[]) => void) => {
  try {
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const q = query(tasksRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const tasks: any[] = [];
      snapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      callback(tasks);
    });
  } catch (error) {
    console.error('Firebaseリスナーの設定に失敗しました:', error);
    return () => {};
  }
};

// タスクを保存する関数
export const saveTask = async (userId: string, task: any) => {
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', task.id);
    await setDoc(taskRef, task);
  } catch (error) {
    console.error('タスクの保存に失敗しました:', error);
    throw error;
  }
};

// タスクを更新する関数
export const updateTask = async (userId: string, taskId: string, updates: any) => {
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    await updateDoc(taskRef, updates);
  } catch (error) {
    console.error('タスクの更新に失敗しました:', error);
    throw error;
  }
};

// タスクを削除する関数
export const deleteTask = async (userId: string, taskId: string) => {
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error('タスクの削除に失敗しました:', error);
    throw error;
  }
};

export default app; 