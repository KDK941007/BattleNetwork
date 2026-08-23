# BattleNetwork

## Source Layout

```text
BattleNetwork/
├─ index.html
├─ css/
│  └─ style.css
├─ js/
│  ├─ game.js
│  └─ service-worker-register.js
├─ assets/
│  ├─ attributes/
│  └─ chips/
├─ sw.js
├─ DEVELOPMENT_STATUS.md
├─ DESIGN_NOTES.md
└─ GAME_DESIGN.md
```

- `index.html` - 画面構造のみを管理
- `css/style.css` - レイアウト・デザインを管理
- `js/game.js` - ゲーム、CUSTOM、コントローラー設定などの処理を管理
- `js/service-worker-register.js` - Service Worker の登録処理を管理
- `sw.js` - オフラインキャッシュを管理。スコープ維持のためルートに配置
- `assets/` - チップ画像・属性アイコンなどの静的素材

## Documents

- [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md) - 現在の実装状況と次に進める作業
- [DESIGN_NOTES.md](./DESIGN_NOTES.md) - 現行プロトタイプの詳細設計・実装メモ
- [GAME_DESIGN.md](./GAME_DESIGN.md) - ゲーム全体の企画・基本方針
