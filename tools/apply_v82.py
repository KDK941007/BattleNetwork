from pathlib import Path

# index.html
p=Path('index.html')
text=p.read_text()
old='<link rel="stylesheet" href="./css/font.css">\n<link rel="stylesheet" href="./css/field-grid.css?v=39">'
new='<link rel="stylesheet" href="./css/font.css">\n<link rel="stylesheet" href="./css/player-hud.css?v=82">\n<link rel="stylesheet" href="./css/field-grid.css?v=39">'
if old not in text: raise SystemExit('index css marker missing')
text=text.replace(old,new,1)
old='<script src="./js/combat/player-health.js?v=81"></script>\n<script src="./js/combat/projectile-shadow-renderer.js?v=77"></script>'
new='<script src="./js/combat/player-health.js?v=82"></script>\n<script src="./js/ui/player-hud.js?v=82"></script>\n<script src="./js/combat/projectile-shadow-renderer.js?v=77"></script>'
if old not in text: raise SystemExit('index script marker missing')
text=text.replace(old,new,1)
old='  <section class="battle" id="battle">\n    <div class="scene" id="scene">'
new='  <section class="battle" id="battle">\n    <div class="playerStatusHud" id="playerStatusHud" aria-label="プレイヤーステータス">\n      <div class="playerHpWindow unconfigured" id="playerHpWindow"><span class="playerHpValue" id="playerHpValue">---</span></div>\n      <div class="kokoroWindow" id="kokoroWindow" data-state="NORMAL" aria-label="ココロウィンドウ"><div class="kokoroPortrait" aria-hidden="true"></div><div class="kokoroStateMark" aria-hidden="true"></div></div>\n    </div>\n    <div class="scene" id="scene">'
if old not in text: raise SystemExit('index battle marker missing')
text=text.replace(old,new,1)
p.write_text(text)

# sw.js
p=Path('sw.js')
text=p.read_text()
old="const CACHE_NAME = 'battlenetwork-runtime-v81';"
if old not in text: raise SystemExit('sw version marker missing')
text=text.replace(old,"const CACHE_NAME = 'battlenetwork-runtime-v82';",1)
old="  './css/font.css',\n  './css/field-grid.css',"
new="  './css/font.css',\n  './css/player-hud.css',\n  './css/field-grid.css',"
if old not in text: raise SystemExit('sw css marker missing')
text=text.replace(old,new,1)
old="  './js/combat/player-health.js',\n  './js/combat/projectile-shadow-renderer.js',"
new="  './js/combat/player-health.js',\n  './js/ui/player-hud.js',\n  './js/combat/projectile-shadow-renderer.js',"
if old not in text: raise SystemExit('sw js marker missing')
text=text.replace(old,new,1)
p.write_text(text)

# GAME_DESIGN.md
p=Path('GAME_DESIGN.md')
text=p.read_text()
marker='実際のボタン配置、大きさについてはプロトタイプの操作性を確認しながら調整する。\n\n---\n\n## 5. B攻撃'
insert='''実際のボタン配置、大きさについてはプロトタイプの操作性を確認しながら調整する。\n\n### プレイヤーHUD\n\n- プレイヤーHPは戦闘画面の左上へ固定表示する。\n- HP表示は最大HP併記ではなく残HPの数値を主表示とし、太い白数字＋濃色縁の原作バトルHUD寄りの可読性を基準とする。\n- HPウィンドウの直下にココロウィンドウを配置する。\n- ココロウィンドウはプレイヤーのココロ状態を表示する共通枠とし、通常状態を `NORMAL` として扱える基盤を用意する。具体的な状態種類・遷移条件・戦闘効果は後続設計で確定する。\n- 既存作品のキャラクター画像は流用せず、本作オリジナルのフェイス表現を使用する。\n- プレイヤー初期最大HPの具体値は別途確定し、未確定の間は推測値を正式仕様にしない。\n\n---\n\n## 5. B攻撃'''
if marker not in text: raise SystemExit('game design marker missing')
text=text.replace(marker,insert,1)
p.write_text(text)

# DEVELOPMENT_STATUS.md
p=Path('DEVELOPMENT_STATUS.md')
text=p.read_text()
v81="v81でプレイヤーHPの最小ランタイム基盤として `js/combat/player-health.js` を追加した。`maxHp / hp / isConfigured / isDefeated` のスナップショットを保持し、`configureHealth()` で最大HP・現在HPを設定、`applyDamage()` でダメージ減算と0到達判定、`clearHealth()` で未設定状態へ戻せる。既存設計では初期最大HPの具体値が未決定のため推測値は設定せず、ロード直後はHP未設定のままとする。敵攻撃との接続、プレイヤーHP表示、撃破処理、リカバリー10の実回復、IndexedDB保存形式は後続フェーズとし、今回の変更では既存戦闘挙動・表示に影響を与えない。v81はリポジトリ確認対象で、実機確認を要する見た目変更はなし。"
v82="v82で原作バトル画面を参考にしたプレイヤーHUD基盤を追加した。戦闘画面左上に残HP用ウィンドウ、その直下にココロウィンドウを固定配置する。HP数字は既存 `Orbitron` 系をベースに横幅圧縮・白太字・濃色太縁・詰めた字間で原作寄りの可読性へ調整する。ココロウィンドウは既存作品のキャラクター画像を流用せず、オリジナルの通常状態フェイスと `NORMAL` 状態を示す最小基盤とする。`player-health.js` には購読API `subscribe()` を追加し、将来の被ダメージ／回復時にHUDがイベント駆動で更新できる。初期最大HPは未確定のため推測値を設定せず、未設定時のHUDは `---` を表示する。ココロ状態の種類・遷移・戦闘効果は後続フェーズ。v82は左上HUDの位置・サイズ・フォント・ココロウィンドウ見た目の実機確認待ち。"
if v81 not in text: raise SystemExit('status v81 marker missing')
text=text.replace(v81,v81+'\n'+v82,1)
old='## 次フェーズ: プレイヤーHP具体値・表示UI・被ダメージ接続\n\nv80までのロックバスター／CUSTOMゲージ負荷対策は実機確認済み。v81でプレイヤーHPのランタイム基盤を追加したため、次は初期最大HPの具体値、画面上のHP表示方法、敵攻撃からの被ダメージ接続を順に詰める。リカバリー10の実回復はプレイヤーHP仕様確定後に接続する。'
new='## 次フェーズ: v82 HUD実機確認 → プレイヤーHP具体値・被ダメージ接続\n\nv82で左上HP表示とココロウィンドウの表示基盤を追加した。まず実機で位置・サイズ・フォント・ココロウィンドウの見た目を確認し、問題なければプレイヤー初期最大HPの具体値を確定したうえで敵攻撃からの被ダメージへ接続する。リカバリー10の実回復はプレイヤーHP仕様確定後に接続する。'
if old not in text: raise SystemExit('status next phase marker missing')
text=text.replace(old,new,1)
p.write_text(text)
