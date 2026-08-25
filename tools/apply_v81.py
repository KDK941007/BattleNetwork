from pathlib import Path

# index.html
p=Path('index.html')
text=p.read_text()
old='<script src="./js/combat/enemy-foundation.js?v=76"></script>\n<script src="./js/combat/projectile-shadow-renderer.js?v=77"></script>'
new='<script src="./js/combat/enemy-foundation.js?v=76"></script>\n<script src="./js/combat/player-health.js?v=81"></script>\n<script src="./js/combat/projectile-shadow-renderer.js?v=77"></script>'
if old not in text: raise SystemExit('index marker missing')
p.write_text(text.replace(old,new,1))

# sw.js
p=Path('sw.js')
text=p.read_text()
old="const CACHE_NAME = 'battlenetwork-runtime-v80';"
if old not in text: raise SystemExit('sw version marker missing')
text=text.replace(old,"const CACHE_NAME = 'battlenetwork-runtime-v81';",1)
old="  './js/combat/enemy-foundation.js',\n  './js/combat/projectile-shadow-renderer.js',"
new="  './js/combat/enemy-foundation.js',\n  './js/combat/player-health.js',\n  './js/combat/projectile-shadow-renderer.js',"
if old not in text: raise SystemExit('sw asset marker missing')
p.write_text(text.replace(old,new,1))

# DEVELOPMENT_STATUS.md
p=Path('DEVELOPMENT_STATUS.md')
text=p.read_text()
v80="v80でMAX時の点滅表現を復活させた。ただし負荷原因だったゲージ全体への `filter:brightness()` と外側グローは戻さず、満タンの `customFill` のみを `opacity` 1.0 / 0.42 の2段階で点滅させる。`will-change: opacity` はREADY中のfillだけに限定し、READY解除時は通常へ戻す。枠・CUSTOM文字は静的READY色を維持する。ゲージ蓄積時間10秒・MAX時の再CUSTOM操作・位置・サイズは変更していない。v80の点滅状態でも移動・旋回・ロックバスター連打を含めて動作上の問題がないことを実機確認済み。"
v81="v81でプレイヤーHPの最小ランタイム基盤として `js/combat/player-health.js` を追加した。`maxHp / hp / isConfigured / isDefeated` のスナップショットを保持し、`configureHealth()` で最大HP・現在HPを設定、`applyDamage()` でダメージ減算と0到達判定、`clearHealth()` で未設定状態へ戻せる。既存設計では初期最大HPの具体値が未決定のため推測値は設定せず、ロード直後はHP未設定のままとする。敵攻撃との接続、プレイヤーHP表示、撃破処理、リカバリー10の実回復、IndexedDB保存形式は後続フェーズとし、今回の変更では既存戦闘挙動・表示に影響を与えない。v81はリポジトリ確認対象で、実機確認を要する見た目変更はなし。"
if v80 not in text: raise SystemExit('status v80 marker missing')
text=text.replace(v80,v80+'\n'+v81,1)
old='## 次フェーズ: v79実機確認 → プレイヤーHP\n\nv73のダメージ接続は実機確認済み。v76までCPU側の毎フレーム処理を軽量化しても連打時の重さが残ったため、v77では通常 / チャージバスターの床影DOM・移動発光・B押下filter・チャージ中発光・敵hit glow・HP多重shadowを外して描画負荷を切り分ける。まず実機で連打時の負荷を再確認し、問題なければプレイヤーHPへ進む。'
new='## 次フェーズ: プレイヤーHP具体値・表示UI・被ダメージ接続\n\nv80までのロックバスター／CUSTOMゲージ負荷対策は実機確認済み。v81でプレイヤーHPのランタイム基盤を追加したため、次は初期最大HPの具体値、画面上のHP表示方法、敵攻撃からの被ダメージ接続を順に詰める。リカバリー10の実回復はプレイヤーHP仕様確定後に接続する。'
if old not in text: raise SystemExit('status next phase marker missing')
text=text.replace(old,new,1)
p.write_text(text)
