from pathlib import Path

path = Path('DEVELOPMENT_STATUS.md')
text = path.read_text(encoding='utf-8')

old_history = "v93ではHP0到達時の最小撃破フローを実装し、戦闘操作・CUSTOM進行・敵テスト攻撃を停止する。`DELETED` 表示とプレイヤー薄表示は仮演出であり、本番イラスト／演出としては確定しない。"
new_history = "v93ではHP0到達時の最小撃破フローを実装し、戦闘操作・CUSTOM進行・敵テスト攻撃を停止する。`DELETED` 表示とプレイヤー薄表示は仮演出であり、本番イラスト／演出としては確定しない。実機確認で、HP0到達後のHUD 0表示、移動・A/B/X/Y停止、CUSTOM停止、敵攻撃停止、既存プレイヤー弾・Range消去、仮の`DELETED`表示まで問題なし。"
if text.count(old_history) != 1:
    raise SystemExit(f'v93 history marker count={text.count(old_history)}')
text = text.replace(old_history, new_history, 1)

start = text.find('## 次フェーズ: v93 プレイヤー撃破 実機確認')
if start < 0:
    raise SystemExit('next phase heading not found')
new_next = '''## 次フェーズ: 敵HP0時の撃破処理\n\nv91の被弾後無敵・点滅、v92の0.3秒のけぞり、v93のプレイヤーHP0撃破フローまで実機確認済み。敵側は `BattleNetworkEnemy.applyDamage()` で `defeatedNow`、snapshotで `isDefeated` を既に取得できるため、次はこのHP0判定を起点に敵撃破処理を成立させる。Wave進行は敵撃破完了を前提とするため、敵撃破処理を先に完成させ、その後Wave進行へ接続する。\n\n優先対象は以下。\n\n1. 敵HPが `0` に到達した時点で撃破状態へ移行する。\n2. 撃破した敵を新規攻撃・Hit判定・ターゲット取得の対象から除外する。\n3. 撃破時の敵表示／HP表示を停止し、仮の撃破演出を用意する。本番イラスト・アニメーションは後から差し替え可能とする。\n4. 既に発射済みの敵固有攻撃を撃破時にどう扱うかは攻撃Behaviorと整合させて確定する。\n5. 敵撃破完了をWave進行側から参照できる共通状態／通知方法を整理する。\n6. 敵撃破処理の実機確認後、複数敵とWave進行へ接続する。\n7. プレイヤー撃破後の再戦／終了導線はWave・ステージ進行設計と同時に確定する。'''
text = text[:start].rstrip() + '\n\n' + new_next + '\n'
path.write_text(text, encoding='utf-8')
print('v93 verification status applied')
