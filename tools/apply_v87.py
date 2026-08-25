from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'expected text not found in {path}: {old[:80]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


# index.html: load the generic player-damage resolver after game.js has exposed BattleNetworkPlayer.
index = Path('index.html')
text = index.read_text(encoding='utf-8')
if './js/combat/player-damage-system.js?v=87' not in text:
    needle = '<script src="./js/game.js?v=78"></script>\n'
    if needle not in text:
        raise SystemExit('game.js script tag not found')
    text = text.replace(needle, needle + '<script src="./js/combat/player-damage-system.js?v=87"></script>\n', 1)
index.write_text(text, encoding='utf-8')

# Service Worker: new runtime cache and precache the new module.
sw = Path('sw.js')
text = sw.read_text(encoding='utf-8')
text = text.replace("const CACHE_NAME = 'battlenetwork-runtime-v86';", "const CACHE_NAME = 'battlenetwork-runtime-v87';", 1)
if "'./js/combat/player-damage-system.js'" not in text:
    needle = "  './js/combat/player-health.js',\n"
    if needle not in text:
        raise SystemExit('player-health precache entry not found')
    text = text.replace(needle, needle + "  './js/combat/player-damage-system.js',\n", 1)
sw.write_text(text, encoding='utf-8')

# DEVELOPMENT_STATUS.md: record the new generic receive path without inventing an enemy attack spec.
status = Path('DEVELOPMENT_STATUS.md')
text = status.read_text(encoding='utf-8')
v86_line = "v86でプレイヤー初期最大HPを `100` に正式決定し、`player-health.js` の初期stateを `maxHp=100 / hp=100` で開始するよう変更した。既存の購読API経由で左上HUDはロード時から残HP `100` を表示する。`configureHealth()` / `clearHealth()` / `applyDamage()` の既存API仕様は変更していない。敵攻撃からの被ダメージ、撃破、リカバリー10の実回復、IndexedDB保存は後続フェーズとする。 実機確認で左上HUDが `100` 表示になっていることを確認済み。"
v87_line = "v87で `js/combat/player-damage-system.js` を追加し、敵攻撃側から渡されるHit情報をプレイヤーHitBoxで判定して `BattleNetworkPlayerHealth.applyDamage()` へ接続する共通被ダメージ経路を実装した。点攻撃は `resolvePointHit()`、Range攻撃は既存 `RangeGeometry.intersectsBounds()` を使う `resolveRangeHit()` で処理し、命中時は既存購読APIにより左上HUDへ残HPが自動反映される。敵AI・敵攻撃の生成・攻撃力・攻撃パターン・無敵時間・ノックバック・撃破処理は未確定のため今回決めていない。v87はリポジトリ確認対象で、実際の被ダメージ実機確認は最初の敵攻撃実装後に行う。"
if v87_line not in text:
    if v86_line not in text:
        raise SystemExit('v86 history line not found')
    text = text.replace(v86_line, v86_line + '\n' + v87_line, 1)
text = text.replace('- 敵攻撃からプレイヤーHPへの被ダメージ接続。\n', '', 1)
old_head = '## 次フェーズ: プレイヤー被ダメージ接続'
new_head = '## 次フェーズ: 最初の敵攻撃基盤'
text = text.replace(old_head, new_head, 1)
old_para = "v82〜v85で左上HP表示とココロウィンドウの表示基盤、サイズ、CUSTOMゲージとの非干渉、高さ位置まで実機確認済み。v86でプレイヤー初期最大HPを `100` に正式決定し、HUDへ残HP `100` を表示する状態へ進めた。次は敵攻撃からプレイヤーHPへの被ダメージを接続する。リカバリー10の実回復は被ダメージ接続後に進める。"
new_para = "v82〜v85で左上HP表示とココロウィンドウの表示基盤、サイズ、CUSTOMゲージとの非干渉、高さ位置まで実機確認済み。v86でプレイヤー初期最大HPを `100` に正式決定し、v87で敵攻撃HitからプレイヤーHitBox判定・HP減算・HUD更新までの共通被ダメージ経路を実装した。次は最初の敵攻撃について攻撃種類・威力・予兆・発生間隔を確定し、このv87経路へ接続する。リカバリー10の実回復は実被ダメージ確認後に進める。"
if old_para in text:
    text = text.replace(old_para, new_para, 1)
text = text.replace('5. プレイヤーHPへ進む。', '5. 最初の敵攻撃仕様を確定し、v87の被ダメージ経路へ接続する。', 1)
status.write_text(text, encoding='utf-8')
