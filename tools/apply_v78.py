from pathlib import Path

# game.js: move B projectiles out of the giant scene into the isolated projectile layer.
p=Path('js/game.js')
text=p.read_text()
old="const FIELD=window.BattleNetworkField,RANGE=window.BattleNetworkRangeGeometry,RANGE_PREVIEW=window.BattleNetworkRangePreview,BOMB_PREVIEW=window.BattleNetworkBombPreview,B_ATTACK=window.BattleNetworkBAttack,P_SHADOW=window.BattleNetworkProjectileShadow,ENEMY=window.BattleNetworkEnemy;"
new="const FIELD=window.BattleNetworkField,RANGE=window.BattleNetworkRangeGeometry,RANGE_PREVIEW=window.BattleNetworkRangePreview,BOMB_PREVIEW=window.BattleNetworkBombPreview,B_ATTACK=window.BattleNetworkBAttack,P_SHADOW=window.BattleNetworkProjectileShadow,B_PROJECTILE=window.BattleNetworkBusterProjectile,ENEMY=window.BattleNetworkEnemy;"
if old not in text: raise SystemExit('game dependency marker missing')
text=text.replace(old,new,1)
old="if(!P_SHADOW)throw new Error('BattleNetwork: projectile shadow system is not loaded.');"
new="if(!P_SHADOW)throw new Error('BattleNetwork: projectile shadow system is not loaded.');\nif(!B_PROJECTILE)throw new Error('BattleNetwork: buster projectile layer is not loaded.');"
if old not in text: raise SystemExit('game dependency guard missing')
text=text.replace(old,new,1)
old="function spawn(kind,range,speed,direction={x:s.dx,y:s.dy},damage=null,attackId=null){range=Number(range);speed=Number(speed);if(!(range>0)||!(speed>0))return;let d={x:direction.x,y:direction.y},l=Math.hypot(d.x,d.y)||1;d.x/=l;d.y/=l;let numericDamage=Number(damage),b={x:s.x,y:s.y,dx:d.x,dy:d.y,dist:0,range,speed,kind,damage:Number.isFinite(numericDamage)?numericDamage:null,attackId,el:document.createElement('div')};b.el.className='bullet '+kind;scene.appendChild(b.el);P_SHADOW.attach(b.el,kind);bullets.push(b)}"
new="function spawn(kind,range,speed,direction={x:s.dx,y:s.dy},damage=null,attackId=null){range=Number(range);speed=Number(speed);if(!(range>0)||!(speed>0))return;let d={x:direction.x,y:direction.y},l=Math.hypot(d.x,d.y)||1;d.x/=l;d.y/=l;let isBuster=kind==='normal'||kind==='charged',el=isBuster?B_PROJECTILE.create(kind):document.createElement('div');if(!el)return;let numericDamage=Number(damage),b={x:s.x,y:s.y,dx:d.x,dy:d.y,dist:0,range,speed,kind,damage:Number.isFinite(numericDamage)?numericDamage:null,attackId,layer:isBuster?'buster':'scene',el};if(!isBuster){b.el.className='bullet '+kind;scene.appendChild(b.el);P_SHADOW.attach(b.el,kind)}bullets.push(b)}"
if old not in text: raise SystemExit('spawn marker missing')
text=text.replace(old,new,1)
old="for(let i=bullets.length-1;i>=0;i--){let b=bullets[i];b.x+=b.dx*b.speed*dt;b.y+=b.dy*b.speed*dt;b.dist+=b.speed*dt;let p=proj(b.x,b.y),a=angle(b.dx,b.dy);b.el.style.transform=`translate(${p.x-9}px,${p.y-34}px) rotate(${a}deg)`;P_SHADOW.update(b.el,p.x,p.y);if(Number.isFinite(b.damage)&&b.damage>0&&hitBusterEnemy(b)){P_SHADOW.detach(b.el);b.el.remove();bullets.splice(i,1);continue}if(b.dist>=b.range){P_SHADOW.detach(b.el);b.el.remove();bullets.splice(i,1)}}let c=camera(),f=1-Math.pow(1-FOLLOW,dt*60);s.cx=lerp(s.cx,c.x,f);s.cy=lerp(s.cy,c.y,f);scene.style.transform=`scale(${CAMERA_ZOOM}) translate(${-s.cx}px,${-s.cy}px)`;"
new="for(let i=bullets.length-1;i>=0;i--){let b=bullets[i];b.x+=b.dx*b.speed*dt;b.y+=b.dy*b.speed*dt;b.dist+=b.speed*dt;let p=proj(b.x,b.y),a=angle(b.dx,b.dy);if(b.layer==='buster')B_PROJECTILE.update(b.el,p.x,p.y,a);else{b.el.style.transform=`translate(${p.x-9}px,${p.y-34}px) rotate(${a}deg)`;P_SHADOW.update(b.el,p.x,p.y)}if(Number.isFinite(b.damage)&&b.damage>0&&hitBusterEnemy(b)){if(b.layer==='buster')B_PROJECTILE.remove(b.el);else{P_SHADOW.detach(b.el);b.el.remove()}bullets.splice(i,1);continue}if(b.dist>=b.range){if(b.layer==='buster')B_PROJECTILE.remove(b.el);else{P_SHADOW.detach(b.el);b.el.remove()}bullets.splice(i,1)}}if(!window.BattleNetworkCameraZoomSettings){let c=camera(),f=1-Math.pow(1-FOLLOW,dt*60);s.cx=lerp(s.cx,c.x,f);s.cy=lerp(s.cy,c.y,f);scene.style.transform=`scale(${CAMERA_ZOOM}) translate(${-s.cx}px,${-s.cy}px)`;}"
if old not in text: raise SystemExit('bullet loop marker missing')
text=text.replace(old,new,1)
p.write_text(text)

# index.html: load isolated projectile layer before game and bump game cache key.
p=Path('index.html')
text=p.read_text()
old='<script src="./js/combat/projectile-shadow-renderer.js?v=77"></script>\n<script src="./js/combat/b-attack-system.js?v=73"></script>\n<script src="./js/game.js?v=76"></script>'
new='<script src="./js/combat/projectile-shadow-renderer.js?v=77"></script>\n<script src="./js/combat/buster-projectile-layer.js?v=78"></script>\n<script src="./js/combat/b-attack-system.js?v=73"></script>\n<script src="./js/game.js?v=78"></script>'
if old not in text: raise SystemExit('index script block missing')
p.write_text(text.replace(old,new,1))

# sw.js: cache the new module and bump runtime cache.
p=Path('sw.js')
text=p.read_text()
old="const CACHE_NAME = 'battlenetwork-runtime-v77';"
if old not in text: raise SystemExit('sw cache marker missing')
text=text.replace(old,"const CACHE_NAME = 'battlenetwork-runtime-v78';",1)
old="  './js/combat/projectile-shadow-renderer.js',\n  './js/combat/b-attack-system.js',"
new="  './js/combat/projectile-shadow-renderer.js',\n  './js/combat/buster-projectile-layer.js',\n  './js/combat/b-attack-system.js',"
if old not in text: raise SystemExit('sw asset marker missing')
text=text.replace(old,new,1)
p.write_text(text)

# DEVELOPMENT_STATUS.md: record the new isolation strategy and current verification state.
p=Path('DEVELOPMENT_STATUS.md')
text=p.read_text()
needle="v77でv76後も実機上のロックバスター連打負荷が大きく残ることを確認し、描画負荷の切り分けを優先した。通常／チャージバスターは床影DOMを一旦持たない構成へ変更し、移動 `box-shadow`、Bボタン押下時の `filter`、チャージ中の発光、敵命中時の `filter + glow`、残HP数字の多重 `text-shadow` をCSS上で無効化した。チャージ完了表示は黒縁・境界線ベースの軽量表現を維持し、キャノン床影は変更していない。攻撃力・連射間隔・弾速・HitBox・HP値は変更していない。v77はロックバスター連打時の実機負荷確認待ち。"
add=needle+"\nv78でv77後もロックバスター連打時の重さがほぼ改善しないことを実機確認したため、Range負荷対策v51と同じ分離方針をB攻撃へ適用した。通常／チャージバスターの移動DOMを5184×2592の巨大 `scene` から外し、`battle` 直下の専用 `busterProjectileLayer` へ分離する。弾のworld座標・弾速・射程・HitBox判定は従来どおり `game.js` が管理し、専用レイヤーは投影後座標の表示だけを担当する。カメラtransformは `scene.style.transform` と同期する。また `camera-zoom-settings.js` が有効な通常実行時は `game.js` 側から同じ `scene.style.transform` を重複更新しないようにし、カメラtransformの二重書き込みも避ける。キャノンは従来どおりscene側を維持する。v78はロックバスター連打時の実機負荷確認待ち。"
if needle not in text: raise SystemExit('status v77 marker missing')
text=text.replace(needle,add,1)
text=text.replace('## 次フェーズ: v77実機確認 → プレイヤーHP','## 次フェーズ: v78実機確認 → プレイヤーHP',1)
old_phase='v73のダメージ接続は実機確認済み。v75の初回負荷対策後もロックバスター連打時の重さが残ったため、v76で弾本体・影・敵Hit判定の毎フレーム経路をさらに軽量化した。v77では描画負荷を重点的に削減した。まず実機で連打時の負荷を再確認し、問題なければプレイヤーHPへ進む。'
new_phase='v73のダメージ接続は実機確認済み。v75〜v77のCPU・影・発光軽量化でもロックバスター連打時の重さが残ったため、v78で通常／チャージバスターの描画を巨大sceneから専用レイヤーへ分離した。まず実機で連打時の負荷を再確認し、問題なければプレイヤーHPへ進む。'
if old_phase in text:text=text.replace(old_phase,new_phase,1)
p.write_text(text)
