from pathlib import Path

path = Path('GAME_DESIGN.md')
text = path.read_text(encoding='utf-8')
old = "- 知覚開始距離と知覚解除距離を同一にするか、境界付近での状態切替を防ぐため解除距離を別に持つかは後続設計で確定する。"
new = "\n".join([
    "- 知覚開始距離と知覚解除距離は別パラメータとして敵タイプごとに設定する。",
    "- 原則として `知覚解除距離 > 知覚開始距離` とし、境界付近で `知覚 → 解除 → 再知覚` が短時間に繰り返されることを防ぐヒステリシスを設ける。",
    "- 未知覚状態ではプレイヤーが知覚開始距離以内へ入った時点で知覚状態へ移行し、知覚中はプレイヤーが知覚解除距離より外へ出るまで知覚状態を維持する。",
    "- 知覚開始距離・知覚解除距離の具体値は敵タイプごとに個別設定し、全敵共通の固定値にはしない。"
])
if old not in text:
    raise SystemExit('target sentence not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
