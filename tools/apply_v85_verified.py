from pathlib import Path

p=Path('DEVELOPMENT_STATUS.md')
text=p.read_text()

v84="v84でv83実機確認後もCUSTOMゲージ左端との干渉が残っていたため、HUD側だけを再調整した。HP／ココロウィンドウ幅は最大104pxから最大88pxへ縮小し、HUD左位置を6pxから4pxへ詰めた。高さ・HP数字・ココロ状態文字も比率を保って一段階縮小する。CUSTOMゲージの位置・サイズ・挙動、HP基盤、ココロ状態基盤は変更していない。v84はCUSTOMゲージとの非干渉と視認性の実機確認待ち。"
v85="v85でv84のサイズ感を維持したまま、プレイヤーHUD上端をCUSTOMゲージと同じ `top:4px` へ揃えた。HP／ココロウィンドウのサイズ・横位置・表示内容、CUSTOMゲージ本体の位置・サイズ・挙動は変更していない。実機確認でHUDのサイズ感と高さ位置に問題がないことを確認済み。"
if v84 not in text:
    raise SystemExit('v84 marker not found')
if v85 not in text:
    text=text.replace(v84, v84+'\n'+v85, 1)

old_header='## 次フェーズ: v85 HUD実機確認 → プレイヤーHP具体値・被ダメージ接続'
new_header='## 次フェーズ: プレイヤーHP具体値 → 被ダメージ接続'
if old_header in text:
    text=text.replace(old_header,new_header,1)

old_para='v82で左上HP表示とココロウィンドウの表示基盤を追加した。v83で小型化した後も実機ではCUSTOMゲージ左端との干渉が残ったため、v84でHUD最大幅を88pxへ縮小し左位置も詰めた。まず実機でCUSTOMゲージと完全に重ならないこと、HP数字とココロウィンドウの視認性を確認する。問題なければプレイヤー初期最大HPの具体値を確定したうえで敵攻撃からの被ダメージへ接続する。リカバリー10の実回復はプレイヤーHP仕様確定後に接続する。'
new_para='v82〜v85で左上HP表示とココロウィンドウの表示基盤、サイズ、CUSTOMゲージとの非干渉、高さ位置まで実機確認済み。次はプレイヤー初期最大HPの具体値を確定し、HUDへ実値を表示できる状態へ進める。その後、敵攻撃からの被ダメージへ接続する。リカバリー10の実回復はプレイヤーHP仕様確定後に接続する。'
if old_para not in text:
    raise SystemExit('next phase paragraph not found')
text=text.replace(old_para,new_para,1)

p.write_text(text)
