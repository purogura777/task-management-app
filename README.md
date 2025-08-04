# タスク管理アプリ

暗号化通信対応の使いやすいタスク管理アプリです。PWA（Progressive Web App）として実装されており、どこでもアクセス可能です。

## 機能

- ✅ **カンバンボード形式のタスク管理**
- ✅ **ドラッグ&ドロップでタスク移動**
- ✅ **優先度と期限日の設定**
- ✅ **PWA対応（オフライン動作）**
- ✅ **レスポンシブデザイン（スマホ・タブレット対応）**
- ✅ **ローカルストレージでのデータ保存**
- ✅ **通知機能**
- ✅ **複数ユーザー対応**

## 技術スタック

- **フロントエンド**: React + TypeScript + Material-UI
- **PWA**: Service Worker + Manifest
- **状態管理**: React Context + React Query
- **ルーティング**: React Router
- **UI**: Material-UI + Framer Motion
- **日付処理**: date-fns

## セットアップ

### 前提条件

- Node.js (v16以上)
- npm または yarn

### インストール

```bash
# 依存関係をインストール
npm run install-all

# 開発サーバーを起動
npm run dev
```

### デモアカウント

- **メール**: demo@example.com
- **パスワード**: password

## 使用方法

1. **ログイン**: デモアカウントまたは新規登録でログイン
2. **タスク作成**: 右下の「+」ボタンでタスクを作成
3. **タスク管理**: ドラッグ&ドロップでステータスを変更
4. **編集**: タスクカードの編集アイコンでタスクを編集
5. **設定**: ヘッダーのユーザーアイコンから設定画面にアクセス

## デプロイ

### Vercel（推奨）

```bash
# Vercel CLIをインストール
npm i -g vercel

# デプロイ
vercel
```

### Netlify

```bash
# ビルド
npm run build

# Netlifyにデプロイ
```

## セキュリティ

- データはローカルストレージに保存
- HTTPS通信で暗号化
- ユーザー認証によるデータ分離

## ブラウザ対応

- Chrome (推奨)
- Firefox
- Safari
- Edge

## ライセンス

MIT License

## 開発者

このアプリは要件に基づいて作成されたタスク管理アプリです。 