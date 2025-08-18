TaskManager Desktop Helper

- トレイ常駐 + 透過フローティング（ドラッグ移動・常に最前面）
- Web版とリアルタイム連携（WSエンドポイントを設定可能）

開発

```
cd desktop
npm install
npm run start
```

ビルド（Windows）

```
cd desktop
npm run dist
```

起動オプション

- `ws_url` をアプリ内に保存（既定は `wss://example.invalid/ws`）

