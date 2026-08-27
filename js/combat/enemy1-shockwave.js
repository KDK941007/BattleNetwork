(()=>{
  const AI=window.BattleNetworkEnemyAI,FIELD=window.BattleNetworkField,ENEMY=window.BattleNetworkEnemy,PLAYER=window.BattleNetworkPlayer,PLAYER_DAMAGE=window.BattleNetworkPlayerDamage,LAYER=window.BattleNetworkEnemyAttackLayer,RUNTIME=window.BattleNetworkEnemy1Runtime;
  if(!AI||!FIELD||!ENEMY||!PLAYER||!PLAYER_DAMAGE||!LAYER||!RUNTIME)throw new Error('BattleNetworkEnemy1Shockwave: required dependency is missing.');
  const BEHAVIOR_ID='ENEMY1_GROUND_SHOCKWAVE',DAMAGE=10;
  const style=document.createElement('style');
  style.dataset.testOnly='enemy1-telegraph-glow';
  style.textContent=`
    .enemyPrototype.enemy1TelegraphTest{outline:4px solid rgba(255,214,82,.98);box-shadow:0 0 0 4px rgba(255,214,82,.24),0 0 28px rgba(255,200,48,.95)!important;}
    .enemyPrototype.enemy1FullSyncTest{outline:5px solid rgba(104,255,255,1);box-shadow:0 0 0 5px rgba(104,255,255,.30),0 0 38px rgba(86,235,255,1)!important;}
  `;
  document.head.appendChild(style);
  function unit(dx,dy){const l=Math.hypot(dx,dy)||1;return{x:dx/l,y:dy/l}}
  function findEnemyElement(enemyId){const enemies=ENEMY.getEnemies(),index=enemies.findIndex(enemy=>enemy.id===enemyId);return index>=0?document.querySelectorAll('.enemyPrototype')[index]||null:null}
  function setGlow(enemyId,mode){const el=findEnemyElement(enemyId);if(!el)return;const debug=RUNTIME.getDebugState();const visible=debug.enabled&&debug.showAttackGlow;el.classList.toggle('enemy1TelegraphTest',visible&&mode==='TELEGRAPH');el.classList.toggle('enemy1FullSyncTest',visible&&mode==='FULL_SYNC')}
  function createController({enemyId}){
    const telegraphEl=LAYER.createTelegraph(),projectileEl=LAYER.createProjectile();
    let phase='IDLE',direction=null,projectile=null,fireAt=0,fullSyncAt=0,recoveryUntil=0,nextAttackAt=performance.now();
    function hide(){LAYER.hideTelegraph(telegraphEl);LAYER.hideProjectile(projectileEl);setGlow(enemyId,'NONE')}
    function cfg(){return RUNTIME.getPattern()}
    function inRange(enemy,player){return Math.hypot(player.x-enemy.x,player.y-enemy.y)<=FIELD.toWorldDistance(cfg().maxRangeTiles)}
    function canStart(now){const enemy=ENEMY.getEnemy(enemyId);if(!enemy||enemy.isDefeated||phase!=='IDLE'||now<nextAttackAt||!RUNTIME.getPerception(enemyId))return false;return inRange(enemy,PLAYER.getPosition())}
    function start(now){if(!canStart(now))return false;const enemy=ENEMY.getEnemy(enemyId),player=PLAYER.getPosition(),c=cfg();direction=unit(player.x-enemy.x,player.y-enemy.y);phase='TELEGRAPH';fireAt=now+c.telegraphMs;fullSyncAt=Math.max(now,fireAt-c.fullSyncWindowMs);RUNTIME.setAttackLocked(enemyId,true);const end={x:enemy.x+direction.x*FIELD.toWorldDistance(c.maxRangeTiles),y:enemy.y+direction.y*FIELD.toWorldDistance(c.maxRangeTiles)};LAYER.showTelegraph(telegraphEl,{x:enemy.x,y:enemy.y},end);setGlow(enemyId,'TELEGRAPH');return true}
    function fire(now){const enemy=ENEMY.getEnemy(enemyId);if(!enemy){cancel(now);return}LAYER.hideTelegraph(telegraphEl);setGlow(enemyId,'NONE');projectile={x:enemy.x,y:enemy.y,travel:0,maxTravel:FIELD.toWorldDistance(cfg().maxRangeTiles)};phase='PROJECTILE';LAYER.showProjectile(projectileEl,projectile.x,projectile.y)}
    function beginRecovery(now){LAYER.hideProjectile(projectileEl);projectile=null;phase='RECOVERY';recoveryUntil=now+cfg().recoveryMs}
    function finishRecovery(now){phase='IDLE';direction=null;RUNTIME.setAttackLocked(enemyId,false);nextAttackAt=now+cfg().cooldownMs}
    function update(now,dt){if(phase==='TELEGRAPH'){const enemy=ENEMY.getEnemy(enemyId);if(!enemy||enemy.isDefeated){cancel(now);return}const end={x:enemy.x+direction.x*FIELD.toWorldDistance(cfg().maxRangeTiles),y:enemy.y+direction.y*FIELD.toWorldDistance(cfg().maxRangeTiles)};LAYER.showTelegraph(telegraphEl,{x:enemy.x,y:enemy.y},end);setGlow(enemyId,now>=fullSyncAt?'FULL_SYNC':'TELEGRAPH');if(now>=fireAt)fire(now);return}if(phase==='PROJECTILE'){const step=cfg().projectileSpeed*dt;projectile.x+=direction.x*step;projectile.y+=direction.y*step;projectile.travel+=step;LAYER.updateProjectile(projectileEl,projectile.x,projectile.y);const hit=PLAYER_DAMAGE.resolvePointHit({x:projectile.x,y:projectile.y,damage:DAMAGE,sourceType:'ENEMY',sourceId:enemyId,attackId:BEHAVIOR_ID});const out=projectile.x<0||projectile.x>FIELD.WORLD_SIZE||projectile.y<0||projectile.y>FIELD.WORLD_SIZE;if(hit.hit||out||projectile.travel>=projectile.maxTravel)beginRecovery(now);return}if(phase==='RECOVERY'&&now>=recoveryUntil)finishRecovery(now)}
    function cancel(now=performance.now()){const wasBusy=phase!=='IDLE';hide();phase='IDLE';direction=null;projectile=null;RUNTIME.setAttackLocked(enemyId,false);if(wasBusy)nextAttackAt=now+cfg().cooldownMs}
    function destroy(){cancel();LAYER.destroy(telegraphEl);LAYER.destroy(projectileEl)}
    function isBusy(){return phase!=='IDLE'}
    function getSnapshot(){return Object.freeze({enemyId,behaviorId:BEHAVIOR_ID,phase,fullSyncActive:phase==='TELEGRAPH'&&performance.now()>=fullSyncAt,fullSyncAt,fireAt,nextAttackAt,pattern:cfg()})}
    return Object.freeze({canStart,start,update,cancel,destroy,isBusy,getSnapshot});
  }
  AI.registerBehavior(BEHAVIOR_ID,createController,{channel:'ATTACK'});
  window.BattleNetworkEnemy1Shockwave=Object.freeze({BEHAVIOR_ID,DAMAGE});
})();
