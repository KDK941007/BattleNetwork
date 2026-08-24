# BattleNetwork

## Source Layout

```text
BattleNetwork/
├─ index.html
├─ css/
│  ├─ style.css
│  ├─ font.css
│  ├─ chip-detail.css
│  └─ components.css
├─ js/
│  ├─ master/
│  │  ├─ chip-definitions.js
│  │  ├─ chip-master.js
│  │  ├─ chip-relations.js
│  │  └─ chip-service.js
│  ├─ data/
│  │  ├─ database.js
│  │  └─ save-data.js
│  ├─ game.js
│  └─ service-worker-register.js
├─ assets/
│  ├─ attributes/
│  └─ chips/
├─ sw.js
├─ MASTER_DATA_DESIGN.md
├─ DEVELOPMENT_STATUS.md
├─ DESIGN_NOTES.md
└─ GAME_DESIGN.md
```

- `index.html` - 画面構造とスクリプト読み込み順を管理
- `css/style.css` - 基本レイアウト・デザインを管理
- `css/font.css` - フォント設定を管理
- `css/chip-detail.css` - チップ詳細固有のレイアウトを管理
- `css/components.css` - 複数画面で共通利用するUI部品を管理
- `js/master/` - チップ等の全ユーザー共通固定データと参照サービス
- `js/data/database.js` - IndexedDB `BattleNetworkDB` のスキーマ・基本アクセス
- `js/data/save-data.js` - 所持チップ・フォルダ・進行状況等のセーブデータアクセス層
- `js/game.js` - ゲーム、CUSTOM、コントローラー設定などの処理を管理
- `js/service-worker-register.js` - Service Worker の登録処理を管理
- `sw.js` - オフラインキャッシュを管理。スコープ維持のためルートに配置
- `assets/` - チップ画像・属性アイコンなどの静的素材

## Data Responsibility

- JS Master: チップ、属性・系統、コード、クラス、主要値種別、Range、Behavior等の固定定義
- IndexedDB: 所持チップ、フォルダ、プレイヤー進行状況等のユーザー依存データ
- localStorage: コントローラー配置・サイズ・透明度等の端末固有の軽量設定

## Documents

- [MASTER_DATA_DESIGN.md](./MASTER_DATA_DESIGN.md) - チップマスタ・Range/Behavior・IndexedDBのSource of Truth
- [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) - 現在の実装状況と次に進める作業
- [DESIGN_NOTES.md](./DESIGN_NOTES.md) - 現行プロトタイプの詳細設計・実装メモ
- [GAME_DESIGN.md](./GAME_DESIGN.md) - ゲーム全体の企画・基本方針
