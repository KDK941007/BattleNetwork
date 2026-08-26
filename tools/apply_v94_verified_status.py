from pathlib import Path

path = Path('DEVELOPMENT_STATUS.md')
text = path.read_text(encoding='utf-8')
old = 'v94は敵撃破表示・Hit除外・全敵撃破状態の実機確認待ち。'
new = 'v94は実機確認で、敵HP0時のHP表示停止、グレー＋DELETED仮表示、撃破済み敵のHit判定／ターゲット除外まで問題ないことを確認済み。全敵撃破状態APIは複数敵／Wave接続時に改めて実戦確認する。'
if old not in text:
    raise SystemExit('v94 history marker not found')
text = text.replace(old, new, 1)
heading = '## 次フェーズ: v94 敵撃破 実機確認'
idx = text.find(heading)
if idx < 0:
    raise SystemExit('next phase heading not found')
replacement = '''## 次フェーズ: 複数敵とWave進行\n\nv91〜v94までのプレイヤー被弾・プレイヤー撃破・敵撃破の基礎フローは実機確認済み。次はv94で追加した `getBattleState()` / `subscribe()` を起点に、複数敵が存在する1Waveを成立させ、全敵撃破後にWave完了を検知できる最小進行へ接続する。敵種類・出現数・配置・次Waveまでの待機時間などのゲームバランス値はまだ確定していないため、推測で本番値にはしない。\n\n優先対象は以下。\n\n1. 複数敵を同一Waveへ配置できる最小構造を用意する。\n2. 敵ごとのHP・Hit判定・撃破状態が独立して動作することを確認する。\n3. 一部の敵だけを撃破した段階ではWave完了にしない。\n4. `allDefeated` が成立した時だけWave完了を検知する。\n5. Wave完了後の次Wave開始タイミング・表示演出は仮値／仮演出として切り分け、本番仕様は後続で確定する。\n6. 複数敵攻撃を導入した段階で、v91の被弾後無敵による連続被弾防止と無敵中の弾通過を再確認する。\n7. 最小Wave進行の実機確認後、本番敵AI・敵構成・Wave数・ボス接続へ段階的に進む。\n'''
text = text[:idx] + replacement
path.write_text(text, encoding='utf-8')
