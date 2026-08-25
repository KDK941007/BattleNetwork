from pathlib import Path

index = Path('index.html')
text = index.read_text(encoding='utf-8')
needle = '<script src="./js/combat/player-damage-system.js?v=87"></script>'
insert = needle + '\n<script src="./js/combat/enemy-test-attack.js?v=88"></script>'
if 'enemy-test-attack.js?v=88' not in text:
    if needle not in text:
        raise SystemExit('index insertion point not found')
    text = text.replace(needle, insert, 1)
index.write_text(text, encoding='utf-8')

sw = Path('sw.js')
text = sw.read_text(encoding='utf-8')
text = text.replace("battlenetwork-runtime-v87", "battlenetwork-runtime-v88", 1)
needle = "  './js/combat/player-damage-system.js',"
insert = needle + "\n  './js/combat/enemy-test-attack.js',"
if "'./js/combat/enemy-test-attack.js'" not in text:
    if needle not in text:
        raise SystemExit('sw insertion point not found')
    text = text.replace(needle, insert, 1)
sw.write_text(text, encoding='utf-8')

status = Path('DEVELOPMENT_STATUS.md')
text = status.read_text(encoding='utf-8')
entry = "v88で最初の実被ダメージ確認用として、テスト敵へ単発の直線弾攻撃を追加した。テスト値は威力 `10`、発射前予兆 `0.7秒`、弾速 `720 world units/秒`、次攻撃まで `2.2秒`。予兆開始時のプレイヤー位置へ照準方向を固定し、静的な射線予兆後に弾を発射する。弾中心のworld座標をv87の `resolvePointHit()` へ渡し、プレイヤーHitBoxへ命中した場合のみHPを減算してHUDへ反映する。CUSTOM／設定／チップ詳細／配置編集表示中は攻撃を停止・取消する。これらの値は被ダメージ経路を実機確認するためのテスト値であり、本番敵の正式バランス値としては確定しない。無敵時間・ノックバック・被弾演出・敵AI本体は後続フェーズとする。v88は実機確認待ち。\n"
marker = "\n新規チップ追加は一旦止め"
if 'v88で最初の実被ダメージ確認用として' not in text:
    if marker not in text:
        raise SystemExit('status history marker not found')
    text = text.replace(marker, '\n' + entry + marker, 1)
old = "## 次フェーズ: 最初の敵攻撃基盤\n\nv82〜v85で左上HP表示とココロウィンドウの表示基盤、サイズ、CUSTOMゲージとの非干渉、高さ位置まで実機確認済み。v86でプレイヤー初期最大HPを `100` に正式決定し、v87で敵攻撃HitからプレイヤーHitBox判定・HP減算・HUD更新までの共通被ダメージ経路を実装した。次は最初の敵攻撃について攻撃種類・威力・予兆・発生間隔を確定し、このv87経路へ接続する。リカバリー10の実回復は実被ダメージ確認後に進める。"
new = "## 次フェーズ: v88 実被ダメージ確認\n\nv82〜v85で左上HP表示とココロウィンドウの表示基盤、サイズ、CUSTOMゲージとの非干渉、高さ位置まで実機確認済み。v86でプレイヤー初期最大HPを `100` に正式決定し、v87で共通被ダメージ経路、v88でテスト敵の直線単発弾を接続した。次は予兆を見て回避できること、命中時だけHPが `100→90` と減ること、CUSTOM／設定中に攻撃されないことを実機確認する。リカバリー10の実回復は実被ダメージ確認後に進める。"
if old in text:
    text = text.replace(old, new, 1)
text = text.replace("5. 最初の敵攻撃仕様を確定し、v87の被ダメージ経路へ接続する。", "5. v88の直線弾で予兆・回避・命中時HP減算を実機確認する。", 1)
status.write_text(text, encoding='utf-8')
