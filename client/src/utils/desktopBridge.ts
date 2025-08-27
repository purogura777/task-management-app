let socket: WebSocket | null = null;
let lastUrl = '';
let lastToken = '';
let retryTimer: any = null;

export const connectDesktopBridge = (url: string, token: string) => {
  if (!url || !token) return;
  const full = url.includes('?') ? `${url}&token=${encodeURIComponent(token)}` : `${url}?token=${encodeURIComponent(token)}`;
  if (socket && socket.readyState === WebSocket.OPEN && full === lastUrl) return;
  try {
    if (socket) {
      try { socket.close(); } catch {}
      socket = null;
    }
    lastUrl = full;
    lastToken = token;
    socket = new WebSocket(full);
    socket.onopen = () => {
      // hello
      try { socket?.send(JSON.stringify({ type: 'hello', role: 'web' })); } catch {}
    };
    socket.onclose = () => {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => connectDesktopBridge(url, token), 3000);
    };
    socket.onerror = () => {};
  } catch {}
};

export const desktopBridgeSendNotify = (title: string, body?: string, extra?: any) => {
  try {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'notify', title, body, ...extra }));
    }
  } catch {}
};

// ローカルブリッジ（Electronが開く127.0.0.1:port）へもフォールバック接続
let localSock: WebSocket | null = null;
let localRetryCount = 0;
let localRetryTimer: any = null;
const MAX_LOCAL_RETRIES = 3; // 最大3回まで再試行

export const connectLocalDesktopBridge = () => {
  // 既に接続試行中または成功している場合はスキップ
  if (localSock && localSock.readyState === WebSocket.CONNECTING) return;
  if (localSock && localSock.readyState === WebSocket.OPEN) return;
  
  const tryPorts = Array.from({ length: 4 }, (_, i) => 17345 + i); // 17345-17348に縮小
  let index = 0;
  
  const tryConnect = () => {
    // 再試行回数制限
    if (localRetryCount >= MAX_LOCAL_RETRIES) {
      console.log('デスクトップブリッジ接続を停止（最大再試行回数に達しました）');
      return;
    }
    
    try {
      const p = tryPorts[index % tryPorts.length];
      console.log(`デスクトップブリッジ接続試行: ${p}`);
      
      const ws = new WebSocket(`ws://127.0.0.1:${p}`);
      localSock = ws;
      
      ws.onopen = () => {
        console.log(`デスクトップブリッジ接続成功: ${p}`);
        localRetryCount = 0; // 成功時はカウンターリセット
        try { localStorage.setItem('desktop_local_port', String(p)); } catch {}
      };
      
      ws.onclose = () => {
        if (localRetryCount < MAX_LOCAL_RETRIES) {
          index += 1;
          localRetryCount += 1;
          clearTimeout(localRetryTimer);
          localRetryTimer = setTimeout(tryConnect, 3000); // 3秒待機に延長
        }
      };
      
      ws.onerror = () => {
        try { ws.close(); } catch {}
      };
      
    } catch (error) {
      console.warn('デスクトップブリッジ接続エラー:', error);
      if (localRetryCount < MAX_LOCAL_RETRIES) {
        index += 1;
        localRetryCount += 1;
        clearTimeout(localRetryTimer);
        localRetryTimer = setTimeout(tryConnect, 3000);
      }
    }
  };
  
  tryConnect();
};

// Webの設定画面などから再接続トリガーを飛ばせるようイベント待受
try {
  if (typeof window !== 'undefined') {
    window.addEventListener('connectLocalDesktopBridge', () => {
      try { connectLocalDesktopBridge(); } catch {}
    });
  }
} catch {}

export const localDesktopNotify = (title: string, body?: string, extra?: any) => {
  try { localSock?.send(JSON.stringify({ type: 'notify', title, body, ...extra })); } catch {}
};

// WebSocket接続をクリーンアップする関数
export const disconnectDesktopBridge = () => {
  try {
    if (socket) {
      socket.close();
      socket = null;
    }
    if (localSock) {
      localSock.close();
      localSock = null;
    }
    clearTimeout(retryTimer);
    clearTimeout(localRetryTimer);
    localRetryCount = 0;
    console.log('デスクトップブリッジ接続をクリーンアップしました');
  } catch (error) {
    console.warn('デスクトップブリッジクリーンアップエラー:', error);
  }
};

