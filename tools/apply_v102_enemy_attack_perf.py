from pathlib import Path

root = Path('.')

layer = r'''(()=>{
  const battle=document.getElementById('battle');
  const scene=document.getElementById('scene');
  const FIELD=window.BattleNetworkField;
  if(!battle||!scene||!FIELD)throw new Error('BattleNetworkEnemyAttackLayer: required dependency is missing.');

  const layer=document.createElement('div');
  layer.id='enemyAttackLayer';
  layer.style.position='absolute';
  layer.style.left='0';
  layer.style.top='0';
  layer.style.width=`${scene.clientWidth}px`;
  layer.style.height=`${scene.clientHeight}px`;
  layer.style.transformOrigin='0 0';
  layer.style.pointerEvents='none';
  layer.style.willChange='transform';
  layer.style.contain='layout paint style';
  layer.style.zIndex='8';
  battle.appendChild(layer);

  const PX=.72,PY=.36,SW=FIELD.WORLD_SIZE*PX*2;
  let lastSceneTransform='';

  function project(x,y){return{x:(x-y)*PX+SW/2,y:(x+y)*PY}}
  function syncTransform(){
    const next=scene.style.transform||'';
    if(next!==lastSceneTransform){layer.style.transform=next;lastSceneTransform=next}
    requestAnimationFrame(syncTransform);
  }
  function refreshSize(){layer.style.width=`${scene.clientWidth}px`;layer.style.height=`${scene.clientHeight}px`}

  function createTelegraph(){
    const el=document.createElement('div');
    el.className='enemyTestTelegraph';
    el.style.cssText='display:none;position:absolute;height:6px;transform-origin:0 50%;background:rgba(255,76,76,.72);border:1px solid rgba(255,230,120,.95);border-radius:4px;box-shadow:0 0 5px rgba(255,70,70,.45);pointer-events:none;will-change:transform;contain:layout paint style;';
    layer.appendChild(el);
    return el;
  }
  function showTelegraph(el,origin,end){
    if(!el||!origin||!end)return;
    const a=project(origin.x,origin.y),b=project(end.x,end.y);
    const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
    el.style.width=`${length}px`;
    el.style.transform=`translate3d(${a.x}px,${a.y-24}px,0) rotate(${angle}deg)`;
    el.style.display='block';
  }
  function hideTelegraph(el){if(el)el.style.display='none'}

  function createProjectile(){
    const el=document.createElement('div');
    el.className='enemyTestProjectile';
    el.style.cssText='display:none;position:absolute;width:28px;height:14px;border-radius:50%;background:#ff4a50;border:2px solid #ffd66d;box-shadow:0 0 8px rgba(255,80,80,.65);pointer-events:none;transform-origin:center;will-change:transform;contain:layout paint style;';
    layer.appendChild(el);
    return el;
  }
  function showProjectile(el,x,y){if(!el)return;el.style.display='block';updateProjectile(el,x,y)}
  function updateProjectile(el,x,y){
    if(!el||!Number.isFinite(x)||!Number.isFinite(y))return;
    const p=project(x,y);
    el.style.transform=`translate3d(${p.x-14}px,${p.y-31}px,0)`;
  }
  function hideProjectile(el){if(el)el.style.display='none'}
  function destroy(el){el?.remove()}

  window.addEventListener('resize',refreshSize,{passive:true});
  requestAnimationFrame(syncTransform);
  window.BattleNetworkEnemyAttackLayer=Object.freeze({createTelegraph,showTelegraph,hideTelegraph,createProjectile,showProjectile,updateProjectile,hideProjectile,destroy,refreshSize});
})();
'''
(root/'js/combat/enemy-attack-layer.js').write_text(layer, encoding='utf-8')

behavior = r'''(()=>{
  const AI=window.BattleNetworkEnemyAI;
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  const PLAYER=window.BattleNetworkPlayer;
  const PLAYER_DAMAGE=window.BattleNetworkPlayerDamage;
  const ATTACK_LAYER=window.BattleNetworkEnemyAttackLayer;
  if(!AI||!FIELD||!ENEMY||!PLAYER||!PLAYER_DAMAGE||!ATTACK_LAYER){
    throw new Error('BattleNetworkEnemyStraightShotBehavior: required dependency is missing.');
  }

  const BEHAVIOR_ID='PROTOTYPE_STRAIGHT_SHOT';
  const DEFAULT_CONFIG=Object.freeze({
    testOnly:true,
    damage:10,
    telegraphMs:700,
    cooldownMs:2200,
    projectileSpeed:720,
    telegraphDistanceTiles:6,
    maxTravelWorld:FIELD.WORLD_SIZE*1.5
  });

  function positive(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
  function normalize(dx,dy){const len=Math.hypot(dx,dy)||1;return{x:dx/len,y:dy/len}}
  function createController({enemyId,config}){
    const cfg=Object.freeze({
      ...DEFAULT_CONFIG,
      ...config,
      damage:positive(config?.damage,DEFAULT_CONFIG.damage),
      telegraphMs:positive(config?.telegraphMs,DEFAULT_CONFIG.telegraphMs),
      cooldownMs:positive(config?.cooldownMs,DEFAULT_CONFIG.cooldownMs),
      projectileSpeed:positive(config?.projectileSpeed,DEFAULT_CONFIG.projectileSpeed),
      telegraphDistanceTiles:positive(config?.telegraphDistanceTiles,DEFAULT_CONFIG.telegraphDistanceTiles),
      maxTravelWorld:positive(config?.maxTravelWorld,DEFAULT_CONFIG.maxTravelWorld)
    });
    const telegraphEl=ATTACK_LAYER.createTelegraph();
    const projectileEl=ATTACK_LAYER.createProjectile();
    let telegraph=null;
    let projectile=null;
    let nextAttackAt=performance.now();

    function removeTelegraph(){ATTACK_LAYER.hideTelegraph(telegraphEl);telegraph=null}
    function removeProjectile(){ATTACK_LAYER.hideProjectile(projectileEl);projectile=null}
    function scheduleNext(now=performance.now()){nextAttackAt=now+cfg.cooldownMs}
    function canStart(now){const enemy=ENEMY.getEnemy(enemyId);return !!enemy&&!enemy.isDefeated&&!telegraph&&!projectile&&now>=nextAttackAt}
    function start(now){
      if(!canStart(now))return false;
      const enemy=ENEMY.getEnemy(enemyId),playerPos=PLAYER.getPosition();
      if(!enemy)return false;
      const direction=normalize(playerPos.x-enemy.x,playerPos.y-enemy.y);
      const distance=FIELD.toWorldDistance(cfg.telegraphDistanceTiles);
      const origin={x:enemy.x,y:enemy.y};
      const end={x:enemy.x+direction.x*distance,y:enemy.y+direction.y*distance};
      ATTACK_LAYER.showTelegraph(telegraphEl,origin,end);
      telegraph={origin,direction,fireAt:now+cfg.telegraphMs};
      return true;
    }
    function fireTelegraph(){
      if(!telegraph)return;
      const data=telegraph;
      removeTelegraph();
      projectile={x:data.origin.x,y:data.origin.y,dx:data.direction.x,dy:data.direction.y,travel:0};
      ATTACK_LAYER.showProjectile(projectileEl,projectile.x,projectile.y);
    }
    function finish(now){removeProjectile();scheduleNext(now)}
    function updateProjectile(dt,now){
      if(!projectile)return;
      const step=cfg.projectileSpeed*dt;
      projectile.x+=projectile.dx*step;projectile.y+=projectile.dy*step;projectile.travel+=step;
      ATTACK_LAYER.updateProjectile(projectileEl,projectile.x,projectile.y);
      const hit=PLAYER_DAMAGE.resolvePointHit({x:projectile.x,y:projectile.y,damage:cfg.damage,sourceType:'ENEMY',sourceId:enemyId,attackId:BEHAVIOR_ID});
      if(hit.hit){finish(now);return}
      const out=projectile.x<0||projectile.x>FIELD.WORLD_SIZE||projectile.y<0||projectile.y>FIELD.WORLD_SIZE;
      if(out||projectile.travel>=cfg.maxTravelWorld)finish(now);
    }
    function update(now,dt){if(telegraph&&now>=telegraph.fireAt)fireTelegraph();updateProjectile(dt,now)}
    function cancel(now=performance.now()){const busy=!!telegraph||!!projectile;removeTelegraph();removeProjectile();if(busy)scheduleNext(now)}
    function destroy(){removeTelegraph();removeProjectile();ATTACK_LAYER.destroy(telegraphEl);ATTACK_LAYER.destroy(projectileEl)}
    function isBusy(){return !!telegraph||!!projectile}
    function getSnapshot(){return Object.freeze({enemyId,behaviorId:BEHAVIOR_ID,busy:isBusy(),nextAttackAt,config:cfg})}
    return Object.freeze({canStart,start,update,cancel,destroy,isBusy,getSnapshot});
  }

  AI.registerBehavior(BEHAVIOR_ID,createController);
  window.BattleNetworkEnemyStraightShotBehavior=Object.freeze({BEHAVIOR_ID,DEFAULT_CONFIG});
})();
'''
(root/'js/combat/enemy-behavior-straight-shot.js').write_text(behavior, encoding='utf-8')

index = (root/'index.html').read_text(encoding='utf-8')
old = '<script src="./js/combat/player-damage-system.js?v=92"></script>\n<script src="./js/combat/enemy-ai-system.js?v=100"></script>\n<script src="./js/combat/enemy-behavior-straight-shot.js?v=100"></script>'
new = '<script src="./js/combat/player-damage-system.js?v=92"></script>\n<script src="./js/combat/enemy-attack-layer.js?v=102"></script>\n<script src="./js/combat/enemy-ai-system.js?v=101"></script>\n<script src="./js/combat/enemy-behavior-straight-shot.js?v=102"></script>'
if old not in index:
    raise SystemExit('index script block not found')
(root/'index.html').write_text(index.replace(old,new,1), encoding='utf-8')

sw_path=root/'sw.js'
sw=sw_path.read_text(encoding='utf-8')
sw=sw.replace("const CACHE_NAME = 'battlenetwork-runtime-v101';","const CACHE_NAME = 'battlenetwork-runtime-v102';",1)
needle="  './js/combat/player-damage-system.js',\n"
if "'./js/combat/enemy-attack-layer.js'" not in sw:
    if needle not in sw: raise SystemExit('sw insertion point not found')
    sw=sw.replace(needle,needle+"  './js/combat/enemy-attack-layer.js',\n",1)
sw_path.write_text(sw,encoding='utf-8')

status_path=root/'DEVELOPMENT_STATUS.md'
status=status_path.read_text(encoding='utf-8')
marker='## 次フェーズ: v101 敵AI独立行動 実機確認'
if marker not in status: raise SystemExit('status marker not found')
prefix=status.split(marker,1)[0]
section='''## 次フェーズ: v102 敵攻撃描画負荷 実機確認

v101の敵AI独立行動は実機確認済み。複数敵が互いの攻撃終了を待たず、それぞれ独立して予兆・射撃を開始し、撃破済み敵は新規行動を開始しないことを確認した。この「敵は原則として個体ごとに独立行動する」共通ルールは継続する。

一方、v101実機確認で敵の攻撃予兆が表示される直前に画面が重くなるように見える事象を確認した。直線射撃Behaviorは攻撃ごとに予兆DOM／弾DOMを巨大な `scene` へ追加・削除しており、独立行動化によって複数敵のDOM生成が近いタイミングで発生しやすくなったため、v102では描画経路のみを最適化する。

v102では `js/combat/enemy-attack-layer.js` を追加し、敵の予兆・弾を `scene` 外の専用レイヤーへ分離する。専用レイヤーは `scene.style.transform` を同期し、world→scene座標の見た目は従来と変えない。さらに各敵Behavior生成時に予兆要素と弾要素を一度だけ生成し、攻撃ごとは表示／非表示と transform 更新で再利用する。これにより予兆表示直前のDOM追加・削除をなくす。攻撃力10、予兆0.7秒、クールタイム2.2秒、弾速720、独立行動、Wave停止制御などの検証挙動は変更しない。

実機確認では以下を優先する。

1. 敵2体が独立して攻撃するv101挙動が維持されていること。
2. 予兆線が表示される直前の引っかかり／画面の重さが改善していること。
3. 予兆線の始点・方向・長さと敵弾の表示位置がv101以前からずれていないこと。
4. 複数敵がほぼ同時に予兆・射撃しても描画が大きく重くならないこと。
5. 被弾判定、10ダメージ、2秒無敵、撃破済み敵の新規行動停止が維持されていること。
6. CUSTOM、WAVE CLEAR、WAVE n STARTで予兆／弾が非表示になり、次Waveでも正常に再利用されること。
7. v102でも残る場合は、DOM生成ではなく同時発生時のスタイル計算／発光表現／AI更新側を次の切り分け対象とする。
'''
status_path.write_text(prefix+section,encoding='utf-8')
