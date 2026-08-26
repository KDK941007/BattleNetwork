from pathlib import Path
import re
import subprocess
import sys

p = Path('tools/apply_v95_wave.py')
text = p.read_text(encoding='utf-8')
actual = "v94で敵HP0時の共通撃破処理を追加した。`enemy-foundation.js` はHP0の敵を点Hit判定・Range Hit判定・ターゲット取得から除外し、HP表示を停止する。表示は本体をグレー化し `DELETED` を重ねる仮表現とし、本番イラスト／アニメーションへ後から差し替える。Wave接続用として `getActiveEnemies()`、`getBattleState()`（total / active / defeated / allDefeated）、`subscribe()` を追加した。撃破前に発射・発動済みの敵攻撃を消すか継続するかはBehavior側の未確定事項のため、v94では既存挙動を変更しない。v94は実機確認で、敵HP0時のHP表示停止、グレー＋DELETED仮表示、撃破済み敵のHit判定／ターゲット除外まで問題ないことを確認済み。全敵撃破状態APIは複数敵／Wave接続時に改めて実戦確認する。"
replacement = 'old_v94 = ' + repr(actual)
text, count = re.subn(r'^old_v94 = .+$', replacement, text, count=1, flags=re.MULTILINE)
if count != 1:
    raise SystemExit('old_v94 assignment not found')
p.write_text(text, encoding='utf-8')
subprocess.run([sys.executable, 'tools/apply_v95_wave.py'], check=True)
