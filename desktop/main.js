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
let floatHidden = false;
let cachedIconData = null;

const isWindows = process.platform === 'win32';

function showFloating() {
  try {
    if (!floatWin) createFloatingWindow();
    floatWin.show();
    floatHidden = false;
    try { if (tray && tray.__updateMenu) tray.__updateMenu(); } catch {}
  } catch {}
}

function hideFloating() {
  try {
    if (floatWin) floatWin.hide();
    floatHidden = true;
    try { if (tray && tray.__updateMenu) tray.__updateMenu(); } catch {}
  } catch {}
}

function buildContextMenuTemplate() {
  const paired = !!store.get('pair_uid');
  return [
    { label: `状態: ${paired ? '連携中' : '未連携'}`, enabled: false },
    { type: 'separator' },
    { label: 'アイコンを表示', enabled: !!floatHidden, click: () => showFloating() },
    { label: 'アイコンを非表示', enabled: !floatHidden, click: () => hideFloating() },
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
  ];
}

function createFloatingWindow() {
  if (floatWin) return floatWin;
  
  console.log('=== フローティングウィンドウ作成開始 ===');
  
  // アイコンをデータURLに変換
  let iconDataUrl = '';
  try {
    // 1. カスタムアイコンデータを最優先で確認
    const customIcon = store.get('custom_icon_data');
    if (typeof customIcon === 'string' && customIcon.startsWith('data:')) {
      iconDataUrl = customIcon;
      console.log('✓ フローティング: カスタムアイコンを使用');
    } else {
      // 2. 保存済みアイコンデータをチェック
      const saved = store.get('icon_data');
      if (typeof saved === 'string' && saved.startsWith('data:')) {
        iconDataUrl = saved;
        console.log('✓ フローティング: 保存済みアイコンを使用');
      }
    }
    
    if (!iconDataUrl) {
      // 3. ファイルシステムからアイコンを読み込み
      const base = process.resourcesPath || process.cwd();
      const appPath = process.execPath ? path.dirname(process.execPath) : base;
      const projectRoot = path.join(__dirname, '..');
      
      const tryPaths = [
        // アプリ実行ファイルと同じディレクトリ
        path.join(appPath, 'icon.ico'),
        path.join(appPath, 'icon.png'),
        // resourcesディレクトリ内
        path.join(base, 'icon.ico'),
        path.join(base, 'icon.png'),
        // buildディレクトリ内
        path.join(base, 'build', 'icon.ico'),
        path.join(base, 'build', 'icon.png'),
        // プロジェクトルート
        path.join(projectRoot, 'ChatGPT-Image-2025年8月19日-19_55_16.ico'),
        path.join(projectRoot, 'icon.ico'),
        path.join(projectRoot, 'icon.png'),
        // 開発時のパス
        path.join(__dirname, '..', 'ChatGPT-Image-2025年8月19日-19_55_16.ico'),
      ];
      
      console.log('フローティングアイコン検索パス:');
      for (const p of tryPaths) {
        console.log('  -', p);
        try {
          const fs = require('fs');
          if (fs.existsSync(p)) {
            const img = nativeImage.createFromPath(p);
            if (img && !img.isEmpty()) {
              iconDataUrl = img.toDataURL();
              console.log('✓ フローティング: ファイルアイコンを使用:', p);
              // 成功したアイコンを保存
              store.set('icon_data', iconDataUrl);
              break;
            }
          }
        } catch (e) {
          console.log('  × 読み込み失敗:', e.message);
        }
      }
    }
    
    // 4. フォールバックアイコンを生成
    if (!iconDataUrl) {
      const fallbackIcon = createFallbackIcon(128);
      iconDataUrl = fallbackIcon.toDataURL();
      console.log('✓ フローティング: フォールバックアイコンを生成');
    }
    
  } catch (e) {
    console.error('フローティングアイコン作成エラー:', e);
    const fallbackIcon = createFallbackIcon(128);
    iconDataUrl = fallbackIcon.toDataURL();
    console.log('✓ フローティング: エラー時フォールバックアイコンを使用');
  }
  floatWin = new BrowserWindow({
    width: 140,
    height: 140,
    maxWidth: 650,
    maxHeight: 320,
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
      /* ドラッグ可能エッジを色で強調（太めのリング） */
      .ring { position:absolute; inset:0; border-radius:28px; -webkit-app-region: drag; pointer-events:none; box-shadow: inset 0 0 0 10px rgba(14,165,233,.55), inset 0 0 36px rgba(14,165,233,.30); }
      /* 端の16pxはドラッグ、中央96pxはクリック領域（広めのドラッグ） */
      .content { position:absolute; width:96px; height:96px; left:16px; top:16px; -webkit-app-region: no-drag; cursor:pointer; border-radius:20px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); overflow: hidden; }
      .icon-media { width: 100%; height: 100%; object-fit: cover; border-radius: 20px; }
      .badge { position:absolute; right:0px; top:0px; min-width:22px; height:22px; border-radius:11px; background:#e11d48; color:#fff; font-size:12px; display:flex; align-items:center; justify-content:center; padding:0 7px; }
      .list { position:absolute; left:156px; right:12px; top:12px; bottom:12px; width:auto; overflow:auto; background:rgba(17,24,39,.96); color:#e5e7eb; border-radius:12px; box-shadow:0 12px 28px rgba(0,0,0,.35); padding:12px; display:none; backdrop-filter: blur(8px); }
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
        <div id='iconContainer'></div>
      </div>
    </div>
    <div class='list' id='list'></div>
    <script>
      const { ipcRenderer, shell } = require('electron');
      const content = document.getElementById('content');
      const badge = document.getElementById('badge');
      const listEl = document.getElementById('list');
      const iconContainer = document.getElementById('iconContainer');
      let items = [];
      let open = false;
      
      // カスタムアイコンの設定
      function setupIcon() {
        const iconData = '` + iconDataUrl + `';
        const customIconType = '` + (store.get('custom_icon_type') || '') + `';
        
        if (iconData) {
          if (customIconType && customIconType.startsWith('video/')) {
            // 動画の場合
            iconContainer.innerHTML = '<video class="icon-media" src="' + iconData + '" autoplay loop muted></video>';
          } else if (customIconType && (customIconType === 'image/gif' || iconData.includes('data:image/gif'))) {
            // GIFの場合
            iconContainer.innerHTML = '<img class="icon-media" src="' + iconData + '" alt="カスタムアイコン">';
          } else {
            // 静止画の場合
            iconContainer.innerHTML = '<img class="icon-media" src="' + iconData + '" alt="カスタムアイコン">';
          }
        } else {
          // デフォルトアイコンの場合、背景画像を使用
          content.style.backgroundImage = 'url(' + iconData + ')';
          content.style.backgroundSize = 'cover';
          content.style.backgroundPosition = 'center';
        }
      }
      
      // 初期化時にアイコンを設定
      setupIcon();
      const render = () => {
        badge.innerText = items.length.toString();
        badge.style.display = items.length > 0 ? 'flex' : 'none';
        listEl.innerHTML = items.slice().reverse().map(function(x, idx){
          var dt = new Date(x.ts||Date.now());
          var time = dt.toLocaleString(undefined, { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
          var meta = [];
          if (x.dueDate) meta.push('期限: ' + x.dueDate);
          if (x.tTitle && x.tTitle !== x.title) meta.push('タスク: ' + x.tTitle);
          return "<div class='item' data-i='"+idx+"' data-id='"+(x.id||'')+"'>"
            + "<div class='top'><div class='t'>" + (x.title||'通知') + "</div><div class='d'>" + time + "</div></div>"
            + (x.body?("<div class='b'>" + x.body + "</div>") : "")
            + (meta.length? ("<div class='b' style='opacity:.7'>"+ meta.join(' ・ ') +"</div>") : "")
            + "<div style='margin-top:6px;display:flex;gap:6px'><button data-act='del' style='padding:4px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:transparent;color:#e5e7eb;cursor:pointer;font-size:10px'>削除</button></div>"
            + "</div>";
        }).join('');
        // 個別削除
        Array.from(listEl.querySelectorAll('button[data-act="del"]').values()).forEach(function(btn){
          btn.addEventListener('click', function(ev){
            ev.stopPropagation();
            var parent = ev.target.closest('.item');
            var i = Number(parent.getAttribute('data-i'));
            // 逆順描画なので実インデックスを変換
            var realIndex = items.length - 1 - i;
            items.splice(realIndex, 1);
            render();
          });
        });
      };
      content.addEventListener('click', ()=>{
        open = !open;
        listEl.style.display = open ? 'block' : 'none';
        // ウィンドウサイズを動的変更
        ipcRenderer.send('window:resize', { 
          width: open ? 620 : 140, 
          height: open ? 300 : 140 
        });
        if (open && items.length > 0){ 
          // リストを開いたら既読扱いでバッジをクリア
          badge.innerText='0'; 
          badge.style.display='none'; 
        }
      });
      // クリックをメインプロセスにも通知（必要に応じて拡張）
      content.addEventListener('mouseup', ()=>{ try { ipcRenderer.send('float:clicked'); } catch{} });
      // 右クリックでトレイメニューを開く（contentエリア内でのみ）
      content.addEventListener('contextmenu', (e)=>{ 
        e.preventDefault(); 
        e.stopPropagation();
        ipcRenderer.send('open:menu', { x: e.screenX, y: e.screenY }); 
      });
      
      // ウィンドウの透明領域での右クリックを無効化
      window.addEventListener('contextmenu', (e) => {
        if (e.target === document.body || e.target === document.documentElement) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
      ipcRenderer.on('notify', (_, payload)=>{ 
        // done完了はバッジ対象外
        if (payload && payload.status === 'done') return;
        items.push({ 
          id: payload.id || Date.now(), 
          title: payload.title, 
          body: payload.body, 
          dueDate: payload.dueDate, 
          tTitle: payload.tTitle, 
          ts: Date.now() 
        }); 
        if (items.length>50) items = items.slice(-50); 
        render(); 
        try {
          new Notification(payload.title||'通知', { body: payload.body||'' }); 
        } catch(e) {
          console.log('Notification failed:', e);
        }
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

// 基本的な青いアイコンを生成する関数
function createFallbackIcon(size = 16) {
  try {
    // サイズに応じたbase64アイコンを生成
    let iconBase64;
    
    if (size <= 16) {
      // 16x16の青いアイコン（Tマーク付き）
      iconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAdklEQVR42mNgGFbAEZhBB/wHYXtgBhewtbU9j6L5PzCfAMPAwEBL0/8R1f8HphuBaXc8mpH1/wemZYFpS3yakcPgPzAtBUzL4dGMHP7/gWkpYFoOj2ZkN/wHpmWBaUt8mlGC6z8wXQBM3wGm7+PRjBJc/w/UAAAYtyGlUt9qCgAAAABJRU5ErkJggg==';
    } else if (size <= 32) {
      // 32x32の青いアイコン
      iconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAdklEQVR42u2XwQ2AMAwDGzACi7MZc7AJm7EZc5AJuEZp1QqQqESR/CRKEjt/bVyIiIiIiEhE5K1tW+u9d865pmla55xzznXOOeecC84559b/3jnnnAvOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555z7Aw+/rBq+EWVhWgAAAABJRU5ErkJggg==';
    } else {
      // 128x128の青いアイコン（大きなサイズ用）
      iconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAOWSURBVHic7Z3NaxNBFMafJK1f1YOKiKgHwYOKBy8ePOjJg+DBgwf/AA8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDBw8ePHjw4MGDB48bAxdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXHDBBRdccMEFF1xwwQUXXPgPYj0Q9UKBWygAAAAASUVORK5CYII=';
    }
    
    return nativeImage.createFromDataURL(iconBase64);
  } catch (e) {
    console.error('フォールバックアイコン生成エラー:', e);
    return nativeImage.createEmpty();
  }
}

function createTray() {
  // 既存のトレイがあれば先に削除
  if (tray) {
    try {
      tray.destroy();
      tray = null;
    } catch {}
  }
  
  let image;
  console.log('=== トレイアイコン作成開始 ===');
  
  try {
    // 1. 保存済みアイコンデータをチェック
    const saved = store.get('icon_data');
    if (typeof saved === 'string' && saved.startsWith('data:')) {
      image = nativeImage.createFromDataURL(saved);
      if (image && !image.isEmpty()) {
        console.log('✓ トレイ: 保存済みアイコンを使用');
      } else {
        image = null;
      }
    }
    
    // 2. ファイルシステムからアイコンを読み込み
    if (!image || image.isEmpty()) {
      const base = process.resourcesPath || process.cwd();
      const appPath = process.execPath ? path.dirname(process.execPath) : base;
      const projectRoot = path.join(__dirname, '..');
      
      const tryPaths = [
        // アプリ実行ファイルと同じディレクトリ
        path.join(appPath, 'icon.ico'),
        path.join(appPath, 'icon.png'),
        // resourcesディレクトリ内
        path.join(base, 'icon.ico'),
        path.join(base, 'icon.png'),
        // buildディレクトリ内
        path.join(base, 'build', 'icon.ico'),
        path.join(base, 'build', 'icon.png'),
        // プロジェクトルート
        path.join(projectRoot, 'ChatGPT-Image-2025年8月19日-19_55_16.ico'),
        path.join(projectRoot, 'icon.ico'),
        path.join(projectRoot, 'icon.png'),
        // 開発時のパス
        path.join(__dirname, '..', 'ChatGPT-Image-2025年8月19日-19_55_16.ico'),
      ];
      
      console.log('アイコン検索パス:');
      for (const p of tryPaths) {
        console.log('  -', p);
        try {
          const fs = require('fs');
          if (fs.existsSync(p)) {
            const img = nativeImage.createFromPath(p);
            if (img && !img.isEmpty()) {
              image = img;
              console.log('✓ トレイ: ファイルアイコンを使用:', p);
              // 成功したアイコンを保存
              store.set('icon_data', img.toDataURL());
              break;
            }
          }
        } catch (e) {
          console.log('  × 読み込み失敗:', e.message);
        }
      }
    }
    
    // 3. フォールバックアイコンを生成
    if (!image || image.isEmpty()) {
      image = createFallbackIcon(16);
      console.log('✓ トレイ: フォールバックアイコンを生成');
    }
    
  } catch (e) {
    console.error('トレイアイコン作成エラー:', e);
    image = createFallbackIcon(16);
    console.log('✓ トレイ: エラー時フォールバックアイコンを使用');
  }
  
  // トレイを作成
  if (!image || image.isEmpty()) {
    image = createFallbackIcon(16);
    console.log('✓ トレイ: 最終フォールバックアイコンを使用');
  }
  
  console.log('トレイアイコンサイズ:', image.getSize());
  tray = new Tray(image);
  
  const updateMenu = () => {
    const contextMenu = Menu.buildFromTemplate(buildContextMenuTemplate());
    tray.setContextMenu(contextMenu);
    tray.setToolTip(`TaskManager Desktop${store.get('pair_uid') ? '（連携中）' : ''}`);
  };
  
  updateMenu();
  tray.__updateMenu = updateMenu;
  tray.on('click', () => { showFloating(); });
  
  console.log('=== トレイアイコン作成完了 ===');
}

function startLocalBridge() {
  // 既存サーバーがあれば先に閉じる
  if (wss) {
    try {
      wss.close();
      wss = null;
    } catch {}
  }

  const tryStart = (port, attempt = 0) => {
    try {
      const server = new WebSocketServer({ host: '127.0.0.1', port });
      
      server.on('error', (err) => {
        console.log('WebSocket server error on port', port, ':', err.code);
        if (err.code === 'EADDRINUSE' && attempt < 10) {
          console.log('Port', port, 'in use, trying', port + 1);
          return tryStart(port + 1, attempt + 1);
        }
      });

      server.on('listening', () => {
        console.log('Local WS bridge started successfully on port', port);
        wss = server;
        localPort = port;
        store.set('local_port', port);
      });

      server.on('connection', (ws) => {
        console.log('New WebSocket connection established');
        
        ws.on('message', (raw) => {
          try {
            const data = JSON.parse(raw.toString());
            console.log('Received message:', data.type);
            
            if (data.type === 'notify' && floatWin) {
              // 完了済みタスクは通知しない
              if (data.status === 'done') {
                console.log('Skipping notification for completed task');
                return;
              }
              floatWin.webContents.send('notify', { 
                title: data.title, 
                body: data.body,
                id: data.id,
                status: data.status,
                dueDate: data.dueDate,
                description: data.description,
                workspace: data.workspace
              });
            } else if (data.type === 'update_icon') {
              // WebSocket経由でのアイコン更新
              console.log('WebSocket経由でアイコン更新を受信');
              updateFloatingIcon({
                dataUrl: data.dataUrl,
                fileType: data.fileType,
                fileName: data.fileName
              });
            }
          } catch (e) {
            console.error('Error processing message:', e);
          }
        });
        
        // 接続確認メッセージ
        ws.send(JSON.stringify({ type: 'hello', ok: true, port: localPort }));
      });

    } catch (e) {
      console.error('Failed to create WebSocket server on port', port, ':', e);
      if (attempt < 10) {
        return tryStart(port + 1, attempt + 1);
      }
      console.warn('Failed to start local WS bridge after 10 attempts');
    }
  };

  // 保存されたポートから開始、なければ17345から
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

// 重複する初期化コードを削除（新しい初期化コードを使用）

ipcMain.on('float:pos', (_, pos) => {
  store.set('float_pos', pos);
});
// フローティング右クリックでメニューを前面に出して表示
ipcMain.on('open:menu', (_e, { x, y, adjustX, adjustY } = {}) => {
  try {
    // 一時的に最前面解除してメニューが背面に隠れないようにする
    try { if (floatWin) floatWin.setAlwaysOnTop(false); } catch {}
    const menu = Menu.buildFromTemplate(buildContextMenuTemplate());
    
    if (floatWin) {
      // フローティングウィンドウの位置とサイズを取得
      const winBounds = floatWin.getBounds();
      const { width: screenWidth, height: screenHeight } = require('electron').screen.getPrimaryDisplay().workAreaSize;
      
      // メニューサイズの概算（アイテム数 × 高さ）
      const menuHeight = buildContextMenuTemplate().length * 25; // 1アイテム約25px
      const menuWidth = 200; // メニュー幅の概算
      
      let menuX, menuY;
      
      // 画面右端近くの場合は左側に表示
      if (winBounds.x + winBounds.width + menuWidth > screenWidth) {
        menuX = winBounds.x - menuWidth - 5; // ウィンドウの左側
      } else {
        menuX = winBounds.x + winBounds.width + 5; // ウィンドウの右側
      }
      
      // 画面下端近くの場合は上側に調整
      if (winBounds.y + menuHeight > screenHeight) {
        menuY = Math.max(0, screenHeight - menuHeight - 5);
      } else {
        menuY = winBounds.y;
      }
      
      // 座標が0未満にならないよう調整
      menuX = Math.max(0, menuX);
      menuY = Math.max(0, menuY);
      
      console.log('メニュー表示位置:', { menuX, menuY, winBounds });
      
      menu.popup({ 
        x: menuX, 
        y: menuY, 
        callback: () => {
          try { if (floatWin) floatWin.setAlwaysOnTop(true, 'screen-saver'); } catch {}
        }
      });
    } else {
      menu.popup({ 
        callback: () => {
          try { if (floatWin) floatWin.setAlwaysOnTop(true, 'screen-saver'); } catch {}
        }
      });
    }
  } catch (error) {
    console.error('メニュー表示エラー:', error);
    try { if (floatWin) floatWin.setAlwaysOnTop(true, 'screen-saver'); } catch {}
  }
});

// 一覧展開に合わせてウィンドウ幅を可変（84px → 84+236px）
ipcMain.on('list:toggle', (_e, { open }) => {
  try {
    if (!floatWin) return;
    const targetW = open ? 620 : 140; // 右側パネル分をさらに広く
    const targetH = open ? 300 : 140; // 高さも拡張
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
      // 初回ブートストラップ後は確実に表示
      showFloating();
    } else if (u.host === 'icon') {
      // アイコン更新
      const action = u.searchParams.get('action');
      const data = u.searchParams.get('data');
      
      if (action === 'update_icon' && data) {
        try {
          const iconData = JSON.parse(data);
          updateFloatingIcon(iconData);
        } catch (parseError) {
          console.error('アイコンデータの解析に失敗:', parseError);
        }
      }
    }
  } catch (e) {
    console.warn('handleDeepLink error', e);
  }
}

function updateFloatingIcon(iconData) {
  try {
    console.log('フローティングアイコンを更新:', iconData.fileName);
    
    // カスタムアイコンデータを保存
    store.set('custom_icon_data', iconData.dataUrl);
    store.set('custom_icon_type', iconData.fileType);
    store.set('custom_icon_name', iconData.fileName);
    
    // フローティングウィンドウを再作成してアイコンを適用
    if (floatWin) {
      const wasVisible = floatWin.isVisible();
      const bounds = floatWin.getBounds();
      
      floatWin.close();
      floatWin = null;
      
      // 少し待ってから再作成
      setTimeout(() => {
        createFloatingWindow();
        if (wasVisible) {
          showFloating();
          floatWin.setBounds(bounds);
        }
        
        if (floatWin) {
          floatWin.webContents.send('notify', { 
            title: 'アイコン更新完了', 
            body: iconData.fileName + ' に変更しました' 
          });
        }
      }, 100);
    }
    
  } catch (error) {
    console.error('アイコン更新エラー:', error);
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
      const url = process.env.WEB_APP_URL || 'https://task-management-app-teal.vercel.app/settings';
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
        try {
          db.collection('users').doc(uid).collection('notifications').orderBy('createdAt','desc').limit(20)
            .onSnapshot(snap => {
              try {
                snap.docChanges().forEach(ch => {
                  if (ch.type === 'added') {
                    const d = ch.doc.data();
                    ipcRenderer.send('cloud:notify', { title: d.title || '通知', body: d.body || '', status: d.status, dueDate: d.dueDate, tTitle: d.title });
                  }
                });
              } catch (e) { ipcRenderer.send('cloud:notify', { title: '通知の受信でエラー', body: String(e) }); }
            }, (err) => {
              ipcRenderer.send('cloud:notify', { title: '通知購読に失敗', body: String(err && err.message || err) });
            });
        } catch (e) {
          ipcRenderer.send('cloud:notify', { title: '通知購読の初期化に失敗', body: String(e) });
        }
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

// ウィンドウリサイズハンドラー
ipcMain.on('window:resize', (_e, { width, height }) => {
  try {
    if (floatWin) {
      floatWin.setSize(width, height);
      floatWin.setAlwaysOnTop(true, 'screen-saver');
    }
  } catch (e) {
    console.log('Window resize failed:', e);
  }
});

// アプリケーションの初期化
app.whenReady().then(() => {
  console.log('=== アプリケーション初期化開始 ===');
  
  try {
    // スキーム登録
    app.setAsDefaultProtocolClient('taskapp');
    
    // トレイアイコンを作成
    createTray();
    console.log('✓ トレイアイコン作成完了');
    
    // フローティングウィンドウを作成
    createFloatingWindow();
    console.log('✓ フローティングウィンドウ作成完了');
    
    // 自動起動設定を有効化
    if (autoStartEnabled) {
      app.setLoginItemSettings({ openAtLogin: true });
      console.log('✓ 自動起動を有効化');
    }
    
    // ローカルブリッジを開始
    startLocalBridge();
    console.log('✓ ローカルブリッジ開始');
    
    // 保存された設定で自動接続
    const savedUid = store.get('pair_uid');
    const savedCfg = store.get('firebase_cfg');
    if (savedUid && savedCfg) {
      console.log('✓ 保存された設定で自動接続開始');
      startCloudListener(savedUid, savedCfg);
    } else {
      console.log('- 保存された設定なし、セットアップ待機画面を表示');
      openAuthWindow();
    }
    
    console.log('=== アプリケーション初期化完了 ===');
    
  } catch (error) {
    console.error('アプリケーション初期化エラー:', error);
    
    // エラー時でも最低限のUIを表示
    try {
      createTray();
      createFloatingWindow();
      openAuthWindow();
    } catch (fallbackError) {
      console.error('フォールバック処理も失敗:', fallbackError);
    }
  }
});

// ディープリンク処理（macOS/Linux）
app.on('open-url', (event, urlStr) => {
  event.preventDefault();
  handleDeepLink(urlStr);
});

// ディープリンク処理（Windows）
app.on('second-instance', (event, commandLine, workingDirectory) => {
  const url = commandLine.find(arg => arg.startsWith('taskapp://'));
  if (url) {
    handleDeepLink(url);
  }
  
  // セカンドインスタンスが起動された場合、既存のウィンドウを表示
  if (floatWin) {
    showFloating();
  }
});

// アプリ終了時の処理
app.on('before-quit', () => {
  console.log('アプリケーション終了中...');
  
  try {
    if (wss) {
      wss.close();
    }
    if (webSocket) {
      webSocket.close();
    }
  } catch (error) {
    console.error('終了処理エラー:', error);
  }
});

// Windowsでウィンドウが全て閉じられた時の処理
app.on('window-all-closed', () => {
  // トレイアプリなので、アプリケーションは終了しない
  console.log('全ウィンドウが閉じられましたが、トレイアプリとして動作継続');
});

// macOSでアプリがアクティブになった時の処理
app.on('activate', () => {
  if (!floatWin) {
    createFloatingWindow();
  }
  showFloating();
});

console.log('=== メインプロセス起動完了 ===');

