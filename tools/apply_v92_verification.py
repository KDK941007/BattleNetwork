from pathlib import Path

path = Path('DEVELOPMENT_STATUS.md')
text = path.read_text(encoding='utf-8')

old_history = "v92で通常被弾時の『のけぞり』を位置ノックバックから分離して実装した。実ダメージが成立してHP0にならなかった場合、`BattleNetworkPlayer.beginHitStun()` を通じて現行調整値 `0.3秒` ののけぞり状態へ入る。のけぞり中は移動と A / B / X / Y 操作を無効化し、Bチャージ中なら即キャンセル、ダッシュ中ならその場で中断する。ダッシュの既存クールタイムは維持する。通常ののけぞりではworld座標を押し戻さず、位置ノックバックは将来必要な攻撃ごとの個別性能として残す。v91の被弾後無敵2秒は独立して同時開始し、0.3秒後には点滅中でも操作へ復帰する。v92はのけぞり時間・操作停止・チャージ／ダッシュ中断・位置非移動の実機確認待ち。"
new_history = "v92で通常被弾時の『のけぞり』を位置ノックバックから分離して実装した。実ダメージが成立してHP0にならなかった場合、`BattleNetworkPlayer.beginHitStun()` を通じて現行調整値 `0.3秒` ののけぞり状態へ入る。のけぞり中は移動と A / B / X / Y 操作を無効化し、Bチャージ中なら即キャンセル、ダッシュ中ならその場で中断する。ダッシュの既存クールタイムは維持する。通常ののけぞりではworld座標を押し戻さず、位置ノックバックは将来必要な攻撃ごとの個別性能として残す。v91の被弾後無敵2秒は独立して同時開始し、0.3秒後には点滅中でも操作へ復帰する。実機確認で、0.3秒の操作停止、A/B/X/Y操作不可、Bチャージ／ダッシュ中断、位置非移動、点滅中の操作復帰まで問題ないことを確認済み。"
if text.count(old_history) != 1:
    raise SystemExit(f'v92 history match count={text.count(old_history)}')
text = text.replace(old_history, new_history, 1)

marker = '## 次フェーズ: v92 のけぞり実機確認\n'
start = text.find(marker)
if start < 0:
    raise SystemExit('next phase marker not found')
new_next = '''## 次フェーズ: HP0時の撃破処理\n\nv91の被弾後無敵・点滅、v92の0.3秒のけぞりまで実機確認済み。次はプレイヤーHPが0へ到達した時の撃破処理を設計する。HP0判定自体は `BattleNetworkPlayerHealth.applyDamage()` の `defeatedNow / isDefeated` で既に取得可能だが、戦闘停止・操作無効化・表示演出・再開方法は未確定のため、推測で固定せず実装前に確定する。\n\n優先対象は以下。\n\n1. HP0到達時に即座に無効化する操作範囲を確定する。\n2. 敵攻撃・CUSTOMゲージ・既存弾など戦闘進行をどこまで停止するか確定する。\n3. 撃破時のプレイヤー表示／演出とHUD表示を確定する。\n4. 撃破後の導線（再戦・ステージ終了・トップへ戻る等）はステージ／Wave設計と整合させて確定する。\n5. 確定後、既存 `defeatedNow / isDefeated` を起点に最小撃破フローを実装する。\n6. 位置ノックバックは必要な攻撃を追加する段階で個別設計する。\n7. 高頻度攻撃・複数敵攻撃の導入時にv91の連続被弾防止と弾通過を再確認し、その後敵AI・Wave進行へ段階的に進める。'''
text = text[:start] + new_next + '\n'
path.write_text(text, encoding='utf-8')
print('v92 verification status applied')
