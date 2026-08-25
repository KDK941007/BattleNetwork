from pathlib import Path

p=Path('index.html')
text=p.read_text()
text=text.replace('./css/player-hud.css?v=84','./css/player-hud.css?v=85',1)
p.write_text(text)

p=Path('sw.js')
text=p.read_text()
text=text.replace("const CACHE_NAME = 'battlenetwork-runtime-v84';","const CACHE_NAME = 'battlenetwork-runtime-v85';",1)
p.write_text(text)

p=Path('DEVELOPMENT_STATUS.md')
text=p.read_text()
needle='v84でv83でもCUSTOMゲージ左端との干渉が残った実機確認結果を受け、HUDの最大幅を104pxから88pxへさらに縮小し、左位置を6pxから4pxへ詰めた。HP／ココロウィンドウの高さ・HP数字・ココロ状態文字も比率を保って小型化した。CUSTOMゲージ本体は変更していない。v84はHUDサイズとCUSTOMゲージ非干渉の実機確認待ち。'
if needle in text:
    text=text.replace(needle,needle+'\nv85でv84のサイズ感が良好と実機確認されたため、サイズは変更せず、HUD上端を `top:4px` へ変更してCUSTOMゲージの `top:4px` と同じ高さへ揃えた。小画面向けmedia query側も `top:4px` に統一した。CUSTOMゲージの位置・サイズ・挙動は変更していない。v85は高さ位置の実機確認待ち。',1)
text=text.replace('## 次フェーズ: v84 HUD実機確認 → プレイヤーHP具体値・被ダメージ接続','## 次フェーズ: v85 HUD実機確認 → プレイヤーHP具体値・被ダメージ接続',1)
text=text.replace('v83でHUD全体を小型化したため、まず実機でCUSTOMゲージと重ならないこと、HP数字とココロウィンドウの視認性を確認する。','v84でHUDサイズ感は良好と実機確認され、v85でHUD上端をCUSTOMゲージと同じ高さへ揃えたため、まず実機で高さ位置を確認する。',1)
p.write_text(text)
