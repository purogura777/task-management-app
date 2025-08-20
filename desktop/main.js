const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } = require('electron');
const path = require('path');
const Store = require('electron-store');
const WebSocket = require('ws');
const { WebSocketServer } = require('ws');

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
let cachedIconData = null;

const isWindows = process.platform === 'win32';

function createFloatingWindow() {
  if (floatWin) return floatWin;
  // アイコンをデータURLに変換（.ico→PNG）
  let iconDataUrl = '';
  try {
    const saved = store.get('icon_data');
    if (typeof saved === 'string' && saved.startsWith('data:')) {
      iconDataUrl = saved;
    } else {
      const tryPaths = [
        path.join(process.resourcesPath || process.cwd(), 'icon.png'),
        path.join(process.resourcesPath || process.cwd(), 'icon.ico'),
      ];
      for (const p of tryPaths) {
        const img = nativeImage.createFromPath(p);
        if (img && !img.isEmpty()) { iconDataUrl = img.toDataURL(); break; }
      }
    }
  } catch {}
  floatWin = new BrowserWindow({
    width: 140,
    height: 140,
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
  try {
    floatWin.setAlwaysOnTop(true, 'screen-saver');
    floatWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
    floatWin.on('focus', () => { try { floatWin.setAlwaysOnTop(true, 'screen-saver'); } catch {} });
    floatWin.on('blur', () => { try { floatWin.setAlwaysOnTop(true, 'screen-saver'); } catch {} });
    floatWin.on('show', () => { try { floatWin.setAlwaysOnTop(true, 'screen-saver'); } catch {} });
  } catch {}
  floatWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <html><head><style>
      body { margin:0; overflow:hidden; background:transparent; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; }
      .panel { width:128px; height:128px; border-radius:28px; background:#0b1220; position:absolute; left:6px; top:6px; box-shadow:0 16px 36px rgba(0,0,0,.35), 0 0 32px rgba(20,184,166,.25); background-size:cover; background-position:center; -webkit-app-region: drag; cursor: grab; }
      .panel:active { cursor: grabbing; }
      /* ドラッグ可能エッジを色で強調 */
      .ring { position:absolute; inset:0; border-radius:28px; -webkit-app-region: drag; pointer-events:none; box-shadow: inset 0 0 0 6px rgba(14,165,233,.45), inset 0 0 24px rgba(14,165,233,.25); }
      /* 端の8pxはドラッグ、中央112pxはクリック領域 */
      .content { position:absolute; width:112px; height:112px; left:8px; top:8px; -webkit-app-region: no-drag; cursor:pointer; border-radius:22px; }
      .badge { position:absolute; right:0px; top:0px; min-width:22px; height:22px; border-radius:11px; background:#e11d48; color:#fff; font-size:12px; display:flex; align-items:center; justify-content:center; padding:0 7px; }
      .list { position:absolute; left:140px; right:12px; top:12px; bottom:12px; width:auto; overflow:auto; background:rgba(17,24,39,.96); color:#e5e7eb; border-radius:12px; box-shadow:0 12px 28px rgba(0,0,0,.35); padding:12px; display:none; backdrop-filter: blur(8px); }
      .item { padding:8px 10px; border-radius:10px; background:rgba(255,255,255,0.03); }
      .item + .item { margin-top:4px; }
      .item .top { display:flex; align-items:center; justify-content:space-between; }
      .item .t { font-weight:700; font-size:12px; }
      .item .d { font-size:11px; opacity:.7; margin-left:8px; }
      .item .b { font-size:12px; opacity:.85; margin-top:4px; }
    </style></head><body>
    <div class='panel' id='panel'>
      <div class='ring'></div>
      <div class='content' id='content'>
        <div class='badge' id='badge' style='display:none'>0</div>
      </div>
      <div class='list' id='list'></div>
    </div>
    <script>
      const { ipcRenderer, shell } = require('electron');
      const content = document.getElementById('content');
      const badge = document.getElementById('badge');
      const listEl = document.getElementById('list');
      let items = [];
      let open = false;
      const render = () => {
        listEl.innerHTML = items.slice().reverse().map(function(x){
          var dt = new Date(x.ts||Date.now());
          var time = dt.toLocaleString(undefined, { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
          return "<div class='item'>"
            + "<div class='top'><div class='t'>" + (x.title||'通知') + "</div><div class='d'>" + time + "</div></div>"
            + (x.body?("<div class='b'>" + x.body + "</div>") : "")
            + "</div>";
        }).join('');
      };
      content.addEventListener('click', ()=>{
        open = !open;
        listEl.style.display = open ? 'block' : 'none';
        ipcRenderer.send('list:toggle', { open });
        if (open){ badge.innerText='0'; badge.style.display='none'; }
      });
      ipcRenderer.on('notify', (_, payload)=>{ 
        // done完了はバッジ対象外
        if (payload && payload.status === 'done') return;
        items.push({ title: payload.title, body: payload.body, ts: Date.now() }); 
        if (items.length>50) items = items.slice(-50); 
        render(); 
        const cnt = Number(badge.innerText||'0')+1; 
        badge.innerText=String(cnt); 
        badge.style.display='flex'; 
        new Notification(payload.title||'通知', { body: payload.body||'' }); 
      });
      ipcRenderer.on('badge:clear', ()=>{ badge.innerText='0'; badge.style.display='none'; });
      ipcRenderer.on('icon:update', (_e, dataUrl)=>{ try{ document.getElementById('panel').style.backgroundImage = "url('" + dataUrl + "')"; }catch{} });
    </script>
    </body></html>
  `));
  try { floatWin.webContents.once('did-finish-load', () => { try { floatWin.webContents.send('icon:update', iconDataUrl); } catch {} }); } catch {}
  const saved = store.get('float_pos');
  if (saved && saved.x && saved.y) {
    floatWin.setPosition(saved.x, saved.y);
  }
  try { floatWin.on('move', () => { const [x,y] = floatWin.getPosition(); store.set('float_pos', { x, y }); }); } catch {}
  // 保存された位置が無い場合は画面右下に移動
  try {
    if (!saved || !saved.x || !saved.y) {
      const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
      floatWin.setPosition(Math.max(0, width - 160), Math.max(0, height - 180));
    }
  } catch {}
  return floatWin;
}

function createTray() {
  // トレイアイコン（ビルドアイコンが無い場合のフォールバック）
  let image;
  try {
    const saved = store.get('icon_data');
    if (typeof saved === 'string' && saved.startsWith('data:')) {
      image = nativeImage.createFromDataURL(saved);
    }
    if (!image || image.isEmpty()) {
      // OS別に最適な形式を選択
      const base = process.resourcesPath || process.cwd();
      const ico = nativeImage.createFromPath(path.join(base, 'icon.ico'));
      const png = nativeImage.createFromPath(path.join(base, 'icon.png'));
      image = (!ico.isEmpty() ? ico : png);
    }
    if (!image || image.isEmpty()) throw new Error('no icon');
  } catch {
    image = nativeImage.createEmpty();
  }
  tray = new Tray(image);
  const updateMenu = () => {
    const paired = !!store.get('pair_uid');
    const contextMenu = Menu.buildFromTemplate([
      { label: `状態: ${paired ? '連携中' : '未連携'}`, enabled: false },
      { type: 'separator' },
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
    tray.setContextMenu(contextMenu);
    tray.setToolTip(`TaskManager Desktop${paired ? '（連携中）' : ''}`);
  };
  updateMenu();
  // メニュー更新関数を他から呼べるように保存
  tray.__updateMenu = updateMenu;
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
    webSocket = new WebSocket(url);
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
  try { app.setAppUserModelId('com.taskmanager.desktophelper'); } catch {}
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

// 一覧展開に合わせてウィンドウ幅を可変（84px → 84+236px）
ipcMain.on('list:toggle', (_e, { open }) => {
  try {
    if (!floatWin) return;
    const targetW = open ? 520 : 140; // 右側パネル分も考慮して広く確保
    const targetH = open ? 220 : 140; // 上下に余白を確保
    const [x, y] = floatWin.getPosition();
    // 画面外に出ないよう調整
    const { width: sw, height: sh } = require('electron').screen.getPrimaryDisplay().workAreaSize;
    let nx = x;
    if (open && x + targetW > sw) nx = Math.max(0, sw - targetW - 4);
    let ny = y;
    if (open && y + targetH > sh) ny = Math.max(0, sh - targetH - 4);
    floatWin.setBounds({ x: nx, y: ny, width: targetW, height: targetH });
    try { floatWin.setAlwaysOnTop(true, 'screen-saver'); } catch {}
  } catch {}
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
        try { if (tray && tray.__updateMenu) tray.__updateMenu(); } catch {}
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
      // アイコンURLを受け取ったら取り込み
      const iconUrl = u.searchParams.get('icon');
      (async () => {
        try {
          if (iconUrl) {
            const res = await fetch(iconUrl);
            if (res.ok) {
              const ab = await res.arrayBuffer();
              const buf = Buffer.from(ab);
              // 拡張子からMIMEを推定
              const mime = iconUrl.toLowerCase().endsWith('.png') ? 'image/png' : iconUrl.toLowerCase().endsWith('.jpg') || iconUrl.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
              const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
              store.set('icon_data', dataUrl);
              if (floatWin) try { floatWin.webContents.send('icon:update', dataUrl); } catch {}
              if (tray) try { tray.setImage(nativeImage.createFromDataURL(dataUrl)); } catch {}
            }
          }
        } catch {}
      })();
      if (webSocket && webSocket.close) try { webSocket.close(); } catch {}
      setTimeout(connectRealtime, 200);
      if (cfg.apiKey && uid) if (floatWin) floatWin.webContents.send('notify', { title: 'セットアップ完了', body: '設定とペアリングを保存しました' });
      try { if (tray && tray.__updateMenu) tray.__updateMenu(); } catch {}
      // ブートストラップ完了後は案内ウィンドウを閉じて購読を開始
      if (authWin) { try { authWin.close(); } catch {} authWin = null; }
      if (cfg && uid) startCloudListener(uid, cfg);
    }
  } catch (e) {
    console.warn('handleDeepLink error', e);
  }
}

function openAuthWindow() {
  if (authWin) { authWin.focus(); return; }
  authWin = new BrowserWindow({
    width: 420,
    height: 280,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  authWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <html><head><meta charset='utf-8'><title>セットアップ待機中</title>
    <style>body{font-family:sans-serif;margin:16px;line-height:1.6}</style>
    </head><body>
    <h3>デスクトップ連携の自動セットアップ</h3>
    <p>Webの「設定 > デスクトップ連携」で「デスクトップを自動セットアップ」をクリックしてください。<br/>
    受信した設定を保存し、通知の購読を開始します。</p>
    <p><button id='openWeb' style='padding:8px 12px;border-radius:8px;border:1px solid #ccc;cursor:pointer'>Webの設定画面を開く</button></p>
    <script>
      const { shell } = require('electron');
      const url = process.env.WEB_APP_URL || 'https://task-management-app.vercel.app/settings';
      document.getElementById('openWeb').addEventListener('click', ()=> shell.openExternal(url));
    </script>
    <p style='color:#666'>この画面は自動で閉じます。</p>
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

// Firestore側からの通知をフローティング/ローカルWSへ中継
ipcMain.on('cloud:notify', (_e, payload) => {
  try { if (floatWin) floatWin.webContents.send('notify', payload); } catch {}
  try {
    if (wss) {
      for (const client of wss.clients) {
        try { client.send(JSON.stringify({ type: 'notify', title: payload.title, body: payload.body })); } catch {}
      }
    }
  } catch {}
});

ipcMain.on('auth:login', (_e, { uid, cfg }) => {
  store.set('pair_uid', uid);
  store.set('firebase_cfg', cfg);
  if (authWin) { try { authWin.close(); } catch {} authWin = null; }
  startCloudListener(uid, cfg);
  if (floatWin) floatWin.webContents.send('notify', { title: 'ログイン成功', body: 'デスクトップ連携を開始します' });
});

