import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } from 'electron';
import path from 'path';
import Store from 'electron-store';

const store = new Store();
let tray = null;
let floatWin = null;
let webSocket = null;
let schemeReady = false;

const isWindows = process.platform === 'win32';

function createFloatingWindow() {
  if (floatWin) return floatWin;
  floatWin = new BrowserWindow({
    width: 72,
    height: 72,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  floatWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <html><head><style>
      body { margin:0; overflow:hidden; }
      .ball { width:60px; height:60px; border-radius:30px; background:linear-gradient(135deg,#6366f1,#4f46e5); box-shadow:0 10px 24px rgba(79,70,229,.35); position:absolute; left:6px; top:6px; cursor:grab; display:flex; align-items:center; justify-content:center; color:#fff; font-family:sans-serif; }
      .badge { position:absolute; right:-4px; top:-4px; min-width:18px; height:18px; border-radius:9px; background:#e11d48; color:#fff; font-size:12px; display:flex; align-items:center; justify-content:center; padding:0 4px; }
    </style></head><body>
    <div class='ball' id='ball'><span id='icon'>🔔</span><div class='badge' id='badge' style='display:none'>0</div></div>
    <script>
      const { ipcRenderer, remote } = require('electron');
      const ball = document.getElementById('ball');
      const badge = document.getElementById('badge');
      let dragging=false; let sx=0, sy=0; let bx=6, by=6;
      function setPos(x,y){ bx=x; by=y; window.moveTo(x,y); }
      window.addEventListener('mousedown', (e)=>{ dragging=true; sx=e.screenX; sy=e.screenY; document.body.style.cursor='grabbing'; });
      window.addEventListener('mouseup', ()=>{ dragging=false; document.body.style.cursor=''; ipcRenderer.send('float:pos', {x:window.screenX, y:window.screenY}); });
      window.addEventListener('mousemove', (e)=>{ if(!dragging) return; const dx=e.screenX-sx; const dy=e.screenY-sy; sx=e.screenX; sy=e.screenY; window.moveTo(window.screenX+dx, window.screenY+dy); });
      ipcRenderer.on('notify', (_, payload)=>{ const cnt = Number(badge.innerText||'0')+1; badge.innerText=String(cnt); badge.style.display='flex'; new Notification(payload.title||'通知', { body: payload.body||'' }); });
      ipcRenderer.on('badge:clear', ()=>{ badge.innerText='0'; badge.style.display='none'; });
    </script>
    </body></html>
  `));
  const saved = store.get('float_pos');
  if (saved && saved.x && saved.y) {
    floatWin.setPosition(saved.x, saved.y);
  }
  return floatWin;
}

function createTray() {
  const iconPath = path.join(process.cwd(), 'build', isWindows ? 'icon.ico' : 'icon.png');
  const image = nativeImage.createFromPath(iconPath);
  tray = new Tray(image);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'バッジをクリア', click: () => floatWin && floatWin.webContents.send('badge:clear') },
    { type: 'separator' },
    { label: '終了', click: () => app.quit() },
  ]);
  tray.setToolTip('TaskManager Desktop');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => { if (!floatWin) createFloatingWindow(); else floatWin.show(); });
}

function connectRealtime() {
  const base = store.get('ws_url') || 'wss://example.invalid/ws';
  const token = store.get('pair_token');
  const url = token ? `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : base;
  try {
    webSocket = new (require('ws'))(url);
    webSocket.on('open', () => console.log('WS connected'));
    webSocket.on('message', (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.type === 'notify' && floatWin) {
          floatWin.webContents.send('notify', { title: data.title, body: data.body });
        }
      } catch {}
    });
    webSocket.on('close', () => setTimeout(connectRealtime, 3000));
    webSocket.on('error', () => {});
  } catch (e) {
    console.warn('WS connect error', e);
  }
}

app.whenReady().then(() => {
  // プロトコルハンドラ登録（インストーラ経由で恒久化）
  try {
    if (process.defaultApp) {
      if (process.argv.length >= 2) app.setAsDefaultProtocolClient('taskapp', process.execPath, [path.resolve(process.argv[1])]);
    } else {
      app.setAsDefaultProtocolClient('taskapp');
    }
    schemeReady = true;
  } catch {}

  createFloatingWindow();
  createTray();
  connectRealtime();
});

ipcMain.on('float:pos', (_, pos) => {
  store.set('float_pos', pos);
});

app.on('window-all-closed', (e) => {
  // 常駐のため終了しない
  e.preventDefault();
});

// シングルインスタンス制御
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    // Windows: プロトコルURLはargvに渡る
    const urlArg = argv.find(a => a.startsWith('taskapp://'));
    if (urlArg) handleDeepLink(urlArg);
    if (floatWin) floatWin.show();
  });
}

app.on('open-url', (event, urlStr) => {
  // macOS: プロトコルURL
  event.preventDefault();
  handleDeepLink(urlStr);
});

function handleDeepLink(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.host === 'set') {
      const ws = u.searchParams.get('ws');
      const token = u.searchParams.get('token');
      if (ws) {
        store.set('ws_url', ws);
        if (webSocket && webSocket.close) try { webSocket.close(); } catch {}
        setTimeout(connectRealtime, 200);
      }
      if (token) {
        store.set('pair_token', token);
      }
      if (floatWin) floatWin.webContents.send('notify', { title: 'デスクトップ連携', body: '設定を更新しました' });
    }
  } catch (e) {
    console.warn('handleDeepLink error', e);
  }
}

