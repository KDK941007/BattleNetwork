from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise RuntimeError(f'pattern not found in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


# index.html: load lightweight damage blink CSS and bust player-damage-system cache.
replace_once(
    'index.html',
    '<link rel="stylesheet" href="./css/player-hud.css?v=85">\n',
    '<link rel="stylesheet" href="./css/player-hud.css?v=85">\n<link rel="stylesheet" href="./css/player-damage.css?v=91">\n'
)
replace_once(
    'index.html',
    '<script src="./js/combat/player-damage-system.js?v=87"></script>',
    '<script src="./js/combat/player-damage-system.js?v=91"></script>'
)

# Service worker cache version and new CSS asset.
replace_once(
    'sw.js',
    "const CACHE_NAME = 'battlenetwork-runtime-v90';",
    "const CACHE_NAME = 'battlenetwork-runtime-v91';"
)
replace_once(
    'sw.js',
    "  './css/player-hud.css',\n",
    "  './css/player-hud.css',\n  './css/player-damage.css',\n"
)

# Formal game design: EXE4-inspired post-hit short invincibility.
replace_once(
    'GAME_DESIGN.md',
    '- プレイヤー初期最大HPは `100` とする。\n\n---\n\n## 5. B攻撃',
    '''- プレイヤー初期最大HPは `100` とする。\n\n### 被弾後無敵（ショートインビジ相当）\n\n- 通常の被弾で実ダメージが成立した場合、ロックマンエグゼ4のショートインビジを参考に `2秒` の被弾後無敵を付与する。\n- 被弾後無敵中はプレイヤー本体を半透明の段階点滅で表示し、被弾状態を視覚的に判別できるようにする。\n- 被弾後無敵中は通常攻撃による追加ダメージを受けない。飛翔する通常弾はプレイヤーへ重なっても命中扱いにせず、そのまま通過させる。\n- 将来、ショートインビジを発生させない攻撃や無敵を貫通する攻撃を追加する場合は、攻撃側の明示的な性能として個別設計する。\n- のけぞり・ノックバックは被弾後無敵とは分離し、後続フェーズで設計する。\n\n---\n\n## 5. B攻撃'''
)

# Development status: record v91 implementation and move to device verification.
v90 = '''v90で `BattleNetworkPlayerHealth.applyHealing()` を追加し、既存チップ「リカバリー10」を実HPへ接続した。回復量は既存マスタの `RECOVERY=10` をそのまま使用し、現在HPへ10加算する。回復後HPは最大HP100でクランプするため、例えば `80→90`、`95→100` となり100を超えない。HP変化は既存の購読API経由で左上HUDへ即時反映される。HP満タン時は新たな使用制限を追加せず、従来の `useChip()` 消費フローを維持したまま実回復量0となる。撃破後の蘇生は行わない。実機確認で被ダメージ後の10回復、最大HP100での打ち止め、HUD即時反映に問題がないことを確認済み。'''
v91 = '''v90で `BattleNetworkPlayerHealth.applyHealing()` を追加し、既存チップ「リカバリー10」を実HPへ接続した。回復量は既存マスタの `RECOVERY=10` をそのまま使用し、現在HPへ10加算する。回復後HPは最大HP100でクランプするため、例えば `80→90`、`95→100` となり100を超えない。HP変化は既存の購読API経由で左上HUDへ即時反映される。HP満タン時は新たな使用制限を追加せず、従来の `useChip()` 消費フローを維持したまま実回復量0となる。撃破後の蘇生は行わない。実機確認で被ダメージ後の10回復、最大HP100での打ち止め、HUD即時反映に問題がないことを確認済み。\n\nv91で原作EXE4の被弾後ショートインビジを参考に、通常被弾が成立した直後から `2秒` の被弾後無敵を `player-damage-system.js` へ追加した。無敵中は `resolvePointHit()` / `resolveRangeHit()` が `INVINCIBLE` として追加ダメージを不成立にし、点攻撃のテスト弾はプレイヤーへ重なっても命中扱いにならず通過する。見た目は `css/player-damage.css` の `opacity` だけを使った段階点滅とし、負荷の大きい `filter` やglowは使用しない。撃破に至る被弾では無敵を開始しない。のけぞり・ノックバックは今回含めない。CUSTOM等で戦闘を一時停止している間に無敵時間自体を停止するかは未確定のため、v91実装では `performance.now()` 基準の実時間で管理する。v91は2秒間の点滅、連続被弾防止、無敵中の弾通過を実機確認待ち。'''
replace_once('DEVELOPMENT_STATUS.md', v90, v91)

replace_once(
    'DEVELOPMENT_STATUS.md',
    '- 被弾処理。\n- 敵攻撃と攻撃予兆。',
    '- 被弾時ののけぞり・ノックバック。\n- 本番敵AIに紐づく正式な敵攻撃と攻撃予兆。'
)

old_next = '''## 次フェーズ: 被弾演出・無敵時間\n\nv82〜v85で左上HP表示とココロウィンドウ、v86で初期HP100、v87〜v88で被ダメージ経路とテスト敵攻撃、v89でキャノン非貫通、v90でリカバリー10の実HP回復まで実機確認済み。次は被弾したことを視覚的に分かるようにする被弾演出と、連続接触でHPが瞬時に削れ続けないための無敵時間を設計・実装する。具体的な演出方式・無敵時間の秒数は既存仕様を確認したうえで確定し、推測では決めない。\n\n優先対象は以下。\n\n1. 被弾演出の表示方式を確定する。\n2. 被弾後の無敵時間の仕様と具体値を確定する。\n3. v87の共通被ダメージ経路へ被弾状態を接続する。\n4. 無敵時間中の重複ダメージを防止し、HUD更新との整合を確認する。\n5. その後、ノックバック・撃破処理へ拡張する。\n6. 敵AI・Wave進行へ段階的に進める。'''
new_next = '''## 次フェーズ: v91 被弾後無敵 実機確認\n\nv82〜v85で左上HP表示とココロウィンドウ、v86で初期HP100、v87〜v88で被ダメージ経路とテスト敵攻撃、v89でキャノン非貫通、v90でリカバリー10の実HP回復まで実機確認済み。v91ではEXE4を参考に被弾成功後2秒のショートインビジ相当と、軽量な半透明点滅を接続した。次は実機で点滅時間、連続被弾防止、無敵中の弾通過、操作負荷に問題がないことを確認する。\n\n優先対象は以下。\n\n1. 敵弾を受けた直後にプレイヤーが約2秒間点滅することを確認する。\n2. 点滅中に別の通常敵弾が重なってもHPが追加で減らないことを確認する。\n3. 点滅中の敵弾がプレイヤーで消えず、そのまま通過することを確認する。\n4. 点滅中の移動・旋回・B攻撃・CUSTOMゲージ表示で負荷退行がないことを確認する。\n5. v91確認後、のけぞり・ノックバックと撃破処理へ進む。\n6. 敵AI・Wave進行へ段階的に進める。'''
replace_once('DEVELOPMENT_STATUS.md', old_next, new_next)
