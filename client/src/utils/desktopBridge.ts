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

export const desktopBridgeSendNotify = (title: string, body?: string) => {
  try {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'notify', title, body }));
    }
  } catch {}
};

// ローカルブリッジ（Electronが開く127.0.0.1:port）へもフォールバック接続
let localSock: WebSocket | null = null;
export const connectLocalDesktopBridge = () => {
  try {
    const port = Number(localStorage.getItem('desktop_local_port') || '17345');
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    localSock = ws;
    ws.onopen = () => {};
    ws.onclose = () => {
      setTimeout(connectLocalDesktopBridge, 3000);
    };
  } catch {}
};

export const localDesktopNotify = (title: string, body?: string) => {
  try { localSock?.send(JSON.stringify({ type: 'notify', title, body })); } catch {}
};

