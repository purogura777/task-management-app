import CryptoJS from 'crypto-js';

// 暗号化キー（実際の実装では環境変数から取得）
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'your-secret-key-here';

// AES-256暗号化
export const encryptData = (data: string): string => {
  try {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('データの暗号化に失敗しました:', error);
    return data; // 暗号化に失敗した場合は平文を返す
  }
};

// AES-256復号化
export const decryptData = (encryptedData: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('データの復号化に失敗しました:', error);
    return encryptedData; // 復号化に失敗した場合は暗号文を返す
  }
};

// オブジェクトの暗号化
export const encryptObject = (obj: any): string => {
  try {
    const jsonString = JSON.stringify(obj);
    return encryptData(jsonString);
  } catch (error) {
    console.error('オブジェクトの暗号化に失敗しました:', error);
    return JSON.stringify(obj);
  }
};

// オブジェクトの復号化
export const decryptObject = (encryptedData: string): any => {
  try {
    const decryptedString = decryptData(encryptedData);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('オブジェクトの復号化に失敗しました:', error);
    return null;
  }
};

// パスワードのハッシュ化
export const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password).toString();
};

// パスワードの検証
export const verifyPassword = (password: string, hashedPassword: string): boolean => {
  const hashedInput = hashPassword(password);
  return hashedInput === hashedPassword;
};

// セキュアなランダムトークン生成
export const generateSecureToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// データの整合性チェック
export const verifyDataIntegrity = (data: any, signature: string): boolean => {
  try {
    const dataString = JSON.stringify(data);
    const expectedSignature = CryptoJS.HmacSHA256(dataString, ENCRYPTION_KEY).toString();
    return expectedSignature === signature;
  } catch (error) {
    console.error('データ整合性チェックに失敗しました:', error);
    return false;
  }
};

// データの署名生成
export const generateDataSignature = (data: any): string => {
  try {
    const dataString = JSON.stringify(data);
    return CryptoJS.HmacSHA256(dataString, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('データ署名の生成に失敗しました:', error);
    return '';
  }
};

// セキュアなローカルストレージ操作
export const secureLocalStorage = {
  setItem: (key: string, value: any): void => {
    try {
      const encryptedValue = encryptObject(value);
      const signature = generateDataSignature(value);
      const secureData = {
        data: encryptedValue,
        signature: signature,
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(secureData));
    } catch (error) {
      console.error('セキュアなローカルストレージ保存に失敗しました:', error);
      // フォールバック: 平文で保存
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  getItem: (key: string): any => {
    try {
      const storedData = localStorage.getItem(key);
      if (!storedData) return null;

      const secureData = JSON.parse(storedData);
      
      // 署名がない場合は古いデータとして扱う
      if (!secureData.signature) {
        return JSON.parse(storedData);
      }

      // データの整合性をチェック
      const decryptedData = decryptObject(secureData.data);
      if (!decryptedData) return null;

      const isValid = verifyDataIntegrity(decryptedData, secureData.signature);
      if (!isValid) {
        console.warn('データの整合性チェックに失敗しました:', key);
        return null;
      }

      return decryptedData;
    } catch (error) {
      console.error('セキュアなローカルストレージ読み込みに失敗しました:', error);
      // フォールバック: 平文で読み込み
      try {
        return JSON.parse(localStorage.getItem(key) || 'null');
      } catch {
        return null;
      }
    }
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },

  clear: (): void => {
    localStorage.clear();
  },
};

// セッション管理
export class SecureSessionManager {
  private static instance: SecureSessionManager;
  private sessionToken: string | null = null;
  private sessionTimeout: number = 30 * 60 * 1000; // 30分

  private constructor() {
    this.sessionToken = this.generateSessionToken();
  }

  static getInstance(): SecureSessionManager {
    if (!SecureSessionManager.instance) {
      SecureSessionManager.instance = new SecureSessionManager();
    }
    return SecureSessionManager.instance;
  }

  private generateSessionToken(): string {
    return generateSecureToken(64);
  }

  getSessionToken(): string | null {
    return this.sessionToken;
  }

  validateSession(): boolean {
    if (!this.sessionToken) return false;
    
    // セッションタイムアウトのチェック
    const sessionData = secureLocalStorage.getItem('session_data');
    if (!sessionData || !sessionData.timestamp) return false;

    const now = Date.now();
    const sessionAge = now - sessionData.timestamp;
    
    if (sessionAge > this.sessionTimeout) {
      this.clearSession();
      return false;
    }

    return true;
  }

  createSession(userData: any): void {
    this.sessionToken = this.generateSessionToken();
    const sessionData = {
      token: this.sessionToken,
      user: userData,
      timestamp: Date.now(),
    };
    secureLocalStorage.setItem('session_data', sessionData);
  }

  clearSession(): void {
    this.sessionToken = null;
    secureLocalStorage.removeItem('session_data');
  }

  getUserData(): any {
    const sessionData = secureLocalStorage.getItem('session_data');
    return sessionData?.user || null;
  }
}

// 入力値のサニタイゼーション
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // HTMLタグを除去
    .replace(/javascript:/gi, '') // JavaScriptプロトコルを除去
    .replace(/on\w+=/gi, '') // イベントハンドラーを除去
    .trim();
};

// XSS対策
export const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// CSRF対策トークン生成
export const generateCSRFToken = (): string => {
  return generateSecureToken(32);
};

// レート制限チェック
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number = 10;
  private timeWindow: number = 60000; // 1分

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // 時間枠外のリクエストを削除
    const validRequests = userRequests.filter(time => now - time < this.timeWindow);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }

  clearOldRequests(): void {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.timeWindow);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

// セキュリティログ
export class SecurityLogger {
  private static instance: SecurityLogger;
  private logs: Array<{
    timestamp: number;
    level: 'info' | 'warning' | 'error';
    message: string;
    data?: any;
  }> = [];

  private constructor() {
    // 定期的にログをクリア
    setInterval(() => {
      this.clearOldLogs();
    }, 24 * 60 * 60 * 1000); // 24時間
  }

  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  log(level: 'info' | 'warning' | 'error', message: string, data?: any): void {
    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    this.logs.push(logEntry);
    console.log(`[Security ${level.toUpperCase()}] ${message}`, data || '');
  }

  getLogs(): Array<any> {
    return [...this.logs];
  }

  clearOldLogs(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.logs = this.logs.filter(log => log.timestamp > oneDayAgo);
  }
} 