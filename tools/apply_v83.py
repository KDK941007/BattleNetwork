from pathlib import Path

# index.html: bump only player HUD stylesheet cache key.
p=Path('index.html')
text=p.read_text()
old='<link rel="stylesheet" href="./css/player-hud.css?v=82">'
new='<link rel="stylesheet" href="./css/player-hud.css?v=83">'
if old not in text:
    raise SystemExit('index player-hud cache marker missing')
p.write_text(text.replace(old,new,1))

# sw.js: force refresh of the resized HUD CSS.
p=Path('sw.js')
text=p.read_text()
old="const CACHE_NAME = 'battlenetwork-runtime-v82';"
if old not in text:
    raise SystemExit('sw v82 cache marker missing')
p.write_text(text.replace(old,"const CACHE_NAME = 'battlenetwork-runtime-v83';",1))

# DEVELOPMENT_STATUS.md: preserve v82 as rejected size/layout comparison and record v83.
p=Path('DEVELOPMENT_STATUS.md')
text=p.read_text()
lines=text.splitlines()
v83='v83でv82 HUDの実機確認結果を受け、左上HUDが大きすぎてCUSTOMゲージ左端と干渉していたレイアウトを修正した。HP／ココロウィンドウの幅を最大150pxから最大104pxへ縮小し、高さ・枠線・HP数字・ココロ状態文字・内部フェイスも同じ比率感で小型化した。左上固定方針、原作寄せの白太字＋濃色縁フォント、HP未設定時の `---`、ココロ `NORMAL` 基盤は変更していない。CUSTOMゲージ本体の位置・サイズ・挙動にも変更はない。v83はHUDサイズとCUSTOMゲージ非干渉の実機確認待ち。'
if not any(line.startswith('v83でv82 HUD') for line in lines):
    for i,line in enumerate(lines):
        if line.startswith('v82で原作バトル画面'):
            lines.insert(i+1,v83)
            break
    else:
        raise SystemExit('v82 status line missing')
text='\n'.join(lines)+'\n'
old_heading='## 次フェーズ: v82 HUD実機確認 → プレイヤーHP具体値・被ダメージ接続'
new_heading='## 次フェーズ: v83 HUD実機確認 → プレイヤーHP具体値・被ダメージ接続'
if old_heading not in text:
    raise SystemExit('next phase heading missing')
text=text.replace(old_heading,new_heading,1)
old_para='v82で左上HP表示とココロウィンドウの表示基盤を追加した。まず実機で位置・サイズ・フォント・ココロウィンドウの見た目を確認し、問題なければプレイヤー初期最大HPの具体値を確定したうえで敵攻撃からの被ダメージへ接続する。リカバリー10の実回復はプレイヤーHP仕様確定後に接続する。'
new_para='v82で左上HP表示とココロウィンドウの表示基盤を追加したが、実機ではHUDが大きくCUSTOMゲージ左端と干渉することを確認した。v83でHUD全体を小型化したため、まず実機でCUSTOMゲージと重ならないこと、HP数字とココロウィンドウの視認性を確認する。問題なければプレイヤー初期最大HPの具体値を確定したうえで敵攻撃からの被ダメージへ接続する。リカバリー10の実回復はプレイヤーHP仕様確定後に接続する。'
if old_para not in text:
    raise SystemExit('next phase paragraph missing')
text=text.replace(old_para,new_para,1)
p.write_text(text)
