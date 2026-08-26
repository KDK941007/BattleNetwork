from pathlib import Path

root = Path('.')

ai = r'''(()=>{
  const ENEMY=window.BattleNetworkEnemy;
  const HEALTH=window.BattleNetworkPlayerHealth;
  if(!ENEMY)throw new Error('BattleNetworkEnemyAI: enemy foundation is not loaded.');
  if(!HEALTH)throw new Error('BattleNetworkEnemyAI: player health is not loaded.');

  const registry=new Map();
  const assignments=new Map();
  const pauseReasons=new Set(['WAVE_TRANSITION']);
  const customModal=document.getElementById('customModal');
  const settingsModal=document.getElementById('settingsModal');
  const chipDetailModal=document.getElementById('chipDetailModal');
  const editTopBar=document.getElementById('editTopBar');

  let running=true;
  let lastFrame=performance.now();

  function normalizeId(value){return String(value||'').trim()}
  function normalizeChannel(value){return (normalizeId(value)||'ATTACK').toUpperCase()}
  function assignmentKey(enemyId,channel){return `${enemyId}:${channel}`}
  function uiPaused(){
    return customModal?.classList.contains('open')||settingsModal?.classList.contains('open')||chipDetailModal?.classList.contains('open')||editTopBar?.classList.contains('open');
  }
  function isSystemPaused(){return pauseReasons.size>0||uiPaused()||HEALTH.getSnapshot().isDefeated}
  function call(controller,method,...args){
    try{return typeof controller?.[method]==='function'?controller[method](...args):undefined}
    catch(error){console.error(`BattleNetworkEnemyAI controller ${method} failed.`,error);return undefined}
  }
  function isBusy(assignment){return call(assignment?.controller,'isBusy')===true}
  function cancelAssignment(assignment,now=performance.now()){
    if(!assignment||!isBusy(assignment))return false;
    call(assignment.controller,'cancel',now);
    return true;
  }
  function destroyByKey(key){
    const assignment=assignments.get(key);
    if(!assignment)return false;
    cancelAssignment(assignment);
    call(assignment.controller,'destroy');
    assignments.delete(key);
    return true;
  }
  function destroyAssignment(enemyId,channel=null){
    if(channel!==null)return destroyByKey(assignmentKey(enemyId,normalizeChannel(channel)));
    let removed=false;
    for(const [key,assignment] of [...assignments.entries()]){
      if(assignment.enemyId===enemyId){destroyByKey(key);removed=true}
    }
    return removed;
  }
  function cleanupMissingEnemies(){
    for(const [key,assignment] of [...assignments.entries()])if(!ENEMY.getEnemy(assignment.enemyId))destroyByKey(key);
  }
  function cancelAll(now=performance.now()){
    let cancelled=0;
    for(const assignment of assignments.values())if(cancelAssignment(assignment,now))cancelled++;
    return cancelled;
  }
  function registerBehavior(behaviorId,factory,options={}){
    const id=normalizeId(behaviorId);
    if(!id)throw new Error('BattleNetworkEnemyAI: behaviorId is required.');
    if(typeof factory!=='function')throw new Error(`BattleNetworkEnemyAI: factory for ${id} must be a function.`);
    if(registry.has(id))throw new Error(`BattleNetworkEnemyAI: behavior ${id} is already registered.`);
    const channel=normalizeChannel(options?.channel);
    registry.set(id,Object.freeze({factory,channel}));
    return id;
  }
  function assignBehavior(enemyId,behaviorId,config={}){
    const enemy=ENEMY.getEnemy(enemyId);
    const id=normalizeId(behaviorId);
    if(!enemy)return Object.freeze({ok:false,reason:'ENEMY_NOT_FOUND',enemyId,behaviorId:id||null,channel:null});
    const registered=registry.get(id);
    if(!registered)return Object.freeze({ok:false,reason:'BEHAVIOR_NOT_REGISTERED',enemyId,behaviorId:id||null,channel:null});
    const {factory,channel}=registered;
    destroyAssignment(enemyId,channel);
    let controller;
    try{controller=factory(Object.freeze({enemyId,channel,config:Object.freeze({...config})}))}
    catch(error){console.error(`BattleNetworkEnemyAI: failed to create behavior ${id}.`,error);return Object.freeze({ok:false,reason:'BEHAVIOR_CREATE_FAILED',enemyId,behaviorId:id,channel})}
    if(!controller||typeof controller!=='object')return Object.freeze({ok:false,reason:'INVALID_CONTROLLER',enemyId,behaviorId:id,channel});
    assignments.set(assignmentKey(enemyId,channel),{enemyId,behaviorId:id,channel,controller});
    return Object.freeze({ok:true,reason:null,enemyId,behaviorId:id,channel});
  }
  function clearAssignments(){
    cancelAll();
    for(const key of [...assignments.keys()])destroyByKey(key);
    return getSnapshot();
  }
  function pause(reason='MANUAL'){
    const key=normalizeId(reason)||'MANUAL';
    pauseReasons.add(key);
    cancelAll();
    return getSnapshot();
  }
  function resume(reason='MANUAL'){
    const key=normalizeId(reason)||'MANUAL';
    pauseReasons.delete(key);
    return getSnapshot();
  }
  function getSnapshot(){
    const activeEnemyIds=new Set();
    const activeChannels=[];
    for(const assignment of assignments.values()){
      if(!isBusy(assignment))continue;
      activeEnemyIds.add(assignment.enemyId);
      activeChannels.push(Object.freeze({enemyId:assignment.enemyId,channel:assignment.channel,behaviorId:assignment.behaviorId}));
    }
    return Object.freeze({
      schedulerPolicy:'INDEPENDENT_PER_ENEMY_CHANNEL',
      running,
      paused:isSystemPaused(),
      pauseReasons:Object.freeze([...pauseReasons]),
      activeEnemyIds:Object.freeze([...activeEnemyIds]),
      activeChannels:Object.freeze(activeChannels),
      assignments:Object.freeze([...assignments.values()].map(item=>Object.freeze({enemyId:item.enemyId,behaviorId:item.behaviorId,channel:item.channel}))),
      registeredBehaviors:Object.freeze([...registry.entries()].map(([behaviorId,item])=>Object.freeze({behaviorId,channel:item.channel})))
    });
  }
  function updateAssignment(assignment,now,dt){
    const enemy=ENEMY.getEnemy(assignment.enemyId);
    if(!enemy){destroyByKey(assignmentKey(assignment.enemyId,assignment.channel));return}

    // Already-started work owns its channel update cycle. Attack source-death
    // handling remains behavior-specific; movement behavior stops itself on defeat.
    if(isBusy(assignment)){
      call(assignment.controller,'update',now,dt);
      return;
    }

    if(enemy.isDefeated)return;
    if(call(assignment.controller,'canStart',now)!==true)return;
    call(assignment.controller,'start',now);
  }
  function loop(now){
    if(!running)return;
    const dt=Math.min((now-lastFrame)/1000,.05);
    lastFrame=now;
    cleanupMissingEnemies();
    if(isSystemPaused()){
      cancelAll(now);
      requestAnimationFrame(loop);
      return;
    }
    for(const assignment of [...assignments.values()])updateAssignment(assignment,now,dt);
    requestAnimationFrame(loop);
  }
  function stop(){if(!running)return;running=false;cancelAll()}
  function start(){if(running)return;running=true;lastFrame=performance.now();requestAnimationFrame(loop)}

  window.BattleNetworkEnemyAI=Object.freeze({
    registerBehavior,
    assignBehavior,
    detachBehavior:destroyAssignment,
    clearAssignments,
    pause,
    resume,
    getSnapshot,
    start,
    stop
  });
  requestAnimationFrame(loop);
})();
'''
(root/'js/combat/enemy-ai-system.js').write_text(ai, encoding='utf-8')

movement = r'''(()=>{
  const AI=window.BattleNetworkEnemyAI;
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  if(!AI||!FIELD||!ENEMY)throw new Error('BattleNetworkEnemyOscillateMovement: required dependency is missing.');

  const BEHAVIOR_ID='PROTOTYPE_OSCILLATE_MOVEMENT';
  const DEFAULT_CONFIG=Object.freeze({
    testOnly:true,
    distanceTiles:1,
    speedWorld:90,
    directionSign:1
  });

  function positive(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
  function sign(value){return Number(value)<0?-1:1}
  function createController({enemyId,config}){
    const initial=ENEMY.getEnemy(enemyId);
    if(!initial)throw new Error(`BattleNetworkEnemyOscillateMovement: enemy ${enemyId} is missing.`);
    const distanceWorld=FIELD.toWorldDistance(positive(config?.distanceTiles,DEFAULT_CONFIG.distanceTiles));
    const speedWorld=positive(config?.speedWorld,DEFAULT_CONFIG.speedWorld);
    const originX=initial.x,originY=initial.y;
    const minX=Math.max(0,originX-distanceWorld),maxX=Math.min(FIELD.WORLD_SIZE,originX+distanceWorld);
    let direction=sign(config?.directionSign??DEFAULT_CONFIG.directionSign);
    let running=false;

    function canStart(){const enemy=ENEMY.getEnemy(enemyId);return !!enemy&&!enemy.isDefeated&&!running}
    function start(){if(!canStart())return false;running=true;return true}
    function update(_now,dt){
      if(!running)return;
      const enemy=ENEMY.getEnemy(enemyId);
      if(!enemy||enemy.isDefeated){running=false;return}
      let nextX=enemy.x+direction*speedWorld*dt;
      if(nextX>=maxX){nextX=maxX;direction=-1}
      else if(nextX<=minX){nextX=minX;direction=1}
      ENEMY.setPosition(enemyId,nextX,originY);
    }
    function cancel(){running=false}
    function destroy(){running=false}
    function isBusy(){return running}
    function getSnapshot(){return Object.freeze({enemyId,behaviorId:BEHAVIOR_ID,busy:running,originX,originY,minX,maxX,direction,speedWorld,distanceWorld})}
    return Object.freeze({canStart,start,update,cancel,destroy,isBusy,getSnapshot});
  }

  AI.registerBehavior(BEHAVIOR_ID,createController,{channel:'MOVEMENT'});
  window.BattleNetworkEnemyOscillateMovement=Object.freeze({BEHAVIOR_ID,DEFAULT_CONFIG});
})();
'''
(root/'js/combat/enemy-behavior-oscillate-movement.js').write_text(movement, encoding='utf-8')

straight = r'''(()=>{
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
    function renderTelegraphFromCurrentEnemy(){
      if(!telegraph)return;
      const enemy=ENEMY.getEnemy(enemyId);
      if(enemy&&!enemy.isDefeated)telegraph.origin={x:enemy.x,y:enemy.y};
      const end={x:telegraph.origin.x+telegraph.direction.x*telegraph.distance,y:telegraph.origin.y+telegraph.direction.y*telegraph.distance};
      ATTACK_LAYER.showTelegraph(telegraphEl,telegraph.origin,end);
    }
    function start(now){
      if(!canStart(now))return false;
      const enemy=ENEMY.getEnemy(enemyId),playerPos=PLAYER.getPosition();
      if(!enemy)return false;
      const direction=normalize(playerPos.x-enemy.x,playerPos.y-enemy.y);
      telegraph={
        origin:{x:enemy.x,y:enemy.y},
        direction,
        distance:FIELD.toWorldDistance(cfg.telegraphDistanceTiles),
        fireAt:now+cfg.telegraphMs
      };
      renderTelegraphFromCurrentEnemy();
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
    function update(now,dt){
      if(telegraph){renderTelegraphFromCurrentEnemy();if(now>=telegraph.fireAt)fireTelegraph()}
      updateProjectile(dt,now);
    }
    function cancel(now=performance.now()){const busy=!!telegraph||!!projectile;removeTelegraph();removeProjectile();if(busy)scheduleNext(now)}
    function destroy(){removeTelegraph();removeProjectile();ATTACK_LAYER.destroy(telegraphEl);ATTACK_LAYER.destroy(projectileEl)}
    function isBusy(){return !!telegraph||!!projectile}
    function getSnapshot(){return Object.freeze({enemyId,behaviorId:BEHAVIOR_ID,busy:isBusy(),nextAttackAt,config:cfg})}
    return Object.freeze({canStart,start,update,cancel,destroy,isBusy,getSnapshot});
  }

  AI.registerBehavior(BEHAVIOR_ID,createController,{channel:'ATTACK'});
  window.BattleNetworkEnemyStraightShotBehavior=Object.freeze({BEHAVIOR_ID,DEFAULT_CONFIG});
})();
'''
(root/'js/combat/enemy-behavior-straight-shot.js').write_text(straight, encoding='utf-8')

wave = r'''(()=>{
  const FIELD=window.BattleNetworkField;
  const ENEMY=window.BattleNetworkEnemy;
  const AI=window.BattleNetworkEnemyAI;
  const battle=document.getElementById('battle');
  if(!FIELD)throw new Error('BattleNetworkWave: logical field grid is not loaded.');
  if(!ENEMY)throw new Error('BattleNetworkWave: enemy foundation is not loaded.');
  if(!AI)throw new Error('BattleNetworkWave: enemy AI foundation is not loaded.');
  if(!battle)throw new Error('BattleNetworkWave: battle element is not available.');

  // v104 test-only composition/timing/behavior assignment. These are not final enemy or Wave specifications.
  const TEST_CONFIG=Object.freeze({
    testOnly:true,
    enemyMaxHp:200,
    attackBehaviorId:'PROTOTYPE_STRAIGHT_SHOT',
    movementBehaviorId:'PROTOTYPE_OSCILLATE_MOVEMENT',
    movementDistanceTiles:1,
    movementSpeedWorld:90,
    clearNoticeMs:1500,
    startNoticeMs:1500,
    spawnTiles:Object.freeze([
      Object.freeze({rowOffset:0,colOffset:3}),
      Object.freeze({rowOffset:-3,colOffset:3})
    ])
  });
  const listeners=new Set();
  const notice=document.createElement('div');
  notice.className='waveStatusNotice';
  notice.setAttribute('aria-live','polite');
  battle.appendChild(notice);

  let state={waveNumber:0,pendingWaveNumber:1,status:'WAITING_CUSTOM',enemyIds:[]};
  let transitionToken=0;

  function getSnapshot(){
    const enemyState=ENEMY.getBattleState();
    return Object.freeze({waveNumber:state.waveNumber,pendingWaveNumber:state.pendingWaveNumber,status:state.status,enemyIds:Object.freeze(state.enemyIds.slice()),total:enemyState.total,active:enemyState.active,defeated:enemyState.defeated,allDefeated:enemyState.allDefeated});
  }
  function render(){
    notice.dataset.status=state.status;
    if(state.status==='CLEARING'||(state.status==='WAITING_CUSTOM'&&state.waveNumber>0)){notice.textContent='WAVE CLEAR';return}
    if(state.status==='STARTING'){notice.textContent=`WAVE ${state.pendingWaveNumber} START`;return}
    const number=state.status==='ACTIVE'?state.waveNumber:state.pendingWaveNumber;
    notice.textContent=`WAVE ${number}`;
  }
  function emit(){const current=getSnapshot();listeners.forEach(listener=>{try{listener(current)}catch(error){console.error('BattleNetworkWave listener failed.',error)}});return current}
  function subscribe(listener){if(typeof listener!=='function')return()=>{};listeners.add(listener);listener(getSnapshot());return()=>listeners.delete(listener)}
  function getPlayer(){return window.BattleNetworkPlayer||null}
  function scheduleTransition(delayMs,callback){const token=++transitionToken;setTimeout(()=>{if(token===transitionToken)callback()},delayMs)}
  function spawnTestEnemy(tile,index){
    const centerRow=Math.floor(FIELD.GRID_ROWS/2),centerCol=Math.floor(FIELD.GRID_COLS/2);
    const point=FIELD.tileToWorldCenter(centerRow+tile.rowOffset,centerCol+tile.colOffset);
    if(!point)throw new Error('BattleNetworkWave: test spawn tile is outside the field.');
    const enemyId=ENEMY.spawn({x:point.x,y:point.y,health:{maxHp:TEST_CONFIG.enemyMaxHp}});

    const movement=AI.assignBehavior(enemyId,TEST_CONFIG.movementBehaviorId,{
      distanceTiles:TEST_CONFIG.movementDistanceTiles,
      speedWorld:TEST_CONFIG.movementSpeedWorld,
      directionSign:index%2===0?1:-1
    });
    if(!movement.ok)throw new Error(`BattleNetworkWave: failed to assign ${TEST_CONFIG.movementBehaviorId} to enemy ${enemyId}: ${movement.reason}`);

    const attack=AI.assignBehavior(enemyId,TEST_CONFIG.attackBehaviorId);
    if(!attack.ok)throw new Error(`BattleNetworkWave: failed to assign ${TEST_CONFIG.attackBehaviorId} to enemy ${enemyId}: ${attack.reason}`);
    return enemyId;
  }
  function spawnWave(waveNumber){
    const enemyIds=TEST_CONFIG.spawnTiles.map(spawnTestEnemy);
    state={waveNumber,pendingWaveNumber:null,status:'ACTIVE',enemyIds};
    render();const result=emit();
    getPlayer()?.resumeAfterWaveTransition?.();
    AI.resume('WAVE_TRANSITION');
    return result;
  }
  function openNextWaveCustom(){
    if(state.status!=='CLEARING')return getSnapshot();
    state={...state,status:'WAITING_CUSTOM'};render();emit();getPlayer()?.openNextWaveCustom?.();return getSnapshot();
  }
  function onEnemyState(enemyState){
    if(state.status!=='ACTIVE'||!enemyState.allDefeated)return;
    AI.pause('WAVE_TRANSITION');
    getPlayer()?.pauseForWaveTransition?.();
    state={...state,pendingWaveNumber:state.waveNumber+1,status:'CLEARING'};render();emit();scheduleTransition(TEST_CONFIG.clearNoticeMs,openNextWaveCustom);
  }
  function startNextWave(){
    if(state.status!=='WAITING_CUSTOM'||!Number.isFinite(state.pendingWaveNumber))return getSnapshot();
    const nextWaveNumber=state.pendingWaveNumber;
    AI.pause('WAVE_TRANSITION');
    getPlayer()?.pauseForWaveTransition?.();
    AI.clearAssignments();
    ENEMY.clearAll();
    state={waveNumber:state.waveNumber,pendingWaveNumber:nextWaveNumber,status:'STARTING',enemyIds:[]};render();emit();
    scheduleTransition(TEST_CONFIG.startNoticeMs,()=>{if(state.status!=='STARTING'||state.pendingWaveNumber!==nextWaveNumber)return;spawnWave(nextWaveNumber)});
    return getSnapshot();
  }
  function startTestWave(){return startNextWave()}
  function onCustomConfirmed(){return startNextWave()}

  window.BattleNetworkWave=Object.freeze({TEST_CONFIG,getSnapshot,subscribe,startTestWave,startNextWave,onCustomConfirmed});
  AI.pause('WAVE_TRANSITION');
  ENEMY.subscribe(onEnemyState);
  render();
})();
'''
(root/'js/combat/wave-system.js').write_text(wave, encoding='utf-8')

foundation_path=root/'js/combat/enemy-foundation.js'
foundation=foundation_path.read_text(encoding='utf-8')
old="  function getActiveEnemies(){return Object.freeze(enemies.filter(enemy=>!isDefeatedRaw(enemy)).map(getSnapshot))}\n  function clearAll(){"
new="""  function getActiveEnemies(){return Object.freeze(enemies.filter(enemy=>!isDefeatedRaw(enemy)).map(getSnapshot))}
  function setPosition(id,x,y){
    const enemy=getById(id);
    if(!enemy)return Object.freeze({applied:false,reason:'ENEMY_NOT_FOUND',enemy:null});
    const nextX=Number(x),nextY=Number(y);
    if(!Number.isFinite(nextX)||!Number.isFinite(nextY))return Object.freeze({applied:false,reason:'INVALID_POSITION',enemy:getSnapshot(enemy)});
    enemy.x=Math.max(0,Math.min(FIELD.WORLD_SIZE,nextX));
    enemy.y=Math.max(0,Math.min(FIELD.WORLD_SIZE,nextY));
    render(enemy);
    return Object.freeze({applied:true,reason:null,enemy:getSnapshot(enemy)});
  }
  function clearAll(){"""
if old not in foundation: raise SystemExit('enemy foundation insertion point not found')
foundation=foundation.replace(old,new,1)
foundation=foundation.replace("el.style.cssText='position:absolute;border:3px solid #ff5b67;", "el.style.cssText='position:absolute;will-change:transform;border:3px solid #ff5b67;",1)
old_export="window.BattleNetworkEnemy=Object.freeze({spawn,getEnemy,getEnemies,getActiveEnemies,getBattleState,subscribe,clearAll,configureHealth,applyDamage,containsPoint,findEnemyIdAtPoint,intersectsRange,getHitEnemies,debugFlash});"
new_export="window.BattleNetworkEnemy=Object.freeze({spawn,getEnemy,getEnemies,getActiveEnemies,setPosition,getBattleState,subscribe,clearAll,configureHealth,applyDamage,containsPoint,findEnemyIdAtPoint,intersectsRange,getHitEnemies,debugFlash});"
if old_export not in foundation: raise SystemExit('enemy foundation export not found')
foundation=foundation.replace(old_export,new_export,1)
foundation_path.write_text(foundation,encoding='utf-8')

index_path=root/'index.html'
index=index_path.read_text(encoding='utf-8')
old_index='''<script src="./js/combat/enemy-foundation.js?v=103"></script>
<script src="./js/combat/player-health.js?v=90"></script>'''
new_index='''<script src="./js/combat/enemy-foundation.js?v=104"></script>
<script src="./js/combat/player-health.js?v=90"></script>'''
if old_index not in index: raise SystemExit('index enemy foundation version not found')
index=index.replace(old_index,new_index,1)
old_scripts='''<script src="./js/combat/enemy-ai-system.js?v=101"></script>
<script src="./js/combat/enemy-behavior-straight-shot.js?v=102"></script>
<script src="./js/combat/wave-system.js?v=100"></script>'''
new_scripts='''<script src="./js/combat/enemy-ai-system.js?v=104"></script>
<script src="./js/combat/enemy-behavior-straight-shot.js?v=104"></script>
<script src="./js/combat/enemy-behavior-oscillate-movement.js?v=104"></script>
<script src="./js/combat/wave-system.js?v=104"></script>'''
if old_scripts not in index: raise SystemExit('index AI script block not found')
index=index.replace(old_scripts,new_scripts,1)
index_path.write_text(index,encoding='utf-8')

sw_path=root/'sw.js'
sw=sw_path.read_text(encoding='utf-8')
if "const CACHE_NAME = 'battlenetwork-runtime-v103';" not in sw: raise SystemExit('sw v103 cache not found')
sw=sw.replace("const CACHE_NAME = 'battlenetwork-runtime-v103';","const CACHE_NAME = 'battlenetwork-runtime-v104';",1)
needle="  './js/combat/enemy-behavior-straight-shot.js',\n"
if "'./js/combat/enemy-behavior-oscillate-movement.js'" not in sw:
    if needle not in sw: raise SystemExit('sw behavior insertion point not found')
    sw=sw.replace(needle,needle+"  './js/combat/enemy-behavior-oscillate-movement.js',\n",1)
sw_path.write_text(sw,encoding='utf-8')

game_path=root/'GAME_DESIGN.md'
game=game_path.read_text(encoding='utf-8')
marker='''### v101 敵の独立行動ルール

- 敵は原則として個体ごとに独立して行動する。複数敵が存在する場合も、グローバルな順番待ちや『1体の攻撃終了後に次の敵が行動』という制御は基本ルールにしない。
- 各敵は自身のAI／Behavior状態、攻撃クールタイム、移動判断を個別に持ち、他の敵の行動中でも自身の条件を満たせば行動可能とする。
- v101では `BattleNetworkEnemyAI` のスケジューラを `INDEPENDENT_PER_ENEMY` へ変更し、割り当て済みBehaviorを敵ごとに独立更新する。現行の直線射撃Behaviorでも複数敵がそれぞれ独立して予兆・射撃を開始できる。
- 将来の移動Behaviorも同じ原則で個体ごとに独立更新する。具体的な移動方法・攻撃選択・行動頻度は正式な敵仕様を決める段階で確定する。
- 例外として、ボスギミックや敵同士の連携攻撃など『意図的に同期させる』敵を設計する場合のみ、その敵固有仕様として協調制御を追加する。
'''
addition=marker+'''\n### v104 攻撃Behavior／移動Behavior共存検証\n\n- 敵1体に対して攻撃と移動を同一の単一Behaviorへ詰め込まず、少なくとも `ATTACK` と `MOVEMENT` を独立チャンネルとして同時に保持・更新できる構造を検証する。\n- 各チャンネルは敵個体ごとに独立して更新されるため、敵Aの移動・攻撃と敵Bの移動・攻撃は互いの終了待ちを行わない。\n- v104の `PROTOTYPE_OSCILLATE_MOVEMENT` は基盤成立確認専用で、初期位置を中心にworld X方向へ往復する。距離1マス、速度90 world units/sec、往復方法は本番敵の移動仕様として確定しない。\n- 移動中も攻撃チャンネルは独立動作する。直線射撃の照準方向は攻撃開始時に固定したまま、予兆の始点だけは射撃前の敵現在位置へ追従させ、移動した敵から弾が発射される検証表示とする。この扱いも正式敵ごとの攻撃仕様を拘束しない。\n- 敵座標更新は `BattleNetworkEnemy.setPosition()` を通し、表示位置とworld座標／HitBoxを同時に更新する。移動ごとに新規DOMは生成しない。\n- CUSTOM、WAVE CLEAR、WAVE START等の戦闘停止中はATTACK／MOVEMENT両チャンネルを停止し、再開後は各敵が独立して行動を再開する。\n- 将来、複数攻撃の選択、特殊移動、停止して攻撃する敵、連携行動等は敵固有AIで定義する。v104のチャンネル構造や検証移動をそのまま全敵の最終挙動とはしない。\n'''
if marker not in game: raise SystemExit('GAME_DESIGN v101 marker not found')
game=game.replace(marker,addition,1)
game_path.write_text(game,encoding='utf-8')

status_path=root/'DEVELOPMENT_STATUS.md'
status=status_path.read_text(encoding='utf-8')
status_marker='## 次フェーズ: 敵AI 別Behavior検証設計'
if status_marker not in status: raise SystemExit('DEVELOPMENT_STATUS next phase marker not found')
prefix=status.split(status_marker,1)[0]
section='''## 次フェーズ: v104 攻撃／移動Behavior共存 実機確認\n\nv103の敵被ダメージ負荷対策は実機確認済み。v104では正式な敵3種類を決める前の共通基盤検証として、1敵1Behaviorだった `BattleNetworkEnemyAI` を敵ごとのBehaviorチャンネル方式へ拡張した。現在は `ATTACK` と `MOVEMENT` を別チャンネルとして保持し、同じ敵で同時に更新可能とする。スケジューラ表記は `INDEPENDENT_PER_ENEMY_CHANNEL` とし、敵同士だけでなく同一敵の攻撃／移動も別状態で進行できる。\n\n検証用Movementとして `PROTOTYPE_OSCILLATE_MOVEMENT` を追加し、テスト敵2体へ直線射撃と同時割当する。移動は初期位置を中心にworld X方向へ1マス往復、速度90 world units/secとするが、距離・速度・往復方式はすべて検証値であり本番敵仕様ではない。2体は初期移動方向を逆にし、同一タイミングで生成されても個別状態で動いていることを視認しやすくする。\n\n敵共通基盤には `setPosition()` を追加し、移動時はworld座標／HitBox／表示位置を同じ敵データから更新する。移動描画は既存敵DOMのtransform更新のみで、新規DOM生成を繰り返さない。直線射撃は移動との共存確認のため、照準方向は攻撃開始時固定のまま、予兆始点を発射前の敵現在位置へ追従させる。\n\n実機確認では以下を優先する。\n\n1. テスト敵2体がそれぞれ独立して往復移動し、片方の移動・攻撃がもう片方を待たないこと。\n2. 各敵が移動しながら従来の直線射撃を独立して行えること。\n3. 攻撃予兆の始点が移動中の敵から離れず、発射時も現在の敵位置付近から弾が出ること。\n4. 移動中もバスター／チップのHitBox判定とHP減少が成立し、HP0で移動・新規攻撃が止まること。\n5. CUSTOM、WAVE CLEAR、WAVE n START中は攻撃と移動の両方が停止し、次Waveで新しい敵へ両Behaviorが再割当されること。\n6. v102/v103で改善した予兆表示・被ダメージ時の描画負荷が再発していないこと。\n7. v104確認後も往復移動を正式採用とはせず、次に突進／範囲攻撃など別Attack Behaviorを同基盤で確認するか、敵3種類の正式仕様へ進むかを判断する。\n'''
status_path.write_text(prefix+section,encoding='utf-8')
