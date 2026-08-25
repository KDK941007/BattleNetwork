from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'marker not found in {path}: {old!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

replace_once(
    'index.html',
    './js/combat/player-health.js?v=82',
    './js/combat/player-health.js?v=86',
)

replace_once(
    'sw.js',
    "const CACHE_NAME = 'battlenetwork-runtime-v85';",
    "const CACHE_NAME = 'battlenetwork-runtime-v86';",
)

replace_once(
    'GAME_DESIGN.md',
    '- プレイヤー初期最大HPの具体値は別途確定し、未確定の間は推測値を正式仕様にしない。',
    '- プレイヤー初期最大HPは `100` とする。',
)

status = Path('DEVELOPMENT_STATUS.md')
text = status.read_text(encoding='utf-8')
v85 = "v85でv84のサイズ感を維持したまま、プレイヤーHUD上端をCUSTOMゲージと同じ `top:4px` へ揃えた。HP／ココロウィンドウのサイズ・横位置・表示内容、CUSTOMゲージ本体の位置・サイズ・挙動は変更していない。実機確認でHUDのサイズ感と高さ位置に問題がないことを確認済み。\n"
v86 = "v86でプレイヤー初期最大HPを `100` に正式決定し、`player-health.js` の初期stateを `maxHp=100 / hp=100` で開始するよう変更した。既存の購読API経由で左上HUDはロード時から残HP `100` を表示する。`configureHealth()` / `clearHealth()` / `applyDamage()` の既存API仕様は変更していない。敵攻撃からの被ダメージ、撃破、リカバリー10の実回復、IndexedDB保存は後続フェーズとする。\n"
if v85 not in text:
    raise SystemExit('v85 marker not found')
text = text.replace(v85, v85 + v86, 1)
text = text.replace(
    '- プレイヤーHPの具体値・表示UI・敵攻撃からの被ダメージ接続。',
    '- 敵攻撃からプレイヤーHPへの被ダメージ接続。',
    1,
)
text = text.replace(
    '## 次フェーズ: プレイヤーHP具体値 → 被ダメージ接続',
    '## 次フェーズ: プレイヤー被ダメージ接続',
    1,
)
text = text.replace(
    'v82〜v85で左上HP表示とココロウィンドウの表示基盤、サイズ、CUSTOMゲージとの非干渉、高さ位置まで実機確認済み。次はプレイヤー初期最大HPの具体値を確定し、HUDへ実値を表示できる状態へ進める。その後、敵攻撃からの被ダメージへ接続する。リカバリー10の実回復はプレイヤーHP仕様確定後に接続する。',
    'v82〜v85で左上HP表示とココロウィンドウの表示基盤、サイズ、CUSTOMゲージとの非干渉、高さ位置まで実機確認済み。v86でプレイヤー初期最大HPを `100` に正式決定し、HUDへ残HP `100` を表示する状態へ進めた。次は敵攻撃からプレイヤーHPへの被ダメージを接続する。リカバリー10の実回復は被ダメージ接続後に進める。',
    1,
)
status.write_text(text, encoding='utf-8')
