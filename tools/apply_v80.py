from pathlib import Path

# style.css: restore a lightweight READY blink using compositor-friendly opacity only.
p=Path('css/style.css')
text=p.read_text()
old=".customGauge.ready{cursor:pointer;animation:none;filter:none;border-color:#e5fbff;background:linear-gradient(180deg,#6856b0,#443477);box-shadow:0 2px 0 rgba(0,0,0,.72),inset 0 0 0 1px #d5f8ff}.customGauge.ready:before{color:#fff3a6}.customGauge.ready .customFill{background:linear-gradient(180deg,#fff 0%,#dcfbff 42%,#b8edff 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.95)}"
new=".customGauge.ready{cursor:pointer;animation:none;filter:none;border-color:#e5fbff;background:linear-gradient(180deg,#6856b0,#443477);box-shadow:0 2px 0 rgba(0,0,0,.72),inset 0 0 0 1px #d5f8ff}.customGauge.ready:before{color:#fff3a6}.customGauge.ready .customFill{background:linear-gradient(180deg,#fff 0%,#dcfbff 42%,#b8edff 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.95);animation:customReadyOpacityBlink .72s step-end infinite;will-change:opacity}.customGauge:not(.ready) .customFill{will-change:auto}@keyframes customReadyOpacityBlink{0%,49%{opacity:1}50%,100%{opacity:.42}}"
if old not in text: raise SystemExit('style ready marker missing')
p.write_text(text.replace(old,new,1))

# index.html: cache-bust style.css.
p=Path('index.html')
text=p.read_text()
old='<link rel="stylesheet" href="./css/style.css?v=79">'
new='<link rel="stylesheet" href="./css/style.css?v=80">'
if old not in text: raise SystemExit('index style version marker missing')
p.write_text(text.replace(old,new,1))

# sw.js: bump runtime cache.
p=Path('sw.js')
text=p.read_text()
old="const CACHE_NAME = 'battlenetwork-runtime-v79';"
if old not in text: raise SystemExit('sw cache marker missing')
p.write_text(text.replace(old,"const CACHE_NAME = 'battlenetwork-runtime-v80';",1))

# DEVELOPMENT_STATUS.md: mark v79 improvement confirmed and document v80 blink strategy.
p=Path('DEVELOPMENT_STATUS.md')
text=p.read_text()
old="v79でCUSTOMゲージMAX到達時にも画面が重く見える実機指摘を受け、MAX状態だけで無限実行されていた `customReadyBlink` の `filter:brightness()` アニメーションを廃止した。MAX到達後はゲージ幅更新自体が停止しているため、状態更新ロジックは変更せず、明るい枠色・ゲージ色・CUSTOM文字色による静的なREADY表示へ置き換えた。外側グローも使用しない。ゲージ蓄積時間10秒・MAX時の再CUSTOM操作・表示位置とサイズは変更していない。v79はCUSTOMゲージMAX後の実機負荷確認待ち。"
new=old.replace('v79はCUSTOMゲージMAX後の実機負荷確認待ち。','v79の静的READY表示によりCUSTOMゲージMAX後の重さが改善したことを実機確認済み。')
new += "\nv80でMAX時の点滅表現を復活させる。ただし負荷原因だったゲージ全体への `filter:brightness()` と外側グローは戻さず、満タンの `customFill` のみを `opacity` 1.0 / 0.42 の2段階で点滅させる。`will-change: opacity` はREADY中のfillだけに限定し、READY解除時は通常へ戻す。枠・CUSTOM文字は静的READY色を維持する。ゲージ蓄積時間10秒・MAX時の再CUSTOM操作・位置・サイズは変更しない。v80は点滅時の実機負荷確認待ち。"
if old not in text: raise SystemExit('status v79 marker missing')
p.write_text(text.replace(old,new,1))
