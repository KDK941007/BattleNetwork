(()=>{
  const AI=window.BattleNetworkEnemyAI,FIELD=window.BattleNetworkField,ENEMY=window.BattleNetworkEnemy,PLAYER=window.BattleNetworkPlayer,PLAYER_DAMAGE=window.BattleNetworkPlayerDamage,LAYER=window.BattleNetworkEnemyAttackLayer,RUNTIME=window.BattleNetworkEnemy1Runtime;
  if(!AI||!FIELD||!ENEMY||!PLAYER||!PLAYER_DAMAGE||!LAYER||!RUNTIME)throw new Error('BattleNetworkEnemy1Shockwave: required dependency is missing.');
  const BEHAVIOR_ID='ENEMY1_GROUND_SHOCKWAVE',DAMAGE=RUNTIME.getAttackDefaults().damage;
  const TEST_STATUS_MS=Number(PLAYER.HIT_STUN_MS)||300;
  // enemy-attack-layer renders this projectile as 28x14px with a 2px border
  // under the same .72/.36 isometric projection. Convert that visible footprint
  // back to world-space so a ground shockwave stops before any visible part crosses a hole.
  const PROJECTILE_GROUND_RADIUS_WORLD=Math.max(
    (14+2)/(Math.SQRT2*.72),
    (7+2)/(Math.SQRT2*.36)
  );
  const style=document.createElement('style');
  style.dataset.testOnly='enemy1-telegraph-glow';
  style.textContent=`
    .enemyPrototype.enemy1TelegraphTest{outline:3px solid rgba(255,214,82,.98);outline-offset:2px;}
    .enemyPrototype.enemy1FullSyncTest{outline:4px solid rgba(104,255,255,1);outline-offset:2px;}
  `;
  document.head.appendChild(style);
  function unit(dx,dy){const l=Math.hypot(dx,dy)||1;return{x:dx/l,y:dy/l}}
  function rayRectEntryDistance(origin,direction,limit,bounds,padding=0){
    const EPS=1e-9;
    let enter=0,exit=limit;
    const axes=[
      [origin.x,direction.x,bounds.left-padding,bounds.right+padding],
      [origin.y,direction.y,bounds.top-padding,bounds.bottom+padding]
    ];
    for(const [o,d,min,max] of axes){
      if(Math.abs(d)<=EPS){
        if(o<min||o>max)return Infinity;
        continue;
      }
      let a=(min-o)/d,b=(max-o)/d;
      if(a>b){const t=a;a=b;b=t}
      enter=Math.max(enter,a);
      exit=Math.min(exit,b);
      if(enter>exit)return Infinity;
    }
    if(exit<0||enter>limit)return Infinity;
    return Math.max(0,enter)
  }
  function distanceToFirstHole(origin,direction,maxTravel){
    const limit=Math.max(0,Number(maxTravel)||0);
    if(limit<=0)return Infinity;
    const radius=PROJECTILE_GROUND_RADIUS_WORLD,size=FIELD.TILE_SIZE;
    const endX=origin.x+direction.x*limit,endY=origin.y+direction.y*limit;
    const minCol=Math.max(0,Math.floor((Math.min(origin.x,endX)-radius)/size));
    const maxCol=Math.min(FIELD.GRID_COLS-1,Math.floor((Math.max(origin.x,endX)+radius)/size));
    const minRow=Math.max(0,Math.floor((Math.min(origin.y,endY)-radius)/size));
    const maxRow=Math.min(FIELD.GRID_ROWS-1,Math.floor((Math.max(origin.y,endY)+radius)/size));
    let nearest=Infinity;
    for(let row=minRow;row<=maxRow;row++)for(let col=minCol;col<=maxCol;col++){
      const tile=FIELD.getTile(row,col);
      if(tile?.currentTerrain!==FIELD.TERRAIN.HOLE)continue;
      const bounds=FIELD.tileToWorldBounds(row,col);
      const distance=rayRectEntryDistance(origin,direction,Math.min(limit,nearest),bounds,radius);
      if(distance<nearest)nearest=distance;
    }
    return nearest
  }
  function findEnemyElement(enemyId){const enemies=ENEMY.getEnemies(),index=enemies.findIndex(enemy=>enemy.id===enemyId);return index>=0?document.querySelectorAll('.enemyPrototype')[index]||null:null}
  function createController({enemyId}){
    const telegraphEl=LAYER.createTelegraph(),projectileEl=LAYER.createProjectile(),enemyEl=findEnemyElement(enemyId);
    let phase='IDLE',direction=null,projectile=null,fireAt=0,fullSyncAt=0,recoveryUntil=0,lastGlowMode='NONE',statusHitCount=0,telegraphX=null,telegraphY=null;
    function nextStatusMode(){return 'FLINCH'}
    function testStatusInput(){return{hitStunMs:TEST_STATUS_MS,paralysisMs:0}}
    function setGlow(mode){
      if(!enemyEl)return;
      const debug=RUNTIME.getDebugState();
      const fullSynchroActive=window.BattleNetworkPlayerHud?.getKokoroState?.()==='FULL_SYNCHRO';
      const next=!debug.showAttackGlow?'NONE':mode==='FULL_SYNC'&&fullSynchroActive?'FULL_SYNC':mode;
      if(next===lastGlowMode)return;
      enemyEl.classList.toggle('enemy1TelegraphTest',next==='TELEGRAPH');
      enemyEl.classList.toggle('enemy1FullSyncTest',next==='FULL_SYNC');
      lastGlowMode=next;
    }
    function hide(){LAYER.hideTelegraph(telegraphEl);LAYER.hideProjectile(projectileEl);telegraphX=null;telegraphY=null;setGlow('NONE')}
    function cfg(){return RUNTIME.getPattern()}
    function inRange(enemy,player){return Math.hypot(player.x-enemy.x,player.y-enemy.y)<=FIELD.toWorldDistance(cfg().attackStartRangeTiles)}
    function canStart(now){const enemy=ENEMY.getEnemy(enemyId);if(!enemy||enemy.isDefeated||phase!=='IDLE'||!RUNTIME.isAttackReady(enemyId,now)||!inRange(enemy,PLAYER.getPosition()))return false;return RUNTIME.chooseNextAction(enemyId,now)===RUNTIME.ACTION.ATTACK}
    function updateTelegraphPosition(enemy){
      if(!enemy||!direction)return;
      const origin={x:enemy.x,y:enemy.y},fullTravel=FIELD.toWorldDistance(cfg().projectileMaxRangeTiles),holeDistance=distanceToFirstHole(origin,direction,fullTravel),maxTravel=Math.min(fullTravel,holeDistance);
      const end={x:origin.x+direction.x*maxTravel,y:origin.y+direction.y*maxTravel};
      LAYER.showTelegraph(telegraphEl,origin,end);
      telegraphX=enemy.x;telegraphY=enemy.y;
    }
    function start(now){if(!canStart(now))return false;const enemy=ENEMY.getEnemy(enemyId),player=PLAYER.getPosition(),c=cfg();RUNTIME.clearActionChoice(enemyId,RUNTIME.ACTION.ATTACK);direction=unit(player.x-enemy.x,player.y-enemy.y);phase='TELEGRAPH';fireAt=now+c.telegraphMs;fullSyncAt=Math.max(now,fireAt-c.fullSyncWindowMs);RUNTIME.setAttackLocked(enemyId,true);updateTelegraphPosition(enemy);setGlow('TELEGRAPH');return true}
    function fire(now){const enemy=ENEMY.getEnemy(enemyId);if(!enemy){cancel(now);return}LAYER.hideTelegraph(telegraphEl);telegraphX=null;telegraphY=null;setGlow('NONE');const origin={x:enemy.x,y:enemy.y},maxTravel=FIELD.toWorldDistance(cfg().projectileMaxRangeTiles);projectile={x:origin.x,y:origin.y,travel:0,maxTravel};phase='PROJECTILE';LAYER.showProjectile(projectileEl,projectile.x,projectile.y)}
    function beginRecovery(now){LAYER.hideProjectile(projectileEl);projectile=null;phase='RECOVERY';recoveryUntil=now+cfg().recoveryMs}
    function finishRecovery(now){phase='IDLE';direction=null;RUNTIME.setAttackLocked(enemyId,false);RUNTIME.setNextAttackAt(enemyId,now+cfg().cooldownMs)}
    function update(now,dt){if(phase==='TELEGRAPH'){const enemy=ENEMY.getEnemy(enemyId);if(!enemy||enemy.isDefeated){cancel(now);return}updateTelegraphPosition(enemy);setGlow(now>=fullSyncAt?'FULL_SYNC':'TELEGRAPH');if(now>=fireAt)fire(now);return}if(phase==='PROJECTILE'){const remaining=Math.max(0,projectile.maxTravel-projectile.travel),requestedStep=Math.min(cfg().projectileSpeed*dt,remaining),holeDistance=distanceToFirstHole({x:projectile.x,y:projectile.y},direction,requestedStep),blockedByHole=Number.isFinite(holeDistance)&&holeDistance<=requestedStep,step=Math.min(requestedStep,holeDistance);projectile.x+=direction.x*step;projectile.y+=direction.y*step;projectile.travel+=step;LAYER.updateProjectile(projectileEl,projectile.x,projectile.y);const reachedRange=projectile.travel>=projectile.maxTravel-1e-6;const mode=nextStatusMode(),status=testStatusInput(),hit=PLAYER_DAMAGE.resolvePointHit({x:projectile.x,y:projectile.y,damage:DAMAGE,sourceType:'ENEMY',sourceId:enemyId,attackId:BEHAVIOR_ID,...status});if(hit.hit){statusHitCount++;window.dispatchEvent(new CustomEvent('battlenetwork:angerstatustest',{detail:Object.freeze({mode,durationMs:TEST_STATUS_MS,enemyId})}))}const out=projectile.x<0||projectile.x>FIELD.WORLD_SIZE||projectile.y<0||projectile.y>FIELD.WORLD_SIZE;if(hit.hit||out||blockedByHole||reachedRange)beginRecovery(now);return}if(phase==='RECOVERY'&&now>=recoveryUntil)finishRecovery(now)}
    function cancel(now=performance.now()){const wasBusy=phase!=='IDLE';hide();phase='IDLE';direction=null;projectile=null;RUNTIME.setAttackLocked(enemyId,false);if(wasBusy)RUNTIME.setNextAttackAt(enemyId,now+cfg().cooldownMs)}
    function destroy(){cancel();LAYER.destroy(telegraphEl);LAYER.destroy(projectileEl)}
    function isBusy(){return phase!=='IDLE'}
    function getSnapshot(){return Object.freeze({enemyId,behaviorId:BEHAVIOR_ID,phase,fullSyncActive:phase==='TELEGRAPH'&&performance.now()>=fullSyncAt,fullSyncAt,fireAt,nextAttackAt:RUNTIME.getNextAttackAt(enemyId),nextStatusTest:nextStatusMode(),pattern:cfg()})}
    return Object.freeze({canStart,start,update,cancel,destroy,isBusy,getSnapshot});
  }
  AI.registerBehavior(BEHAVIOR_ID,createController,{channel:'ATTACK'});
  window.BattleNetworkEnemy1Shockwave=Object.freeze({BEHAVIOR_ID,DAMAGE,TEST_STATUS_MS});
})();