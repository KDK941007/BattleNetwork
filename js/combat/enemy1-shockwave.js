(()=>{
  const AI=window.BattleNetworkEnemyAI,FIELD=window.BattleNetworkField,ENEMY=window.BattleNetworkEnemy,PLAYER=window.BattleNetworkPlayer,PLAYER_DAMAGE=window.BattleNetworkPlayerDamage,LAYER=window.BattleNetworkEnemyAttackLayer,RUNTIME=window.BattleNetworkEnemy1Runtime;
  if(!AI||!FIELD||!ENEMY||!PLAYER||!PLAYER_DAMAGE||!LAYER||!RUNTIME)throw new Error('BattleNetworkEnemy1Shockwave: required dependency is missing.');
  const BEHAVIOR_ID='ENEMY1_GROUND_SHOCKWAVE',DAMAGE=RUNTIME.getAttackDefaults().damage;
  const TEST_STATUS_MS=Number(PLAYER.HIT_STUN_MS)||300;
  const style=document.createElement('style');
  style.dataset.testOnly='enemy1-telegraph-glow';
  style.textContent=`
    .enemyPrototype.enemy1TelegraphTest{outline:3px solid rgba(255,214,82,.98);outline-offset:2px;}
    .enemyPrototype.enemy1FullSyncTest{outline:4px solid rgba(104,255,255,1);outline-offset:2px;}
  `;
  document.head.appendChild(style);
  function unit(dx,dy){const l=Math.hypot(dx,dy)||1;return{x:dx/l,y:dy/l}}
  function distanceToFirstHole(origin,direction,maxTravel){
    const limit=Math.max(0,Number(maxTravel)||0);
    if(limit<=0)return Infinity;
    const start=FIELD.worldToTile(origin.x,origin.y);
    const startTile=FIELD.getTile(start.row,start.col);
    if(startTile?.currentTerrain===FIELD.TERRAIN.HOLE)return 0;
    let row=start.row,col=start.col;
    const dx=direction.x,dy=direction.y,size=FIELD.TILE_SIZE;
    const stepX=dx>0?1:dx<0?-1:0,stepY=dy>0?1:dy<0?-1:0;
    let tMaxX=Infinity,tMaxY=Infinity,tDeltaX=Infinity,tDeltaY=Infinity;
    if(stepX!==0){
      const boundaryX=(stepX>0?col+1:col)*size;
      tMaxX=(boundaryX-origin.x)/dx;
      tDeltaX=size/Math.abs(dx)
    }
    if(stepY!==0){
      const boundaryY=(stepY>0?row+1:row)*size;
      tMaxY=(boundaryY-origin.y)/dy;
      tDeltaY=size/Math.abs(dy)
    }
    while(true){
      let distance;
      if(tMaxX<tMaxY){distance=tMaxX;col+=stepX;tMaxX+=tDeltaX}
      else if(tMaxY<tMaxX){distance=tMaxY;row+=stepY;tMaxY+=tDeltaY}
      else{distance=tMaxX;col+=stepX;row+=stepY;tMaxX+=tDeltaX;tMaxY+=tDeltaY}
      if(!Number.isFinite(distance)||distance>limit)return Infinity;
      const tile=FIELD.getTile(row,col);
      if(!tile)return Infinity;
      if(tile.currentTerrain===FIELD.TERRAIN.HOLE)return Math.max(0,distance)
    }
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