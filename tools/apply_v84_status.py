from pathlib import Path

p = Path('DEVELOPMENT_STATUS.md')
text = p.read_text()

text = text.replace('最終更新: 2026-08-25', '最終更新: 2026-08-26', 1)

v83 = "v83でv82 HUDの実機確認結果を受け、左上HUDが大きすぎてCUSTOMゲージ左端と干渉していたレイアウトを修正した。HP／ココロウィンドウの幅を最大150pxから最大104pxへ縮小し、高さ・枠線・HP数字・ココロ状態文字・内部フェイスも同じ比率感で小型化した。左上固定方針、原作寄せの白太字＋濃色縁フォント、HP未設定時の `---`、ココロ `NORMAL` 基盤は変更していない。CUSTOMゲージ本体の位置・サイズ・挙動にも変更はない。v83はHUDサイズとCUSTOMゲージ非干渉の実機確認待ち。"
v84 = "v84でv83実機確認後もCUSTOMゲージ左端との干渉が残っていたため、HUD側だけを再調整した。HP／ココロウィンドウ幅は最大104pxから最大88pxへ縮小し、HUD左位置を6pxから4pxへ詰めた。高さ・HP数字・ココロ状態文字も比率を保って一段階縮小する。CUSTOMゲージの位置・サイズ・挙動、HP基盤、ココロ状態基盤は変更していない。v84はCUSTOMゲージとの非干渉と視認性の実機確認待ち。"
if v83 not in text:
    raise SystemExit('v83 marker missing')
text = text.replace(v83, v83 + '\n' + v84, 1)

old_head = '## 次フェーズ: v83 HUD実機確認 → プレイヤーHP具体値・被ダメージ接続'
new_head = '## 次フェーズ: v84 HUD実機確認 → プレイヤーHP具体値・被ダメージ接続'
if old_head not in text:
    raise SystemExit('next phase heading missing')
text = text.replace(old_head, new_head, 1)

old_body = 'v82で左上HP表示とココロウィンドウの表示基盤を追加したが、実機ではHUDが大きくCUSTOMゲージ左端と干渉することを確認した。v83でHUD全体を小型化したため、まず実機でCUSTOMゲージと重ならないこと、HP数字とココロウィンドウの視認性を確認する。問題なければプレイヤー初期最大HPの具体値を確定したうえで敵攻撃からの被ダメージへ接続する。リカバリー10の実回復はプレイヤーHP仕様確定後に接続する。'
new_body = 'v82で左上HP表示とココロウィンドウの表示基盤を追加した。v83で小型化した後も実機ではCUSTOMゲージ左端との干渉が残ったため、v84でHUD最大幅を88pxへ縮小し左位置も詰めた。まず実機でCUSTOMゲージと完全に重ならないこと、HP数字とココロウィンドウの視認性を確認する。問題なければプレイヤー初期最大HPの具体値を確定したうえで敵攻撃からの被ダメージへ接続する。リカバリー10の実回復はプレイヤーHP仕様確定後に接続する。'
if old_body not in text:
    raise SystemExit('next phase body missing')
text = text.replace(old_body, new_body, 1)

p.write_text(text)
