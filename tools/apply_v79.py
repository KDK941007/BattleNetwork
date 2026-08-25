from pathlib import Path

# CUSTOM gauge: remove infinite filter repaint at MAX while keeping a clear static ready state.
p=Path('css/style.css')
text=p.read_text()
old=".customGauge.ready{cursor:pointer;animation:customReadyBlink .55s steps(2,end) infinite}.customGauge.ready .customFill{box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 0 11px rgba(211,250,255,.95)}\n@keyframes customReadyBlink{0%,45%{filter:brightness(1)}50%,100%{filter:brightness(1.85)}}"
new=".customGauge.ready{cursor:pointer;animation:none;filter:none;border-color:#e5fbff;background:linear-gradient(180deg,#6856b0,#443477);box-shadow:0 2px 0 rgba(0,0,0,.72),inset 0 0 0 1px #d5f8ff}.customGauge.ready:before{color:#fff3a6}.customGauge.ready .customFill{background:linear-gradient(180deg,#fff 0%,#dcfbff 42%,#b8edff 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.95)}"
if old not in text: raise SystemExit('custom ready CSS marker missing')
p.write_text(text.replace(old,new,1))

# Cache-bust style.css.
p=Path('index.html')
text=p.read_text()
old='<link rel="stylesheet" href="./css/style.css">'
new='<link rel="stylesheet" href="./css/style.css?v=79">'
if old not in text: raise SystemExit('style link marker missing')
p.write_text(text.replace(old,new,1))

# Service Worker cache version.
p=Path('sw.js')
text=p.read_text()
old="const CACHE_NAME = 'battlenetwork-runtime-v78';"
if old not in text: raise SystemExit('sw v78 marker missing')
p.write_text(text.replace(old,"const CACHE_NAME = 'battlenetwork-runtime-v79';",1))

# Development status.
p=Path('DEVELOPMENT_STATUS.md')
text=p.read_text()
needle="v78でv77後もロックバスター連打時の重さがほぼ改善しないことを実機確認したため、Range負荷対策v51と同じ分離方針をB攻撃へ適用した。通常／チャージバスターの移動DOMを5184×2592の巨大 `scene` から外し、`battle` 直下の専用 `busterProjectileLayer` へ分離する。弾のworld座標・弾速・射程・HitBox判定は従来どおり `game.js` が管理し、専用レイヤーは投影後座標の表示だけを担当する。カメラtransformは `scene.style.transform` と同期する。また `camera-zoom-settings.js` が有効な通常実行時は `game.js` 側から同じ `scene.style.transform` を重複更新しないようにし、カメラtransformの二重書き込みも避ける。キャノンは従来どおりscene側を維持する。v78はロックバスター連打時の実機負荷確認待ち。"
replacement=needle.replace('v78はロックバスター連打時の実機負荷確認待ち。','v78の専用レイヤー分離により、ロックバスター連打時の重さが改善したことを実機確認済み。')
addition=replacement+"\nv79でCUSTOMゲージMAX到達時にも画面が重く見える実機指摘を受け、MAX状態だけで無限実行されていた `customReadyBlink` の `filter:brightness()` アニメーションを廃止した。MAX到達後はゲージ幅更新自体が停止しているため、状態更新ロジックは変更せず、明るい枠色・ゲージ色・CUSTOM文字色による静的なREADY表示へ置き換えた。外側グローも使用しない。ゲージ蓄積時間10秒・MAX時の再CUSTOM操作・表示位置とサイズは変更していない。v79はCUSTOMゲージMAX後の実機負荷確認待ち。"
if needle not in text: raise SystemExit('v78 status marker missing')
text=text.replace(needle,addition,1)
text=text.replace('## 次フェーズ: v78実機確認 → プレイヤーHP','## 次フェーズ: v79実機確認 → プレイヤーHP',1)
old_phase='v73のダメージ接続は実機確認済み。v75〜v77のCPU・影・発光軽量化でもロックバスター連打時の重さが残ったため、v78で通常／チャージバスターの描画を巨大sceneから専用レイヤーへ分離した。まず実機で連打時の負荷を再確認し、問題なければプレイヤーHPへ進む。'
new_phase='v78の専用レイヤー分離でロックバスター連打時の負荷改善を実機確認済み。続いてCUSTOMゲージMAX時の無限filterアニメーションをv79で静的READY表示へ置き換えた。まずMAX到達後の負荷を実機確認し、問題なければプレイヤーHPへ進む。'
if old_phase in text:text=text.replace(old_phase,new_phase,1)
p.write_text(text)
