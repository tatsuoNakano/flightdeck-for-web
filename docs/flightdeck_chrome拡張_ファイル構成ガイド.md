# Flightdeck for web Chrome拡張 — ファイル構成ガイド

Flightdeck for web（MV3）拡張の最小かつ拡張しやすい構成と、その役割・雛形をまとめたMarkdownです。

---

## ルート構成（ディレクトリツリー）

```
flightdeck/
├─ manifest.json
├─ background/
│  └─ service-worker.js
├─ content/
│  ├─ content.js
│  ├─ ui.js
│  └─ styles.css
├─ options/
│  ├─ options.html
│  ├─ options.js
│  └─ options.css
├─ data/
│  └─ default-keymaps.json
├─ assets/
│  ├─ icon-16.png
│  ├─ icon-48.png
│  └─ icon-128.png
├─ lib/
│  ├─ storage.js
│  └─ url-template.js
├─ test/
│  └─ e2e-notes.md
└─ README.md
```

---

## 役割（要点）

- **manifest.json**: MV3 宣言。権限（`activeTab`, `tabs`, `storage`, `scripting`, `host_permissions` など）と Service Worker / Content Scripts / Options UI の登録。
- **background/service-worker.js**: タブ生成（`chrome.tabs.create`）、`chrome.storage.sync` へのI/O、メッセージ受け口（`chrome.runtime.onMessage`）。
- **content/content.js**: Shift×2 検知、選択テキスト取得、ランチャー表示・キー入力フック、Service Worker へリクエスト送信。
- **content/ui.js / styles.css**: オーバーレイUI構築（ダーク、角丸、<kbd>風キー）、A11y属性付与。
- **options/**: 既定/ユーザー定義キーマップの CRUD、`chrome.storage.sync` へ保存・復元。
- **data/default-keymaps.json**: 初期キーマップ（表を JSON 化して読み込み）。
- **lib/storage.js**: `getKeymaps()/setKeymaps()` の薄いラッパ。
- **lib/url-template.js**: `{{q}}` を `encodeURIComponent` で差し込み URL 生成。
- **test/**: e2e の観点メモや将来のPlaywright等の下書き。

---

## `manifest.json` 雛形（MV3）

```json
{
  "manifest_version": 3,
  "name": "Flightdeck for web",
  "version": "0.1.0",
  "description": "Shift×2でミニランチャー、1〜数文字で検索/遷移",
  "icons": {
    "16": "assets/icon-16.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png"
  },
  "permissions": ["activeTab", "tabs", "storage", "scripting"],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background/service-worker.js" },
  "content_scripts": [
    {
      "matches": ["http://*/*", "https://*/*"],
      "js": ["content/content.js", "content/ui.js"],
      "css": ["content/styles.css"],
      "run_at": "document_idle"
    }
  ],
  "options_ui": { "page": "options/options.html", "open_in_tab": true }
}
```

> **メモ**: `host_permissions` はテンプレート遷移や検索の幅を確保するため広めに定義。公開時は最小権限に絞る方針を推奨。

---

## `data/default-keymaps.json`（例）

```json
{
  "g": { "label": "Google", "template": "https://www.google.com/search?q={{q}}", "search": true },
  "S": { "label": "Google Scholar", "template": "https://scholar.google.com/scholar?hl=ja&q={{q}}", "search": true },
  "y": { "label": "YouTube", "template": "https://www.youtube.com/results?search_query={{q}}", "search": true }
}
```

> **データモデル指針**: `key -> { label, template, search }`。`template` の `{{q}}` は `encodeURIComponent` で置換。

---

## 実装フロー（ざっくり）

1. **content.js** が Shift×2 を ~350ms ダブル押下で検知し、オーバーレイのランチャーを表示。
2. 入力文字に対して前方一致でキー候補を絞り、1件に確定したら補完実行。選択テキスト（または入力文字列）を `{{q}}` に差し込み URL 生成。
3. **Service Worker** にメッセージ送信（"新規タブで開く"）。SW 側で `chrome.tabs.create` を実行。
4. **options** でキーマップを CRUD。`chrome.storage.sync` に保存・復元（初回は `default-keymaps.json` を seed）。

---

## 小さなコード指針

- **URLテンプレート**: `template.replace("{{q}}", encodeURIComponent(query))` で実装。`https:` 強制・`about:`/`chrome:` 等の無効URLは弾く。
- **アクセシビリティ**: ランチャーは `role="dialog"`、`aria-modal="true"`、ショートカット説明用の `aria-describedby` を付与。
- **スタイル**: ダーク背景＋半透明、外側クリック/ESCで閉じる。フォーカストラップ必須。
- **同期**: `chrome.storage.sync` は配列サイズ・書き込み頻度に制限があるため小粒データ＆スロットリング。

---

## 今後の拡張ポイント

- **キーバインドの重複検知**、**インポート/エクスポート（JSON）**、**サイト別オーバーライド**。
- **テスト**: ランチャーのフォーカス移動、候補絞り込み、URL生成のユニットテスト。
- **パフォーマンス**: コンテンツ側は遅延ロード、UIは Shadow DOM で衝突回避。

---

## ライセンス/README

- `README.md` にセットアップ、権限理由、キーマップ仕様、スクリーンショットを整理。
- OSS前提ならライセンス（MIT など）を同梱。

