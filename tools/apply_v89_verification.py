from pathlib import Path

status_path = Path('DEVELOPMENT_STATUS.md')
text = status_path.read_text(encoding='utf-8')

old_v89 = "v89でキャノンのBehaviorを正式設計どおり非貫通へ修正した。従来は `CANNON_SHOT` がLINE Range内の全敵へ到達時間ごとにダメージを予約していたため、射線上に複数敵がいる場合に後方の敵までダメージが入っていた。`getFirstCannonHit()` で発射方向上の最前面HitBoxだけを取得し、ダメージ対象をその1体に限定する。同時に `game.js` のキャノン弾の飛翔距離も最初の敵までへ短縮し、最初の敵へ到達した時点で弾DOMを消す。キャノンのRange `LINE(5×0.75)`、威力、弾速、表示サイズ、床影は変更しない。v89は複数敵が射線上に並んだ場合の非貫通を実機確認待ち。"
new_v89 = "v89でキャノンのBehaviorを正式設計どおり非貫通へ修正した。従来は `CANNON_SHOT` がLINE Range内の全敵へ到達時間ごとにダメージを予約していたため、射線上に複数敵がいる場合に後方の敵までダメージが入っていた。`getFirstCannonHit()` で発射方向上の最前面HitBoxだけを取得し、ダメージ対象をその1体に限定する。同時に `game.js` のキャノン弾の飛翔距離も最初の敵までへ短縮し、最初の敵へ到達した時点で弾DOMを消す。キャノンのRange `LINE(5×0.75)`、威力、弾速、表示サイズ、床影は変更しない。実機確認で、キャノン弾が最初の敵で停止し、後方へ貫通しないことを確認済み。"
if old_v89 not in text:
    raise SystemExit('v89 status marker not found')
text = text.replace(old_v89, new_v89, 1)

old_phase = """## 次フェーズ: v88 実被ダメージ確認

v82〜v85で左上HP表示とココロウィンドウの表示基盤、サイズ、CUSTOMゲージとの非干渉、高さ位置まで実機確認済み。v86でプレイヤー初期最大HPを `100` に正式決定し、v87で共通被ダメージ経路、v88でテスト敵の直線単発弾を接続した。次は予兆を見て回避できること、命中時だけHPが `100→90` と減ること、CUSTOM／設定中に攻撃されないことを実機確認する。リカバリー10の実回復は実被ダメージ確認後に進める。

優先対象は以下。

1. 敵の残HPが足元側だけに40pxで表示され、ダメージ時に正しく更新されることを確認する。
2. 通常ロックバスター／チャージショット発射時の移動・旋回・画面描画負荷が改善していることを確認する。
3. キャノンの床影表示に退行がないことも合わせて確認する。
4. 配置編集バーとY方向固定のv65確認が未完なら合わせて確認する。
5. v88の直線弾で予兆・回避・命中時HP減算を実機確認する。
6. その後、敵AI・被弾・撃破・Wave進行へ拡張する。"""
new_phase = """## 次フェーズ: リカバリー10実HP回復

v82〜v85で左上HP表示とココロウィンドウ、v86で初期HP100、v87で共通被ダメージ経路、v88でテスト敵の直線単発弾まで接続し、実機で予兆・回避・命中時HP減算に問題がないことを確認済み。v89のキャノン非貫通も実機確認済み。次は既存チップ「リカバリー10」をプレイヤーHPへ接続し、使用時に最大HPを超えない範囲で10回復する処理へ進む。

優先対象は以下。

1. リカバリー10を `BattleNetworkPlayerHealth` へ接続し、実HPを10回復する。
2. 回復時に左上HUDへ即時反映されることを確認する。
3. 最大HP100を超えて回復しないことを確認する。
4. HP満タン時のリカバリー10使用可否・消費仕様は既存仕様を確認してから確定する。
5. その後、被弾演出・無敵時間・ノックバック・撃破処理へ拡張する。
6. 敵AI・Wave進行へ段階的に進める。"""
if old_phase not in text:
    raise SystemExit('next phase marker not found')
text = text.replace(old_phase, new_phase, 1)

status_path.write_text(text, encoding='utf-8')

Path('.github/workflows/apply-v89-verification.yml').unlink(missing_ok=True)
Path('tools/apply_v89_verification.py').unlink(missing_ok=True)
