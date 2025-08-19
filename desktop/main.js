import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { WebSocketServer } from 'ws';

const store = new Store();
let tray = null;
let floatWin = null;
let webSocket = null;
let schemeReady = false;
let wss = null;
let localPort = 17345;
let authWin = null;
let cloudWin = null;
let autoStartEnabled = true;

const isWindows = process.platform === 'win32';

function createFloatingWindow() {
  if (floatWin) return floatWin;
  floatWin = new BrowserWindow({
    width: 84,
    height: 84,
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
      body { margin:0; overflow:hidden; background:transparent; }
      .panel { width:72px; height:72px; border-radius:16px; background:linear-gradient(135deg,#14b8a6,#0ea5e9); box-shadow:0 14px 28px rgba(14,165,233,.35); position:absolute; left:6px; top:6px; cursor:grab; display:flex; align-items:center; justify-content:center; color:#fff; font-family:sans-serif; }
      .badge { position:absolute; right:-4px; top:-4px; min-width:18px; height:18px; border-radius:9px; background:#e11d48; color:#fff; font-size:12px; display:flex; align-items:center; justify-content:center; padding:0 4px; }
    </style></head><body>
    <div class='panel' id='panel'><span id='icon'>🔔</span><div class='badge' id='badge' style='display:none'>0</div></div>
    <script>
      const { ipcRenderer, remote } = require('electron');
      const panel = document.getElementById('panel');
      const badge = document.getElementById('badge');
      let dragging=false; let sx=0, sy=0;
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
  // トレイアイコン（ビルドアイコンが無い場合のフォールバック）
  let image;
  try {
    const iconPath = path.join(process.cwd(), 'build', isWindows ? 'icon.ico' : 'icon.png');
    image = nativeImage.createFromPath(iconPath);
    if (!image || image.isEmpty()) throw new Error('no icon');
  } catch {
    image = nativeImage.createEmpty();
  }
  tray = new Tray(image);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'ログイン', click: () => openAuthWindow() },
    { label: 'ログアウト', click: () => doLogout() },
    { type: 'separator' },
    {
      label: '自動起動を有効にする',
      type: 'checkbox',
      checked: autoStartEnabled,
      click: (item) => {
        autoStartEnabled = item.checked;
        app.setLoginItemSettings({ openAtLogin: autoStartEnabled });
      }
    },
    { type: 'separator' },
    { label: 'バッジをクリア', click: () => floatWin && floatWin.webContents.send('badge:clear') },
    { type: 'separator' },
    { label: '終了', click: () => app.quit() },
  ]);
  tray.setToolTip('TaskManager Desktop');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => { if (!floatWin) createFloatingWindow(); else floatWin.show(); });
}

function startLocalBridge() {
  const tryStart = (port, attempt = 0) => {
    try {
      const server = new WebSocketServer({ host: '127.0.0.1', port });
      server.on('connection', (ws) => {
        ws.on('message', (raw) => {
          try {
            const data = JSON.parse(raw.toString());
            if (data.type === 'notify' && floatWin) {
              floatWin.webContents.send('notify', { title: data.title, body: data.body });
            }
          } catch {}
        });
      });
      wss = server;
      localPort = port;
      store.set('local_port', port);
      console.log('Local WS bridge started on', port);
    } catch (e) {
      if (attempt < 10) return tryStart(port + 1, attempt + 1);
      console.warn('Failed to start local WS bridge', e);
    }
  };
  const saved = Number(store.get('local_port') || 17345);
  tryStart(saved);
}

function connectRealtime() {
  const base = store.get('ws_url') || 'wss://example.invalid/ws';
  const token = store.get('pair_token');
  const uid = store.get('pair_uid');
  let url = base;
  const params = new URLSearchParams();
  if (token) params.set('token', String(token));
  if (uid) params.set('uid', String(uid));
  if ([...params.keys()].length > 0) url = `${base}${base.includes('?') ? '&' : '?'}${params.toString()}`;
  try {
    webSocket = new (require('ws'))(url);
    webSocket.on('open', () => console.log('WS connected'));
    webSocket.on('message', (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.type === 'notify' && floatWin) {
          floatWin.webContents.send('notify', { title: data.title, body: data.body });
          // forward to local web clients
          try {
            if (wss) {
              for (const client of wss.clients) {
                try { client.send(JSON.stringify({ type: 'notify', title: data.title, body: data.body })); } catch {}
              }
            }
          } catch {}
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
  try { app.setLoginItemSettings({ openAtLogin: true }); autoStartEnabled = true; } catch {}
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
  startLocalBridge();
  connectRealtime();
  // 既存ログインがあればクラウド購読を開始
  const uid = store.get('pair_uid');
  const cfg = store.get('firebase_cfg');
  if (uid && cfg) startCloudListener(uid, cfg);
  // 初回起動または未ログイン時はログイン画面を自動表示
  if (!uid) openAuthWindow();
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
    } else if (u.host === 'pair') {
      const uid = u.searchParams.get('uid');
      if (uid) {
        store.set('pair_uid', uid);
        if (webSocket && webSocket.close) try { webSocket.close(); } catch {}
        setTimeout(connectRealtime, 200);
        if (floatWin) floatWin.webContents.send('notify', { title: 'デスクトップ連携', body: 'ペアリングしました' });
      }
    } else if (u.host === 'bootstrap') {
      // 1本のリンクでFirebase設定とUIDをまとめてセット
      const cfg = {
        apiKey: u.searchParams.get('apiKey'),
        authDomain: u.searchParams.get('authDomain'),
        projectId: u.searchParams.get('projectId')
      };
      if (cfg.apiKey && cfg.authDomain && cfg.projectId) {
        store.set('firebase_cfg', cfg);
      }
      const uid = u.searchParams.get('uid');
      if (uid) store.set('pair_uid', uid);
      if (webSocket && webSocket.close) try { webSocket.close(); } catch {}
      setTimeout(connectRealtime, 200);
      if (cfg.apiKey && uid) if (floatWin) floatWin.webContents.send('notify', { title: 'セットアップ完了', body: '設定とペアリングを保存しました' });
    }
  } catch (e) {
    console.warn('handleDeepLink error', e);
  }
}

function openAuthWindow() {
  if (authWin) { authWin.focus(); return; }
  authWin = new BrowserWindow({
    width: 420,
    height: 560,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  const savedCfg = store.get('firebase_cfg') || {};
  authWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <html><head><meta charset='utf-8'><title>ログイン</title>
    <style>body{font-family:sans-serif;margin:16px}input,button{width:100%;margin:6px 0;padding:8px}small{color:#666}</style>
    </head><body>
    <h3>Firebase 設定</h3>
    <input id='apiKey' placeholder='apiKey' value='${savedCfg.apiKey || ''}' />
    <input id='authDomain' placeholder='authDomain' value='${savedCfg.authDomain || ''}' />
    <input id='projectId' placeholder='projectId' value='${savedCfg.projectId || ''}' />
    <h3>ログイン</h3>
    <input id='email' placeholder='メールアドレス' />
    <input id='password' placeholder='パスワード' type='password' />
    <button id='loginBtn'>保存してログイン</button>
    <small>Googleログイン等は後続対応可能です。</small>
    <script>
      const { ipcRenderer } = require('electron');
      document.getElementById('loginBtn').onclick = async () => {
        const cfg = {
          apiKey: document.getElementById('apiKey').value.trim(),
          authDomain: document.getElementById('authDomain').value.trim(),
          projectId: document.getElementById('projectId').value.trim(),
        };
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !email || !password) {
          alert('すべて入力してください'); return;
        }
        const appUrl = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js';
        const authUrl = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js';
        const firestoreUrl = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js';
        await new Promise(r=>{ const s=document.createElement('script'); s.src=appUrl; s.onload=r; document.body.appendChild(s); });
        await new Promise(r=>{ const s=document.createElement('script'); s.src=authUrl; s.onload=r; document.body.appendChild(s); });
        await new Promise(r=>{ const s=document.createElement('script'); s.src=firestoreUrl; s.onload=r; document.body.appendChild(s); });
        const app = firebase.initializeApp(cfg);
        const auth = firebase.auth();
        try {
          const res = await auth.signInWithEmailAndPassword(email, password);
          const uid = res.user.uid;
          ipcRenderer.send('auth:login', { uid, cfg });
        } catch(e) { alert('ログイン失敗: '+e.message); }
      };
    </script>
    </body></html>
  `));
  authWin.on('closed', () => { authWin = null; });
}

function startCloudListener(uid, cfg) {
  if (cloudWin) { try { cloudWin.close(); } catch {} cloudWin = null; }
  cloudWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });
  cloudWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <html><body><script>
      const { ipcRenderer } = require('electron');
      const cfg = ${JSON.stringify(cfg)};
      const uid = ${JSON.stringify(uid)};
      const load = (u)=> new Promise(r=>{ const s=document.createElement('script'); s.src=u; s.onload=r; document.body.appendChild(s); });
      (async () => {
        await load('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
        await load('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
        await load('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js');
        firebase.initializeApp(cfg);
        const db = firebase.firestore();
        const auth = firebase.auth();
        try { await auth.setPersistence('local'); } catch {}
        db.collection('users').doc(uid).collection('notifications').orderBy('createdAt','desc').limit(20)
          .onSnapshot(snap => {
            snap.docChanges().forEach(ch => {
              if (ch.type === 'added') {
                const d = ch.doc.data();
                ipcRenderer.send('cloud:notify', { title: d.title || '通知', body: d.body || '' });
              }
            });
          });
      })();
    </script></body></html>
  `));
}

function doLogout() {
  store.delete('pair_uid');
  if (cloudWin) { try { cloudWin.close(); } catch {} cloudWin = null; }
  if (floatWin) floatWin.webContents.send('notify', { title: 'ログアウト', body: 'デスクトップ連携を停止しました' });
}

ipcMain.on('auth:login', (_e, { uid, cfg }) => {
  store.set('pair_uid', uid);
  store.set('firebase_cfg', cfg);
  if (authWin) { try { authWin.close(); } catch {} authWin = null; }
  startCloudListener(uid, cfg);
  if (floatWin) floatWin.webContents.send('notify', { title: 'ログイン成功', body: 'デスクトップ連携を開始します' });
});

