(()=>{
  const AI=window.BattleNetworkEnemyAI,FIELD=window.BattleNetworkField,ENEMY=window.BattleNetworkEnemy,PLAYER=window.BattleNetworkPlayer,RUNTIME=window.BattleNetworkEnemy1Runtime;
  if(!AI||!FIELD||!ENEMY||!PLAYER||!RUNTIME)throw new Error('BattleNetworkEnemy1Movement: required dependency is missing.');
  const BEHAVIOR_ID='ENEMY1_MOVEMENT';
  const START=FIELD.toWorldDistance(5),RELEASE=FIELD.toWorldDistance(6),EDGE=FIELD.TILE_SIZE*.7;
  function random(a,b){return a+Math.random()*(b-a)}
  function unit(dx,dy){const l=Math.hypot(dx,dy)||1;return{x:dx/l,y:dy/l}}
  function createController({enemyId}){
    let active=false,target=null,waitUntil=0;
    function chooseWander(enemy){const angle=Math.random()*Math.PI*2,distance=FIELD.toWorldDistance(random(1,2));target={x:Math.max(EDGE,Math.min(FIELD.WORLD_SIZE-EDGE,enemy.x+Math.cos(angle)*distance)),y:Math.max(EDGE,Math.min(FIELD.WORLD_SIZE-EDGE,enemy.y+Math.sin(angle)*distance))}}
    function updatePerception(enemy,player){const d=Math.hypot(player.x-enemy.x,player.y-enemy.y),aware=RUNTIME.getPerception(enemyId);if(!aware&&d<=START)RUNTIME.setPerception(enemyId,true);else if(aware&&d>RELEASE){RUNTIME.setPerception(enemyId,false);target=null;waitUntil=performance.now()+random(800,1500)}return RUNTIME.getPerception(enemyId)}
    function shouldChase(enemy,player){const policy=RUNTIME.getEnemyConfig().chasePolicy;if(policy===RUNTIME.CHASE_POLICY.ALWAYS_WHILE_AWARE)return true;if(policy===RUNTIME.CHASE_POLICY.STOP_IN_ATTACK_RANGE){const attackRange=FIELD.toWorldDistance(RUNTIME.getPattern().maxRangeTiles);return Math.hypot(player.x-enemy.x,player.y-enemy.y)>attackRange}return false}
    function canStart(){const e=ENEMY.getEnemy(enemyId);return !!e&&!e.isDefeated}
    function start(){active=true;return true}
    function update(now,dt){const enemy=ENEMY.getEnemy(enemyId);if(!enemy||enemy.isDefeated){active=false;return}const player=PLAYER.getPosition(),aware=updatePerception(enemy,player);if(RUNTIME.isAttackLocked(enemyId))return;const speed=RUNTIME.getPattern().moveSpeedWorld;if(aware){target=null;if(!shouldChase(enemy,player))return;const d=unit(player.x-enemy.x,player.y-enemy.y);ENEMY.setPosition(enemyId,enemy.x+d.x*speed*dt,enemy.y+d.y*speed*dt);return}if(now<waitUntil)return;if(!target)chooseWander(enemy);const dx=target.x-enemy.x,dy=target.y-enemy.y,remain=Math.hypot(dx,dy);if(remain<=Math.max(3,speed*dt)){ENEMY.setPosition(enemyId,target.x,target.y);target=null;waitUntil=now+random(800,1500);return}const d=unit(dx,dy);ENEMY.setPosition(enemyId,enemy.x+d.x*speed*dt,enemy.y+d.y*speed*dt)}
    function cancel(){active=false;target=null}
    function destroy(){cancel();RUNTIME.clearEnemy(enemyId)}
    function isBusy(){return active}
    return Object.freeze({canStart,start,update,cancel,destroy,isBusy,getSnapshot:()=>Object.freeze({enemyId,behaviorId:BEHAVIOR_ID,aware:RUNTIME.getPerception(enemyId),chasePolicy:RUNTIME.getEnemyConfig().chasePolicy,busy:active})});
  }
  AI.registerBehavior(BEHAVIOR_ID,createController,{channel:'MOVEMENT'});
  window.BattleNetworkEnemy1Movement=Object.freeze({BEHAVIOR_ID});
})();
