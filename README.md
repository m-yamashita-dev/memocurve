# MemoCurve 🧠 忘却曲線暗記アプリ

スクリーンショットを問題として登録し、SM-2忘却曲線アルゴリズムで最適なタイミングで復習できる暗記アプリです。

---

## 🚀 Vercelへのデプロイ手順（iPhoneでも使えるようにする）

### ステップ1：GitHubにアップロード

1. [github.com](https://github.com) でアカウント作成（無料）
2. 「New repository」をクリック → リポジトリ名を入力（例：`memocurve`）
3. このフォルダの中身を全てアップロード

   **方法A（初心者向け）：**
   - GitHub上の「uploading an existing file」をクリック
   - フォルダをドラッグ＆ドロップ

   **方法B（ターミナル使える方）：**
   ```bash
   git init
   git add .
   git commit -m "first commit"
   git remote add origin https://github.com/あなたのID/memocurve.git
   git push -u origin main
   ```

### ステップ2：Vercelでデプロイ

1. [vercel.com](https://vercel.com) にアクセス → GitHubアカウントで無料登録
2. 「New Project」→ 先ほど作ったGitHubリポジトリを選択
3. 設定はそのまま（自動検出されます）→「Deploy」をクリック
4. 1〜2分後に `https://memocurve-xxxxx.vercel.app` のようなURLが発行される 🎉

### ステップ3：iPhoneのホーム画面に追加

1. iPhoneのSafariで発行されたURLを開く
2. 下の共有ボタン（□↑）をタップ
3. 「ホーム画面に追加」→「追加」
4. アプリアイコンがホーム画面に追加される！

---

## ⚙️ ローカルで動かす方法（PC）

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開く

---

## 📱 機能

- 📸 スクリーンショットを問題としてアップロード
- 🧠 SM-2アルゴリズムで最適な復習タイミングを計算
- 📊 今日解くべき問題を自動抽出
- ✅ 理解度を4段階で評価（全然/難しい/普通/簡単）
- 🗑 個別削除・選択削除・一括削除
- 💾 データはブラウザのlocalStorageに永続保存

---

## ⚠️ 注意

- データはブラウザに保存されるため、PCとiPhoneのデータは別々です
- Safariのプライベートブラウズではデータが消えます
