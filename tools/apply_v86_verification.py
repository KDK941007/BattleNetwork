from pathlib import Path
p=Path('DEVELOPMENT_STATUS.md')
s=p.read_text(encoding='utf-8')
old="v86でプレイヤー初期最大HPを `100` に正式決定し、`player-health.js` の初期stateを `maxHp=100 / hp=100` で開始するよう変更した。既存の購読API経由で左上HUDはロード時から残HP `100` を表示する。`configureHealth()` / `clearHealth()` / `applyDamage()` の既存API仕様は変更していない。敵攻撃からの被ダメージ、撃破、リカバリー10の実回復、IndexedDB保存は後続フェーズとする。"
new=old+" 実機確認で左上HUDが `100` 表示になっていることを確認済み。"
if new not in s:
    if old not in s:
        raise SystemExit('v86 status text not found')
    s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
